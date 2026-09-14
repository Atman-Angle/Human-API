import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  AGENT_ACTION,
  ConversationDraftRequestSchema,
  ChatRouteRequestSchema,
  ParticipationRequestSchema,
  ActivityEventsResponseSchema,
  ConfirmObservationRequestSchema,
  MISSION_STATUS,
  CreateInvestigationRequestSchema,
  CreateMissionRequestSchema,
  EvidenceSubmissionSchema,
  GAP_SUITABILITY_STATUS,
  type AgentAction,
  type Investigation,
  MaintenanceRunSchema,
} from "@human-api/contracts";
import {
  buildInitialAgentActions,
  createEvidenceMission,
  createInitialKnowledgeState,
  evaluateSearchEvidence,
  evaluateGapSuitability,
} from "@human-api/agent";

import { extractConfirmedObservation, prepareConversation } from "./conversation.js";
import { HttpError, toHttpError } from "./errors.js";
import { projectKnowledgeObject, projectDiscoveryTopic } from "./community-projection.js";
import { submitMissionEvidence } from "./evidence-intake.js";
import { closeMission } from "./mission-lifecycle.js";
import type { InvestigationRepository } from "./repository.js";
import type { SearchService } from "./search-service.js";
import type {
  HotListResponse,
  ZhihuCreatedContentsResponse,
  ZhihuFolloweesResponse,
  AuthSession,
  ZhihuUser,
} from "@human-api/contracts";
import { DiscussionInputSchema } from "@human-api/contracts";
import type { DiscussionOrganizer } from "./llm/discussion-organizer.js";
import { buildAuthorizeUrl, exchangeCodeForToken, getUserInfo, type ZhihuUserResponse } from "./adapters/zhihu-oauth.js";
import type { OfficialUserAdapter } from "./adapters/zhihu-user.js";


export interface AppDependencies {
  repository: InvestigationRepository;
  searchService: SearchService;
  hotList?: { list(limit?: number): Promise<HotListResponse> };
  community?: {
    ringDetail(id: string): Promise<unknown>;
    publishPin(input: Record<string, unknown>): Promise<unknown>;
    listComments(token: string, type?: "pin" | "comment"): Promise<unknown>;
    createComment(input: Record<string, unknown>): Promise<unknown>;
  };
  oauth?: { appId: string; appKey: string; redirectUri: string };
  oauthStateStore?: {
    create(redirectUri: string): string;
    consume(state: string): string | null;
    consumeLatest?(): string | null;
  };
  authSessionStore?: {
    create(user: ZhihuUser, accessToken: string): string;
    get(sessionId: string): AuthSession | null;
    delete(sessionId: string): void;
    getAccessToken?(sessionId: string): string | null;
  };
  userApi?: {
    listFollowees(oauthToken: string, offset?: string, limit?: number): Promise<ZhihuFolloweesResponse>;
    listContents(oauthToken: string, offset?: string, limit?: number): Promise<ZhihuCreatedContentsResponse>;
  };
  discussionOrganizer?: DiscussionOrganizer;
  clock?: () => Date;
  idFactory?: () => string;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new HttpError(413, "VALIDATION_ERROR", "Request body is too large.");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  requestId: string,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  response.end(`${JSON.stringify(body, null, 2)}`);
}

function parseOrThrow<T>(
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: T } | { success: false; error: { message: string } };
  },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", result.error.message);
  }
  return result.data;
}

function parseSessionCookie(request: IncomingMessage): string | null {
  const cookie = request.headers.cookie || "";
  for (const part of cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("zhihu_session=")) {
      return decodeURIComponent(trimmed.slice("zhihu_session=".length));
    }
  }
  return null;
}

