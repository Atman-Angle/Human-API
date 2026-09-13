import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  AGENT_ACTION,
  CreateInvestigationRequestSchema,
  CreateMissionRequestSchema,
  EvidenceSubmissionSchema,
  GAP_SUITABILITY_STATUS,
  type AgentAction,
  type Investigation,
} from "@human-api/contracts";
import {
  buildInitialAgentActions,
  createEvidenceMission,
  createInitialKnowledgeState,
  evaluateSearchEvidence,
} from "@human-api/agent";

import { HttpError, toHttpError } from "./errors.js";
import { submitMissionEvidence } from "./evidence-intake.js";
import type { InMemoryInvestigationRepository } from "./repository.js";
import type { SearchService } from "./search-service.js";

export interface AppDependencies {
  repository: InMemoryInvestigationRepository;
  searchService: SearchService;
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
  response.end(`${JSON.stringify(body, null, 2)}\n`);
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

function appendAction(actions: AgentAction[], action: AgentAction): void {
  if (!actions.includes(action)) actions.push(action);
}

export function createRequestHandler(dependencies: AppDependencies) {
  const clock = dependencies.clock ?? (() => new Date());
  const idFactory = dependencies.idFactory ?? randomUUID;

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

      // ============================
      // GET /api/investigations
      // ============================
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
        const [zhihu, global] = await Promise.all([
          dependencies.searchService.searchZhihu(input.question),
          dependencies.searchService.searchGlobal(input.question),
        ]);
        const evidenceState = evaluateSearchEvidence({
          question: input.question,
          zhihu,
          global,
        });
        const now = clock().toISOString();
        const investigation: Investigation = {
          id: idFactory(),
          question: input.question,
          searches: { zhihu, global },
          evidenceState,
          actions: buildInitialAgentActions(evidenceState),
          missions: [],
          evidence: [],
          knowledgeState: createInitialKnowledgeState(evidenceState, now),
          createdAt: now,
          updatedAt: now,
        };
        dependencies.repository.save(investigation);
        sendJson(response, 201, investigation, requestId);
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
        // Impact receipts are generated at submission time and stored temporarily.
        // For now, we return a reconstructed receipt from the investigation state.
        const evidenceId = decodeURIComponent(impactMatch[1]);
        for (const investigation of dependencies.repository.listInvestigations()) {
          const record = investigation.evidence.find((r) => r.id === evidenceId);
          if (!record) continue;
          // Find the mission and gap
          const mission = investigation.missions.find((m) => m.id === record.missionId);
          if (!mission) break;
          const gap = [
            investigation.evidenceState.nextGap,
            investigation.evidenceState.candidateGap,
            investigation.evidenceState.gapSuitability?.reframedGap,
          ].find((candidate) => candidate?.id === mission.evidenceGapId);
          if (!gap) break;
          const stateBefore = investigation.reevaluation
            ? investigation.knowledgeState.status === "SUPPORTED_WITH_LIMITATIONS"
              ? "EARLY_EVIDENCE"
              : "UNRESOLVED"
            : investigation.knowledgeState.status;
          const receipt = {
            evidenceId: record.id,
            missionId: mission.id,
            investigationId: investigation.id,
            accepted:
              record.matchesGap &&
              (record.grade === "E1_FIRST_HAND" || record.grade === "E2_ARTIFACT_BACKED"),
            grade: record.grade,
            affectedClaimId: gap.affectedClaimId,
            stateBefore,
            stateAfter: investigation.knowledgeState.status,
            impactSummary:
              investigation.reevaluation?.whyStateChanged ?? "No re-evaluation recorded.",
            stillMissing: investigation.knowledgeState.limitations,
            createdAt: record.createdAt,
          };
          sendJson(response, 200, receipt, requestId);
          return;
        }
        throw new HttpError(404, "NOT_FOUND", "Evidence not found.");
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
