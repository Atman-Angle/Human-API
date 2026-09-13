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
  buildKnowledgeStateFromReevaluation,
  createEvidenceMission,
  createInitialKnowledgeState,
  evaluateSearchEvidence,
  reevaluateKnowledgeState,
} from "@human-api/agent";
import { gradeEvidenceSubmission } from "@human-api/evidence";
import { HttpError, toHttpError } from "./errors.js";
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

      const missionMatch = /^\/api\/investigations\/([^/]+)\/missions$/.exec(path);
      if (request.method === "POST" && missionMatch?.[1]) {
        const investigation = dependencies.repository.get(decodeURIComponent(missionMatch[1]));
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");

        const input = parseOrThrow(CreateMissionRequestSchema, await readJson(request));
        const suitability = investigation.evidenceState.gapSuitability;
        if (!suitability || suitability.status !== GAP_SUITABILITY_STATUS.MISSION_READY) {
          throw new HttpError(
            409,
            "VALIDATION_ERROR",
            suitability
              ? `Evidence Gap is not mission-ready. status=${suitability.status}; reason=${suitability.reason}`
              : "Evidence Gap suitability has not been evaluated.",
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
            `Requested gapId ${input.gapId} is not the mission-ready Gap.`,
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

      const evidenceMatch = /^\/api\/missions\/([^/]+)\/evidence$/.exec(path);
      if (request.method === "POST" && evidenceMatch?.[1]) {
        const lookup = dependencies.repository.findMission(decodeURIComponent(evidenceMatch[1]));
        if (!lookup) throw new HttpError(404, "NOT_FOUND", "Mission not found.");
        const { investigation, mission } = lookup;
        const gap = [
          investigation.evidenceState.nextGap,
          investigation.evidenceState.candidateGap,
          investigation.evidenceState.gapSuitability?.reframedGap,
        ].find((candidate) => candidate?.id === mission.evidenceGapId);
        if (!gap) throw new HttpError(409, "VALIDATION_ERROR", "Mission has no Evidence Gap.");

        const submission = parseOrThrow(EvidenceSubmissionSchema, await readJson(request));
        const graded = gradeEvidenceSubmission({ submission, mission, gap });
        const now = clock().toISOString();
        const record = {
          id: idFactory(),
          missionId: mission.id,
          participantType: graded.participantType,
          submission,
          observation: graded.observation,
          grade: graded.grade,
          gradeReason: graded.gradeReason,
          matchesGap: graded.matchesGap,
          createdAt: now,
        };
        investigation.evidence.push(record);

        const reevaluation = reevaluateKnowledgeState({
          question: investigation.question,
          evidenceState: investigation.evidenceState,
          missions: investigation.missions,
          evidence: investigation.evidence,
        });
        investigation.reevaluation = reevaluation;
        investigation.knowledgeState = buildKnowledgeStateFromReevaluation(
          investigation.knowledgeState,
          reevaluation,
          investigation.evidence.length,
        );
        investigation.updatedAt = now;
        dependencies.repository.save(investigation);
        sendJson(response, 201, investigation, requestId);
        return;
      }

      const investigationMatch = /^\/api\/investigations\/([^/]+)$/.exec(path);
      if (request.method === "GET" && investigationMatch?.[1]) {
        const investigation = dependencies.repository.get(
          decodeURIComponent(investigationMatch[1]),
        );
        if (!investigation) throw new HttpError(404, "NOT_FOUND", "Investigation not found.");
        sendJson(response, 200, investigation, requestId);
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