function setSessionCookie(response: ServerResponse, sessionId: string): void {
  response.setHeader("Set-Cookie", `zhihu_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
}

function clearSessionCookie(response: ServerResponse): void {
  response.setHeader("Set-Cookie", "zhihu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function appendAction(actions: AgentAction[], action: AgentAction): void {
  if (!actions.includes(action)) actions.push(action);
}

export function createRequestHandler(dependencies: AppDependencies) {
  const clock = dependencies.clock ?? (() => new Date());

  const idFactory = dependencies.idFactory ?? randomUUID;
  let preparingDemo: Promise<Investigation> | undefined;
  async function prepareInvestigation(question: string): Promise<Investigation> {
    const [zhihu, global] = await Promise.all([
      dependencies.searchService.searchZhihu(question),
      dependencies.searchService.searchGlobal(question),
    ]);
    const evidenceState = evaluateSearchEvidence({ question, zhihu, global });
    const now = clock().toISOString();
    const investigation: Investigation = {
      id: idFactory(),
      question,
      searches: { zhihu, global },
      evidenceState,
      actions: buildInitialAgentActions(evidenceState),
      missions: [],
      evidence: [],
      discussions: [],
      discussionOrganizations: [],
      llmRuns: [],
      knowledgeState: createInitialKnowledgeState(evidenceState, now),
      createdAt: now,
      updatedAt: now,
    };
    // --- LLM-powered per-source summary (backfill llmSummary) ---
    if (dependencies.discussionOrganizer) {
      try {
        const allSources = [
          ...zhihu.items,
          ...global.items,
        ];
        const { summaries } = await dependencies.discussionOrganizer.summarizeSources(question, allSources);
        for (const src of allSources) {
          if (summaries[src.id]) {
            src.llmSummary = summaries[src.id];
          }
        }
      } catch (error) {
        console.error(
          "[prepareInvestigation] LLM source summarization failed:",
          error instanceof Error ? error.message : String(error),
        );
        // Non-fatal; sources will show raw excerpts as fallback
      }
    }

    // --- LLM-powered synthesized report ---
    if (dependencies.discussionOrganizer) {
      try {
        const allSources = [
          ...zhihu.items,
          ...global.items,
        ];
        const { report } = await dependencies.discussionOrganizer.synthesizeReport(question, allSources);
        investigation.synthesizedReport = report;
      } catch (error) {
        console.error(
          "[prepareInvestigation] LLM report synthesis failed:",
          error instanceof Error ? error.message : String(error),
        );
        // Non-fatal; sources will show without synthesized report as fallback
      }
    }
    dependencies.repository.save(investigation);
    return investigation;
  }

  return async function requestHandler(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const requestId = randomUUID();
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {}, requestId);
      return;
    }

    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const path = url.pathname;

      if (request.method === "GET" && path === "/health") {
        sendJson(response, 200, { status: "ok" }, requestId);
        return;
      }

      if (request.method === "POST" && path === "/api/demo/prepare") {
        const question = "AI Coding 实际改变了初级开发者哪些工作？";
        let investigation = dependencies.repository
          .listInvestigations()
          .find((item) => item.question === question);
        if (!investigation) {
          preparingDemo ??= prepareInvestigation(question).finally(() => {
            preparingDemo = undefined;
          });
          investigation = await preparingDemo;
        }
        const gap = investigation.evidenceState.nextGap;
        if (gap && !investigation.missions.some((item) => item.evidenceGapId === gap.id)) {
          investigation.missions.push(
            createEvidenceMission({ investigationId: investigation.id, question, gap }),
          );
          appendAction(investigation.actions, AGENT_ACTION.CREATE_MISSION);
          dependencies.repository.save(investigation);
        }
        sendJson(response, 200, investigation, requestId);
        return;
      }

      // POST /api/demo/reset
      if (request.method === "POST" && path === "/api/demo/reset") {
        dependencies.repository.reset();
        sendJson(response, 200, { ok: true }, requestId);
        return;
      }
      const conversationMatch = /^\/api\/missions\/([^/]+)\/conversation(\/confirm)?$/.exec(path);
      if (request.method === "POST" && conversationMatch?.[1]) {
        const lookup = dependencies.repository.findMission(
          decodeURIComponent(conversationMatch[1]),
        );
        if (!lookup) throw new HttpError(404, "NOT_FOUND", "这份邀请不存在，请返回发现页。");
        if (lookup.mission.status !== MISSION_STATUS.OPEN)
          throw new HttpError(409, "VALIDATION_ERROR", "这份邀请已关闭，仍可查看历史贡献。");
        const body = await readJson(request);
        if (conversationMatch[2]) {
          const input = parseOrThrow(ConfirmObservationRequestSchema, body);
          const result = submitMissionEvidence({
            ...lookup,
            submission: extractConfirmedObservation(input.summary, input.demoSample),
            clock,
            idFactory,
          });
          dependencies.repository.save(result.investigation);
          sendJson(response, 201, result, requestId);
        } else {
          const input = parseOrThrow(ConversationDraftRequestSchema, body);
          sendJson(response, 200, prepareConversation(lookup.mission, input.answers), requestId);
        }
        return;
      }

      if (request.method === "POST" && path === "/api/chat/route") {
        const input = parseOrThrow(ChatRouteRequestSchema, await readJson(request));
        const normalize = (value: string) =>
          value
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
        const tokens = (value: string) =>
          new Set(
            normalize(value)
              .split(/\s+/)
              .filter((token) => token.length > 1),
          );
        const queryTokens = tokens(input.message);
        const matched = dependencies.repository
          .listInvestigations()
          .map((item) => {
            const itemTokens = tokens(item.question);
            const intersection = [...queryTokens].filter((token) => itemTokens.has(token)).length;
            const union = new Set([...queryTokens, ...itemTokens]).size;
            return { item, score: union ? intersection / union : 0 };
          })
          .sort((a, b) => b.score - a.score)[0];
        const exact = matched?.score === 1 ? matched.item : undefined;
        const similar = matched && matched.score >= 0.35 ? matched.item : undefined;
        if (exact || similar) {
          sendJson(
            response,
            200,
            {
              kind: "MATCHED_INVESTIGATION",
              investigationId: (exact ?? similar)!.id,
              rationale: exact
                ? "已有相同调查主题。"
                : "发现词汇重叠的相似调查主题，建议先进入已有 Investigation。",
            },
            requestId,
          );
          return;
        }
        if (input.message.length < 18) {
          sendJson(
            response,
            200,
            {
              kind: "DIRECT_ANSWER",
              answer: "这是一个适合直接回答的简单问题。",
              limitations: ["演示回答未调用实时 LLM。"],
            },
            requestId,
          );
          return;
        }
        sendJson(
          response,
          200,
          {
            kind: "CREATE_PROPOSAL",
            proposalId: randomUUID(),
            question: input.message,
            rationale: "建议创建持续调查主题。",
          },
          requestId,
        );
        return;
      }

      const participationMatch = /^\/api\/investigations\/([^/]+)\/participation$/.exec(path);
      if (request.method === "POST" && participationMatch?.[1]) {
        const investigation = dependencies.repository.get(
          decodeURIComponent(participationMatch[1]),
        );
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        const input = parseOrThrow(ParticipationRequestSchema, await readJson(request));
        const mission = input.missionId
          ? investigation.missions.find((item) => item.id === input.missionId)
          : investigation.missions.find((item) => item.status === MISSION_STATUS.OPEN);
        if (mission && /经历|亲身|观察|证据|案例/.test(input.message)) {
          sendJson(
            response,
            200,
            { intent: "EVIDENCE_SUBMISSION", missionId: mission.id, next: "CONVERSATION" },
            requestId,
          );
          return;
        }
        if (dependencies.discussionOrganizer) {
          const discussion = {
            id: idFactory(),
            investigationId: investigation.id,
            content: input.message,
            authorLabel: "community-participant",
            createdAt: clock().toISOString(),
            source: "COMMUNITY_PARTICIPATION",
          };
          const organized = await dependencies.discussionOrganizer.organize(discussion);
          investigation.discussions.push(discussion);
          investigation.discussionOrganizations.push(organized.organization);
          investigation.llmRuns.push(organized.run);
          for (const claim of organized.organization.claims) {
            if (
              !investigation.evidenceState.supported.some((item) => item.id === claim.id) &&
              !investigation.evidenceState.unsupported.some((item) => item.id === claim.id)
            ) {
              investigation.evidenceState.unsupported.push(claim);
            }
          }
          const recommendedGap = organized.organization.gaps.find(
            (gap) =>
              gap.affectedClaimId &&
              investigation.evidenceState.unsupported.some(
                (claim) => claim.id === gap.affectedClaimId,
              ),
          );
          if (recommendedGap && organized.organization.missionRecommended) {
            investigation.evidenceState.candidateGap = recommendedGap;
            investigation.evidenceState.gapSuitability = evaluateGapSuitability(
              recommendedGap,
              investigation.question,
            );
            const suitability = investigation.evidenceState.gapSuitability;
            const effectiveGap = suitability.reframedGap ?? recommendedGap;
            investigation.evidenceState.nextGap =
              suitability.status === GAP_SUITABILITY_STATUS.MISSION_READY
                ? effectiveGap
                : undefined;
            if (suitability.status === GAP_SUITABILITY_STATUS.MISSION_READY) {
              const existingMission = investigation.missions.find(
                (item) =>
                  item.status === MISSION_STATUS.OPEN && item.evidenceGapId === effectiveGap.id,
              );
              if (!existingMission) {
                investigation.missions.push(
                  createEvidenceMission({
                    investigationId: investigation.id,
                    question: investigation.question,
                    gap: effectiveGap,
                  }),
                );
              }
            }
          }
          investigation.updatedAt = clock().toISOString();
          dependencies.repository.save(investigation);
          sendJson(
            response,
            200,
            {
              intent: "QUESTION",
              answer: organized.organization.summary ?? "已整理这条讨论。",
              limitations: organized.organization.limitations,
              discussion,
              organization: organized.organization,
            },
            requestId,
          );
          return;
        }
        if (mission && /参加|参与|可以帮|我来/.test(input.message)) {
          sendJson(
            response,
            200,
            {
              intent: "MISSION_INTEREST",
              missionId: mission.id,
              title: mission.title,
              description: mission.description,
            },
            requestId,
          );
          return;
        }
        sendJson(
          response,
          200,
          {
            intent: "QUESTION",
            answer: "当前调查仍在整理证据。",
            limitations: investigation.knowledgeState.limitations,
          },
          requestId,
        );
        return;
      }
      if (request.method === "POST" && path === "/api/investigations/proposals") {
        const input = parseOrThrow(CreateInvestigationRequestSchema, await readJson(request));
        const normalized = input.question
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
        const existing = dependencies.repository.listInvestigations().find(
          (item) =>
            item.question
              .toLowerCase()
              .replace(/[^\p{L}\p{N}]+/gu, " ")
              .trim() === normalized,
        );
        if (existing) {
          sendJson(
            response,
            200,
            {
              proposalId: `existing-${existing.id}`,
              question: input.question,
              rationale: "已有相同 Investigation，无需重复创建。",
              createdAt: clock().toISOString(),
              investigationId: existing.id,
            },
            requestId,
          );
          return;
        }
        const proposalId = randomUUID();
        dependencies.repository.saveProposal({
          id: proposalId,
          question: input.question,
          createdAt: clock().toISOString(),
        });
        sendJson(
          response,
          201,
          {
            proposalId,
            question: input.question,
            rationale: "建议创建持续调查主题。",
            createdAt: clock().toISOString(),
          },
          requestId,
        );
        return;
      }
      const proposalMatch = /^\/api\/investigations\/proposals\/([^/]+)\/confirm$/.exec(path);
      if (request.method === "POST" && proposalMatch?.[1]) {
        const proposalId = decodeURIComponent(proposalMatch[1]);
        const proposal = dependencies.repository.getProposal(proposalId);
        if (!proposal) throw new HttpError(404, "NOT_FOUND", "Investigation proposal not found.");
        if (proposal.confirmedInvestigationId) {
          const existing = dependencies.repository.get(proposal.confirmedInvestigationId);
          if (existing) {
            sendJson(response, 200, existing, requestId);
            return;
          }
        }
        const investigation = await prepareInvestigation(proposal.question);
        proposal.confirmedInvestigationId = investigation.id;
        dependencies.repository.saveProposal(proposal);
        sendJson(response, 201, investigation, requestId);
        return;
      }
      const maintenanceListMatch = /^\/api\/investigations\/([^/]+)\/maintenance-runs$/.exec(path);
      if (request.method === "GET" && maintenanceListMatch?.[1]) {
        const id = decodeURIComponent(maintenanceListMatch[1]);
        if (!dependencies.repository.get(id))
          throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        sendJson(
          response,
          200,
          dependencies.repository.listMaintenanceRuns(id).map((r) => MaintenanceRunSchema.parse(r)),
          requestId,
        );
        return;
      }
      const maintenanceMatch = /^\/api\/investigations\/([^/]+)\/maintenance$/.exec(path);
      if (request.method === "POST" && maintenanceMatch?.[1]) {
        const investigation = dependencies.repository.get(decodeURIComponent(maintenanceMatch[1]));
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        const startedAt = clock().toISOString();
        const stateBefore = investigation.knowledgeState.status;
        const [zhihu, global] = await Promise.all([
          dependencies.searchService.searchZhihu(investigation.question),
          dependencies.searchService.searchGlobal(investigation.question),
        ]);
        const nextState = evaluateSearchEvidence({
          question: investigation.question,
          zhihu,
          global,
        });
        const previousEvidenceState = investigation.evidenceState;
        const previousState = investigation.knowledgeState.status;
        investigation.searches = { zhihu, global };
        investigation.evidenceState = nextState;
        const createdMissionIds: string[] = [];
        const closedMissionIds: string[] = [];
        for (const mission of [...investigation.missions]) {
          if (
            (mission.status === MISSION_STATUS.OPEN && !nextState.nextGap) ||
            (mission.status === MISSION_STATUS.OPEN &&
              nextState.nextGap &&
              mission.evidenceGapId !== nextState.nextGap.id &&
              investigation.evidence.some((e) => e.missionId === mission.id))
          ) {
            closeMission({
              investigation,
              missionId: mission.id,
              reason: "维护后该 Mission 不再是当前优先证据缺口。",
              closedAt: clock().toISOString(),
            });
            closedMissionIds.push(mission.id);
          }
        }
        const nextGap = nextState.nextGap;
        if (
          nextGap &&
          !investigation.missions.some(
            (m) => m.evidenceGapId === nextGap.id && m.status === MISSION_STATUS.OPEN,
          )
        ) {
          const mission = createEvidenceMission({
            investigationId: investigation.id,
            question: investigation.question,
            gap: nextGap,
          });
          investigation.missions.push(mission);
          createdMissionIds.push(mission.id);
          appendAction(investigation.actions, AGENT_ACTION.CREATE_MISSION);
        }
        investigation.updatedAt = clock().toISOString();
        dependencies.repository.save(investigation);
        const run = {
          runId: idFactory(),
          investigationId: investigation.id,
          trigger: "MANUAL",
          startedAt,
          completedAt: clock().toISOString(),
          status: "SUCCEEDED" as const,
          stateBefore,
          stateAfter: investigation.knowledgeState.status,
          changed:
            JSON.stringify(previousEvidenceState) !== JSON.stringify(nextState) ||
            previousState !== investigation.knowledgeState.status,
          createdMissionIds,
          closedMissionIds,
          limitations: [...zhihu.limitations, ...global.limitations],
        };
        dependencies.repository.saveMaintenanceRun(run);
        sendJson(
          response,
          200,
          {
            investigation,
            changed: true,
            provenance: { zhihu: zhihu.provenance, global: global.provenance },
            limitations: [...zhihu.limitations, ...global.limitations],
          },
          requestId,
        );
        return;
      }
      const activityMatch = /^\/api\/investigations\/([^/]+)\/activity$/.exec(path);
      if (request.method === "GET" && activityMatch?.[1]) {
        const investigation = dependencies.repository.get(decodeURIComponent(activityMatch[1]));
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        const events = [
          {
            eventId: `created-${investigation.id}`,
            investigationId: investigation.id,
            eventType: "CREATED",
            actorType: "SYSTEM",
            summary: "Investigation created.",
            createdAt: investigation.createdAt,
          },
          ...investigation.discussions.map((d) => ({
            eventId: d.id,
            investigationId: investigation.id,
            eventType: "DISCUSSION_ADDED",
            actorType: "USER",
            summary: d.content,
            createdAt: d.createdAt,
          })),
          ...investigation.evidence.map((e) => ({
            eventId: e.id,
            investigationId: investigation.id,
            eventType: "EVIDENCE_ADDED",
            actorType: "USER",
            summary: e.observation,
            createdAt: e.createdAt,
          })),
          ...investigation.missions.map((m) => ({
            eventId: `mission-${m.id}`,
            investigationId: investigation.id,
            eventType: m.status === MISSION_STATUS.OPEN ? "MISSION_OPENED" : "MISSION_CLOSED",
            actorType: "AGENT",
            summary: m.title,
            createdAt: m.createdAt,
          })),
          ...(investigation.reevaluation
            ? [
                {
                  eventId: `state-${investigation.reevaluation.updatedAt}`,
                  investigationId: investigation.id,
                  eventType: "KNOWLEDGE_STATE_CHANGED",
                  actorType: "AGENT",
                  summary: investigation.reevaluation.whyStateChanged,
                  createdAt: investigation.reevaluation.updatedAt,
                },
              ]
            : []),
          ...(investigation.impactReceipts ?? []).map((r) => ({
            eventId: `receipt-${r.evidenceId}`,
            investigationId: investigation.id,
            eventType: "IMPACT_RECEIPT_CREATED",
            actorType: "SYSTEM",
            summary: r.impactSummary,
            createdAt: r.createdAt,
          })),
        ];
        events.sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId),
        );
        events.sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventId.localeCompare(b.eventId),
        );
        sendJson(response, 200, ActivityEventsResponseSchema.parse(events), requestId);
        return;
      }
      // ============================
      // GET /api/investigations
      // ============================
      if (request.method === "POST" && path === "/api/discussions/organize") {
        if (!dependencies.discussionOrganizer)
          throw new HttpError(
            503,
            "UPSTREAM_UNAVAILABLE",
            "Discussion organizer is not configured.",
          );
        const input = parseOrThrow(DiscussionInputSchema, await readJson(request));
        const result = await dependencies.discussionOrganizer.organize(input);
        if (input.investigationId) {
          const investigation = dependencies.repository.get(input.investigationId);
          if (investigation) {
            investigation.discussions.push(input);
            investigation.discussionOrganizations.push(result.organization);
            investigation.llmRuns.push(result.run);
            for (const claim of result.organization.claims) {
              if (
                !investigation.evidenceState.supported.some((item) => item.id === claim.id) &&
                !investigation.evidenceState.unsupported.some((item) => item.id === claim.id)
              ) {
                investigation.evidenceState.unsupported.push(claim);
              }
            }
            const gap = result.organization.gaps.find((item) =>
              investigation.evidenceState.unsupported.some(
                (claim) => claim.id === item.affectedClaimId,
              ),
            );
            if (gap) {
              investigation.evidenceState.candidateGap = gap;
              investigation.evidenceState.nextGap = gap;
              investigation.evidenceState.gapSuitability = evaluateGapSuitability(
                gap,
                investigation.question,
              );
              const effectiveGap = investigation.evidenceState.gapSuitability.reframedGap ?? gap;
              investigation.evidenceState.nextGap = effectiveGap;
              if (
                investigation.evidenceState.gapSuitability.status ===
                GAP_SUITABILITY_STATUS.MISSION_READY
              ) {
                if (
                  !investigation.missions.some(
                    (mission) => mission.evidenceGapId === effectiveGap.id,
                  )
                ) {
                  investigation.missions.push(
                    createEvidenceMission({
                      investigationId: investigation.id,
                      question: investigation.question,
                      gap,
                    }),
                  );
                  appendAction(investigation.actions, AGENT_ACTION.CREATE_MISSION);
                }
              }
            }
            investigation.updatedAt = clock().toISOString();
            dependencies.repository.save(investigation);
          }
        }
        sendJson(response, 200, result, requestId);
        return;
      }

      if (request.method === "GET" && path === "/api/investigations") {
        const all = dependencies.repository.listInvestigations();
        const items = all.map((inv) => ({
          id: inv.id,
          question: inv.question,
          knowledgeState: inv.knowledgeState.status,
          missionCount: inv.missions.length,
          evidenceCount: inv.evidence.length,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
        }));
        sendJson(response, 200, items, requestId);
        return;
      }

      // ============================
      // GET /api/missions
      // ============================
      if (request.method === "GET" && path === "/api/missions") {
        const openOnly = url.searchParams.get("status") === "OPEN";
        const all = dependencies.repository.listMissions(openOnly);
        const items = all.map(({ investigation, mission }) => ({
          id: mission.id,
          investigationId: mission.investigationId,
          evidenceGapId: mission.evidenceGapId,
          title: mission.title,
          status: mission.status,
          evidenceCount: investigation.evidence.filter((r) => r.missionId === mission.id).length,
          createdAt: mission.createdAt,
        }));
        sendJson(response, 200, items, requestId);
        return;
      }

      // ============================
      // GET /api/missions/:id
      // ============================
      const missionDetailMatch = /^\/api\/missions\/([^/]+)$/.exec(path);
      if (request.method === "GET" && missionDetailMatch?.[1]) {
        const lookup = dependencies.repository.findMission(
          decodeURIComponent(missionDetailMatch[1]),
        );
        if (!lookup) throw new HttpError(404, "NOT_FOUND", "Mission not found.");
        const { investigation, mission } = lookup;
        const evidence = investigation.evidence.filter((r) => r.missionId === mission.id);
        const gap = [
          investigation.evidenceState.nextGap,
          investigation.evidenceState.candidateGap,
          investigation.evidenceState.gapSuitability?.reframedGap,
        ].find((candidate) => candidate?.id === mission.evidenceGapId);
        sendJson(
          response,
          200,
          {
            mission,
            evidence,
            gap: gap ?? null,
            investigationId: investigation.id,
            question: investigation.question,
            knowledgeState: investigation.knowledgeState,
          },
          requestId,
        );
        return;
      }

      // ============================
      // POST /api/investigations
      // ============================
      if (request.method === "POST" && path === "/api/investigations") {
        const input = parseOrThrow(CreateInvestigationRequestSchema, await readJson(request));
        const investigation = await prepareInvestigation(input.question);
        sendJson(response, 201, investigation, requestId);
        return;
      }

      if (request.method === "GET" && path === "/api/discovery/hot-list") {
        if (!dependencies.hotList)
          throw new HttpError(503, "UPSTREAM_UNAVAILABLE", "Hot list is not configured.", true);
        sendJson(
          response,
          200,
          await dependencies.hotList.list(Number(url.searchParams.get("limit") ?? 10)),
          requestId,
        );
        return;
      }

      if (request.method === "GET" && path === "/api/discovery/topics") {
        sendJson(
          response,
          200,
          dependencies.repository.listInvestigations().map(projectDiscoveryTopic),
          requestId,
        );
        return;
      }
      const objectMatch =
        /^\/api\/knowledge-objects\/([^/]+)$/.exec(path) ??
        /^\/api\/investigations\/([^/]+)\/community-view$/.exec(path);
      if (request.method === "GET" && objectMatch?.[1]) {
        const investigation = dependencies.repository.get(decodeURIComponent(objectMatch[1]));
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Knowledge Object not found.");
        sendJson(response, 200, projectKnowledgeObject(investigation), requestId);
        return;
      }

      // ============================
      // GET /api/investigations/:id
      // ============================
      const investigationMatch = /^\/api\/investigations\/([^/]+)$/.exec(path);
      if (request.method === "GET" && investigationMatch?.[1]) {
        const investigation = dependencies.repository.get(
          decodeURIComponent(investigationMatch[1]),
        );
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        sendJson(response, 200, investigation, requestId);
        return;
      }

      // ============================
      // POST /api/investigations/:id/missions
      // ============================
      const missionMatch = /^\/api\/investigations\/([^/]+)\/missions$/.exec(path);
      if (request.method === "POST" && missionMatch?.[1]) {
        const investigation = dependencies.repository.get(decodeURIComponent(missionMatch[1]));
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");

        const input = parseOrThrow(CreateMissionRequestSchema, await readJson(request));
        const suitability = investigation.evidenceState.gapSuitability;
        if (
          !suitability ||
          suitability.status === GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION
        ) {
          throw new HttpError(
            409,
            "VALIDATION_ERROR",
            "This Investigation is not suitable for creating a Mission.",
          );
        }

        const gap = investigation.evidenceState.nextGap;
        if (!gap) {
          throw new HttpError(
            409,
            "VALIDATION_ERROR",
            "Evidence Gap is marked mission-ready but no effective Gap is available.",
          );
        }
        if (input.gapId && input.gapId !== gap.id) {
          throw new HttpError(
            409,
            "VALIDATION_ERROR",
            "Requested gapId is not the mission-ready Gap.",
          );
        }

        const existing = investigation.missions.find((mission) => mission.evidenceGapId === gap.id);
        if (existing) {
          sendJson(response, 200, investigation, requestId);
          return;
        }

        investigation.missions.push(
          createEvidenceMission({
            investigationId: investigation.id,
            question: investigation.question,
            gap,
          }),
        );
        appendAction(investigation.actions, AGENT_ACTION.CREATE_MISSION);
        appendAction(investigation.actions, AGENT_ACTION.STOP);
        investigation.updatedAt = clock().toISOString();
        dependencies.repository.save(investigation);
        sendJson(response, 201, investigation, requestId);
        return;
      }

      // ============================
      // POST /api/missions/:id/evidence
      // ============================
      const evidenceMatch = /^\/api\/missions\/([^/]+)\/evidence$/.exec(path);
      if (request.method === "POST" && evidenceMatch?.[1]) {
        const lookup = dependencies.repository.findMission(decodeURIComponent(evidenceMatch[1]));
        if (!lookup) throw new HttpError(404, "NOT_FOUND", "Mission not found.");

        const submission = parseOrThrow(EvidenceSubmissionSchema, await readJson(request));
        const { record, receipt, investigation } = submitMissionEvidence({
          investigation: lookup.investigation,
          mission: lookup.mission,
          submission,
          clock,
          idFactory,
        });

        // Save returns the updated receipt
        const result = {
          record,
          receipt,
          investigation,
        };
        dependencies.repository.save(investigation);
        sendJson(response, 201, result, requestId);
        return;
      }

      // ============================
      // GET /api/evidence/:id/impact
      // ============================
      const impactMatch = /^\/api\/evidence\/([^/]+)\/impact$/.exec(path);
      if (request.method === "GET" && impactMatch?.[1]) {
        const evidenceId = decodeURIComponent(impactMatch[1]);
        for (const investigation of dependencies.repository.listInvestigations()) {
          const receipt = investigation.impactReceipts?.find(
            (item) => item.evidenceId === evidenceId,
          );
          if (receipt) {
            sendJson(response, 200, receipt, requestId);
            return;
          }
        }
        throw new HttpError(404, "NOT_FOUND", "Evidence not found.");
      }

            // ============================
      // Zhihu OAuth Routes
      // ============================
      // GET /api/auth/zhihu/url
      if (request.method === "GET" && path === "/api/auth/zhihu/url") {
        const oauthConfig = dependencies.oauth;
        if (!oauthConfig?.appId) throw new HttpError(503, "AUTH_REQUIRED", "OAuth not configured (ZHIHU_APP_ID).");
        const redirectUri = url.searchParams.get("redirect_uri") || oauthConfig.redirectUri;
        const state = dependencies.oauthStateStore?.create(redirectUri);
        if (!state) throw new HttpError(500, "INTERNAL_ERROR", "Failed to create OAuth state.");
        const authorizeUrl = buildAuthorizeUrl(oauthConfig.appId, redirectUri, state);
        sendJson(response, 200, { url: authorizeUrl, state }, requestId);
        return;
      }

      // POST /api/auth/zhihu/callback
      if (request.method === "POST" && path === "/api/auth/zhihu/callback") {
        const oauthConfig = dependencies.oauth;
        if (!oauthConfig?.appId || !oauthConfig?.appKey) throw new HttpError(503, "AUTH_REQUIRED", "OAuth not configured.");
        const body = await readJson(request) as Record<string, unknown>;
        const code = String(body.code || body.authorization_code || "");
        const returnedState = String(body.state || "");

        // Verify state
        let verifiedRedirectUri: string | null = null;
        if (returnedState) {
          verifiedRedirectUri = dependencies.oauthStateStore?.consume(returnedState) ?? null;
        }
        if (!verifiedRedirectUri) {
          const allowed = oauthConfig.redirectUri;
          if (!returnedState && allowed) {
            verifiedRedirectUri = allowed;
          }
        }
        const effectiveRedirectUri = verifiedRedirectUri || oauthConfig.redirectUri;

        // Exchange code for token
        const tokenResult = await exchangeCodeForToken(oauthConfig.appId, oauthConfig.appKey, effectiveRedirectUri, code);
        const accessToken = tokenResult.access_token;

        // Get user info
        const userInfo: ZhihuUserResponse = await getUserInfo(accessToken);

        // Create session
        const sessionId = dependencies.authSessionStore?.create(
          { uid: userInfo.uid, fullname: userInfo.fullname, headline: userInfo.headline ?? undefined, avatar: userInfo.avatar_path ?? undefined },
          accessToken,
        );
        if (!sessionId) throw new HttpError(500, "INTERNAL_ERROR", "Failed to create session.");

        setSessionCookie(response, sessionId);
        sendJson(response, 200, {
          user: { uid: userInfo.uid, fullname: userInfo.fullname, headline: userInfo.headline ?? "", avatar: userInfo.avatar_path ?? "" },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, requestId);
        return;
      }

      // GET /api/auth/zhihu/me
      if (request.method === "GET" && path === "/api/auth/zhihu/me") {
        const sessionId = parseSessionCookie(request);
        if (!sessionId) return sendJson(response, 401, { error: { code: "AUTH_REQUIRED", message: "未登录" } }, requestId);
        const session = dependencies.authSessionStore?.get(sessionId);
        if (!session) return sendJson(response, 401, { error: { code: "AUTH_REQUIRED", message: "会话已过期" } }, requestId);
        sendJson(response, 200, session, requestId);
        return;
      }

      // POST /api/auth/zhihu/logout
      if (request.method === "POST" && path === "/api/auth/zhihu/logout") {
        const sessionId = parseSessionCookie(request);
        if (sessionId) dependencies.authSessionStore?.delete(sessionId);
        sendJson(response, 200, { ok: true }, requestId);
        return;
      }

      // GET /api/auth/zhihu/followees
      if (request.method === "GET" && path === "/api/auth/zhihu/followees") {
        const sessionId = parseSessionCookie(request);
        if (!sessionId) throw new HttpError(401, "AUTH_REQUIRED", "未登录");
        const oauthToken = dependencies.authSessionStore?.getAccessToken?.(sessionId);
        if (!oauthToken) throw new HttpError(401, "AUTH_REQUIRED", "会话已过期");
        if (!dependencies.userApi) throw new HttpError(503, "AUTH_REQUIRED", "用户 API 未配置");
        const offset = url.searchParams.get("offset") || "0";
        const limit = Number(url.searchParams.get("limit")) || 20;
        const result = await dependencies.userApi.listFollowees(oauthToken, offset, limit);
        sendJson(response, 200, result, requestId);
        return;
      }

      // GET /api/auth/zhihu/contents
      if (request.method === "GET" && path === "/api/auth/zhihu/contents") {
        const sessionId = parseSessionCookie(request);
        if (!sessionId) throw new HttpError(401, "AUTH_REQUIRED", "未登录");
        const oauthToken = dependencies.authSessionStore?.getAccessToken?.(sessionId);
        if (!oauthToken) throw new HttpError(401, "AUTH_REQUIRED", "会话已过期");
        if (!dependencies.userApi) throw new HttpError(503, "AUTH_REQUIRED", "用户 API 未配置");
        const offset = url.searchParams.get("offset") || "0";
        const limit = Number(url.searchParams.get("limit")) || 20;
        const result = await dependencies.userApi.listContents(oauthToken, offset, limit);
        sendJson(response, 200, result, requestId);
        return;
      }
throw new HttpError(404, "NOT_FOUND", "Route not found.");
    } catch (error) {
      const httpError = toHttpError(error);
      sendJson(
        response,
        httpError.status,
        {
          error: {
            code: httpError.code,
            message: httpError.message,
            requestId,
            retryable: httpError.retryable,
          },
        },
        requestId,
      );
    }
  };
}
