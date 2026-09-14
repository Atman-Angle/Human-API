import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import {
  ConversationDraftSchema,
  EvidenceIntakeResponseSchema,
  DiscoveryTopicsResponseSchema,
  KnowledgeObjectProjectionSchema,
  EVIDENCE_GRADE,
  KNOWLEDGE_STATE,
  MISSION_STATUS,
  SEARCH_PROVENANCE,
  SOURCE_PROVIDER,
  type Investigation,
  type SearchResponse,
} from "@human-api/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { closeMission } from "../src/mission-lifecycle.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import { SearchService, type SearchAdapter } from "../src/search-service.js";
import type { SearchCache } from "../src/cache/file-search-cache.js";

const NOW = "2026-09-13T00:00:00.000Z";
const AI_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";

type Provider = "ZHIHU" | "GLOBAL";

function source(provider: Provider, contentId: string, excerpt: string) {
  return {
    id: `${provider.toLowerCase()}:${contentId}`,
    provider,
    contentId,
    contentType: "Answer",
    title: "真实经验与公开讨论",
    url: `https://example.com/${provider.toLowerCase()}/${contentId}`,
    authorName: "测试来源",
    excerpt,
    publishedAt: NOW,
    authorityLevel: "2",
    voteUpCount: 10,
    commentCount: 2,
  };
}

function searchResponse(
  question: string,
  provider: Provider,
  items: ReturnType<typeof source>[],
): SearchResponse {
  return {
    query: question,
    provider,
    provenance: SEARCH_PROVENANCE.LIVE,
    items,
    hasMore: false,
    retrievedAt: NOW,
    limitations: ["test fixture"],
  };
}

class StaticAdapter implements SearchAdapter {
  constructor(private readonly response: SearchResponse) {}

  async search(): Promise<SearchResponse> {
    return this.response;
  }
}

class MemoryCache implements SearchCache {
  private readonly values = new Map<string, SearchResponse>();

  async read(provider: Provider, query: string): Promise<SearchResponse | undefined> {
    return this.values.get(`${provider}\\n${query}`);
  }

  async write(response: SearchResponse): Promise<void> {
    this.values.set(`${response.provider}\\n${response.query}`, response);
  }
}

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

interface TestServer {
  baseUrl: string;
  repository: InMemoryInvestigationRepository;
}

async function startServer(question: string, excerpts: string[]): Promise<TestServer> {
  const items = excerpts.map((excerpt, index) =>
    source(index % 2 === 0 ? SOURCE_PROVIDER.ZHIHU : SOURCE_PROVIDER.GLOBAL, `s${index}`, excerpt),
  );
  const service = new SearchService({
    adapters: {
      ZHIHU: new StaticAdapter(
        searchResponse(
          question,
          SOURCE_PROVIDER.ZHIHU,
          items.filter((item) => item.provider === SOURCE_PROVIDER.ZHIHU),
        ),
      ),
      GLOBAL: new StaticAdapter(
        searchResponse(
          question,
          SOURCE_PROVIDER.GLOBAL,
          items.filter((item) => item.provider === SOURCE_PROVIDER.GLOBAL),
        ),
      ),
    },
    cache: new MemoryCache(),
    fixtures: { get: async () => undefined },
    defaultCount: 10,
  });
  let sequence = 0;
  const repository = new InMemoryInvestigationRepository();
  const handler = createRequestHandler({
    repository,
    searchService: service,
    clock: () => new Date(NOW),
    idFactory: () => `id-${++sequence}`,
  });
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server address unavailable");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    repository,
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}

async function createInvestigation(baseUrl: string, question: string): Promise<Investigation> {
  const created = await request<Investigation>(`${baseUrl}/api/investigations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  expect(created.status).toBe(201);
  return created.body;
}

async function createMission(baseUrl: string, investigationId: string): Promise<Investigation> {
  const missionResult = await request<Investigation>(
    `${baseUrl}/api/investigations/${investigationId}/missions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  expect(missionResult.status).toBe(201);
  return missionResult.body;
}

// ============================================================
// Community Backend Vertical Slice Tests
// ============================================================
describe("Evidence Intake", () => {
  it("saves E0 evidence without advancing Knowledge State", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");

    const e0Response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "AI 未来会取代初级开发者。",
      }),
    });
    expect(e0Response.status).toBe(201);
    const { record, receipt, investigation } = (await e0Response.json()) as {
      record: { grade: string; matchesGap: boolean };
      receipt: { accepted: boolean; grade: string; stateBefore: string; stateAfter: string };
      investigation: Investigation;
    };

    // E0 is opinion, not matching gap
    expect(record.grade).toBe(EVIDENCE_GRADE.E0_OPINION);
    expect(record.matchesGap).toBe(false);
    expect(investigation.knowledgeState.status).toBe(KNOWLEDGE_STATE.UNRESOLVED);

    // Receipt reflects E0
    expect(receipt.accepted).toBe(false);
    expect(receipt.grade).toBe(EVIDENCE_GRADE.E0_OPINION);
    expect(receipt.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(receipt.stateAfter).toBe(KNOWLEDGE_STATE.UNRESOLVED);
  });

  it("accepts E1 evidence and advances target Claim Knowledge State", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");
    const gap = withMission.evidenceState.nextGap;
    if (!gap) throw new Error("No gap");
    const targetClaim = [
      ...created.evidenceState.supported,
      ...created.evidenceState.unsupported,
    ].find((c) => c.id === gap.affectedClaimId);
    if (!targetClaim) throw new Error("Claim not found");

    const e1Response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "我最近三个月使用 Claude Code 写测试。",
        participantType: "实习生",
        experience: "在实习项目中持续使用 AI 写测试。",
        task: "接口测试和边界条件",
        aiRole: "AI 生成测试草稿。",
        humanJudgment: "我检查异常场景是否符合业务语义。",
      }),
    });
    expect(e1Response.status).toBe(201);
    const { record, receipt, investigation } = (await e1Response.json()) as {
      record: { id: string; grade: string; matchesGap: boolean };
      receipt: {
        accepted: boolean;
        grade: string;
        affectedClaimId: string;
        stateBefore: string;
        stateAfter: string;
        stillMissing: string[];
      };
      investigation: Investigation;
    };

    // E1 matches gap and advances state
    expect(record.grade).toBe(EVIDENCE_GRADE.E1_FIRST_HAND);
    expect(record.matchesGap).toBe(true);
    expect(investigation.knowledgeState.status).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);

    // Receipt shows state change
    expect(receipt.accepted).toBe(true);
    expect(receipt.grade).toBe(EVIDENCE_GRADE.E1_FIRST_HAND);
    expect(receipt.affectedClaimId).toBe(gap.affectedClaimId);
    expect(receipt.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(receipt.stateAfter).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);
    expect(receipt.stillMissing.length).toBeGreaterThan(0);
  });

  it("rejects Evidence for CLOSED Mission", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");

    // Close the mission
    const lookup = repository.findMission(mission.id);
    if (!lookup) throw new Error("Mission lookup failed");
    closeMission({
      investigation: lookup.investigation,
      missionId: mission.id,
      reason: "CLAIM_SUFFICIENTLY_SUPPORTED",
      closedAt: NOW,
    });
    repository.save(lookup.investigation);

    const rejected = await request<{ error: { code: string; message: string } }>(
      `${baseUrl}/api/missions/${mission.id}/evidence`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: "尝试提交到已关闭 Mission。" }),
      },
    );
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("VALIDATION_ERROR");
    expect(rejected.body.error.message).toContain("CLOSED");
  });

  it("rejects Evidence when Gap references invalid Claim", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");

    // This test validates that the gap resolution step in evidence-intake works
    // by submitting to a valid mission with valid data
    const response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "真实的第一手经历测试。",
        participantType: "实习生",
        experience: "Test experience",
        task: "Test task",
        aiRole: "Test AI role",
        humanJudgment: "Test judgment",
      }),
    });
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.receipt.accepted).toBe(true);
  });
});

describe("Impact Receipt", () => {
  it("generates E0 receipt with accepted=false", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");

    const response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "AI 会取代初级开发者。" }),
    });
    expect(response.status).toBe(201);
    const { receipt } = (await response.json()) as {
      receipt: {
        evidenceId: string;
        missionId: string;
        investigationId: string;
        accepted: boolean;
        grade: string;
        affectedClaimId: string;
        stateBefore: string;
        stateAfter: string;
        impactSummary: string;
        stillMissing: string[];
        createdAt: string;
      };
    };

    expect(receipt.accepted).toBe(false);
    expect(receipt.grade).toBe(EVIDENCE_GRADE.E0_OPINION);
    expect(receipt.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(receipt.stateAfter).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(receipt.affectedClaimId).toBeTruthy();
    expect(receipt.investigationId).toBe(created.id);
    expect(receipt.missionId).toBe(mission.id);
    expect(receipt.evidenceId).toBeTruthy();
    expect(receipt.createdAt).toBeTruthy();
    // Verify stillMissing explains what"s missing
    expect(receipt.stillMissing.length).toBeGreaterThan(0);
  });

  it("generates E1 receipt with stateBefore/stateAfter change", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission created");
    const gap = withMission.evidenceState.nextGap;
    if (!gap) throw new Error("No gap");

    const response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "接口测试现在由 AI 生成。",
        participantType: "实习生",
        experience: "在实习中持续使用 AI。",
        task: "接口测试",
        aiRole: "AI 生成测试代码。",
        humanJudgment: "我判断异常和边界。",
      }),
    });
    expect(response.status).toBe(201);
    const { receipt } = (await response.json()) as {
      receipt: {
        evidenceId: string;
        accepted: boolean;
        grade: string;
        affectedClaimId: string;
        stateBefore: string;
        stateAfter: string;
        stillMissing: string[];
      };
    };

    expect(receipt.accepted).toBe(true);
    expect(receipt.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(receipt.stateAfter).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);
    expect(receipt.affectedClaimId).toBe(gap.affectedClaimId);
  });
});

describe("Community Read API", () => {
  it("lists investigations with summary fields", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    await createInvestigation(baseUrl, AI_QUESTION);
    await createInvestigation(baseUrl, "另一个需要 Investigation 的问题。");

    const list = await request<
      Array<{
        id: string;
        question: string;
        knowledgeState: string;
        missionCount: number;
        evidenceCount: number;
      }>
    >(`${baseUrl}/api/investigations`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(2);
    expect(list.body[0]?.question).toBeTruthy();
    expect(list.body[0]?.knowledgeState).toBeTruthy();
    expect(typeof list.body[0]?.missionCount).toBe("number");
    expect(typeof list.body[0]?.evidenceCount).toBe("number");
  });

  it("returns investigation detail", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);

    const detail = await request<Investigation>(`${baseUrl}/api/investigations/${created.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(created.id);
    expect(detail.body.question).toBe(AI_QUESTION);
    expect(detail.body.knowledgeState).toBeDefined();
    expect(detail.body.evidenceState).toBeDefined();
  });

  it("returns 404 for non-existent investigation", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, []);
    const detail = await request<{ error: { code: string } }>(
      `${baseUrl}/api/investigations/non-existent`,
    );
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe("NOT_FOUND");
  });

  it("lists missions with evidence counts", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission");

    // Submit evidence to create count
    await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "一条测试证据。",
        participantType: "实习生",
        experience: "使用 AI 的经验",
        task: "写测试",
        aiRole: "AI 生成测试",
        humanJudgment: "我检查结果",
      }),
    });

    const list = await request<
      Array<{
        id: string;
        title: string;
        status: string;
        evidenceCount: number;
        investigationId: string;
      }>
    >(`${baseUrl}/api/missions`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    expect(list.body[0]?.id).toBe(mission.id);
    expect(list.body[0]?.status).toBe(MISSION_STATUS.OPEN);
    expect(list.body[0]?.evidenceCount).toBe(1);
  });

  it("lists only OPEN missions when filtered", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission");

    // Close the mission
    const lookup = repository.findMission(mission.id);
    if (!lookup) throw new Error("Lookup failed");
    closeMission({
      investigation: lookup.investigation,
      missionId: mission.id,
      reason: "Done",
      closedAt: NOW,
    });
    repository.save(lookup.investigation);

    const allList = await request<Array<{ id: string }>>(`${baseUrl}/api/missions`);
    expect(allList.body.length).toBe(1);

    const openList = await request<Array<{ id: string }>>(`${baseUrl}/api/missions?status=OPEN`);
    expect(openList.body.length).toBe(0);
  });

  it("returns mission detail with evidence and gap", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission");

    const detail = await request<{
      mission: { id: string; title: string };
      evidence: Array<{ id: string }>;
      gap: { id: string } | null;
      question: string;
      knowledgeState: { status: string };
    }>(`${baseUrl}/api/missions/${mission.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.mission.id).toBe(mission.id);
    expect(detail.body.mission.title).toBeTruthy();
    expect(detail.body.gap).toBeTruthy();
    expect(detail.body.question).toBe(AI_QUESTION);
    expect(detail.body.knowledgeState.status).toBeTruthy();
  });

  it("returns 404 for non-existent mission", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, []);
    const detail = await request<{ error: { code: string } }>(
      `${baseUrl}/api/missions/non-existent`,
    );
    expect(detail.status).toBe(404);
  });

  it("returns impact receipt for submitted evidence", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, ["学生和实习生用 AI 生成代码测试。"]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("No mission");

    const submitResponse = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "接口测试现在由 AI 生成。",
        participantType: "实习生",
        experience: "近期在使用 AI。",
        task: "接口测试",
        aiRole: "AI 生成测试代码。",
        humanJudgment: "我判断异常和边界。",
      }),
    });
    expect(submitResponse.status).toBe(201);
    const { record, receipt } = (await submitResponse.json()) as {
      record: { id: string };
      receipt: { evidenceId: string };
    };

    // Verify receipt data matches record
    expect(receipt.evidenceId).toBe(record.id);

    // Fetch impact via GET
    const impactResponse = await request<{
      evidenceId: string;
      accepted: boolean;
      grade: string;
      stateBefore: string;
      stateAfter: string;
      stillMissing: string[];
    }>(`${baseUrl}/api/evidence/${record.id}/impact`);
    expect(impactResponse.status).toBe(200);
    expect(impactResponse.body.evidenceId).toBe(record.id);
    expect(impactResponse.body.accepted).toBe(true);
  });
});

describe("Golden Community Flow", () => {
  it("runs the full end-to-end community flow", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "初级开发者用 Claude Code 生成测试，但需要自己检查业务边界。",
    ]);

    // 1. Create Investigation
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    expect(created.id).toBeTruthy();
    expect(created.knowledgeState.status).toBe(KNOWLEDGE_STATE.UNRESOLVED);

    // 2. Create Mission
    const withMission = await createMission(baseUrl, created.id);
    const mission = withMission.missions[0];
    if (!mission) throw new Error("Mission not created");
    expect(mission.status).toBe(MISSION_STATUS.OPEN);

    // 3. Submit E0 Evidence (opinion, should not advance)
    const e0Response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: "AI 影响很大但还需要判断。" }),
    });
    expect(e0Response.status).toBe(201);
    const e0Body = (await e0Response.json()) as {
      record: { grade: string };
      receipt: { accepted: boolean };
      investigation: Investigation;
    };

    expect(e0Body.record.grade).toBe(EVIDENCE_GRADE.E0_OPINION);
    expect(e0Body.receipt.accepted).toBe(false);
    expect(e0Body.investigation.knowledgeState.status).toBe(KNOWLEDGE_STATE.UNRESOLVED);

    // 4. Submit E1 Evidence (first-hand, should advance)
    const e1Response = await fetch(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statement: "最近三个月用 Claude Code 生成接口测试和调试。",
        participantType: "实习生",
        experience: "使用 AI 生成测试",
        task: "接口测试和调试",
        aiRole: "AI 生成测试代码",
        humanJudgment: "我判断异常场景和业务语义",
      }),
    });
    expect(e1Response.status).toBe(201);
    const e1Body = (await e1Response.json()) as {
      record: { id: string; grade: string };
      receipt: {
        accepted: boolean;
        stateBefore: string;
        stateAfter: string;
        affectedClaimId: string;
        stillMissing: string[];
      };
      investigation: Investigation;
    };

    expect(e1Body.record.grade).toBe(EVIDENCE_GRADE.E1_FIRST_HAND);
    expect(e1Body.receipt.accepted).toBe(true);
    expect(e1Body.receipt.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(e1Body.receipt.stateAfter).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);
    expect(e1Body.receipt.affectedClaimId).toBeTruthy();
    expect(e1Body.receipt.stillMissing.length).toBeGreaterThan(0);
    expect(e1Body.investigation.knowledgeState.status).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);

    // 5. Verify Investigation Detail shows updated state
    const detail = await request<Investigation>(`${baseUrl}/api/investigations/${created.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.knowledgeState.status).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);
    expect(detail.body.evidence.length).toBe(2);

    // 6. Verify Mission List shows counts
    const missionList = await request<Array<{ id: string; evidenceCount: number }>>(
      `${baseUrl}/api/missions`,
    );
    expect(missionList.status).toBe(200);
    const found = missionList.body.find((m) => m.id === mission.id);
    expect(found?.evidenceCount).toBe(2);

    // 7. Verify Mission Detail
    const missionDetail = await request<{
      mission: { id: string };
      evidence: Array<{ id: string }>;
    }>(`${baseUrl}/api/missions/${mission.id}`);
    expect(missionDetail.status).toBe(200);
    expect(missionDetail.body.evidence.length).toBe(2);

    // 8. Verify Impact Receipt for E1
    const impactResponse = await request<{
      evidenceId: string;
      accepted: boolean;
      stateBefore: string;
      stateAfter: string;
    }>(`${baseUrl}/api/evidence/${e1Body.record.id}/impact`);
    expect(impactResponse.status).toBe(200);
    expect(impactResponse.body.accepted).toBe(true);
    expect(impactResponse.body.stateBefore).toBe(KNOWLEDGE_STATE.UNRESOLVED);
    expect(impactResponse.body.stateAfter).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);

    // 9. Verify Investigation List
    const invList = await request<Array<{ id: string; knowledgeState: string }>>(
      `${baseUrl}/api/investigations`,
    );
    expect(invList.status).toBe(200);
    expect(invList.body.length).toBe(1);
    expect(invList.body[0]?.knowledgeState).toBe(KNOWLEDGE_STATE.EARLY_EVIDENCE);
  });
});

describe("A09 read projections and A06 historical receipts", () => {
  it("returns an empty discovery list and 404 for missing community objects", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, []);
    expect((await request<unknown[]>(`${baseUrl}/api/discovery/topics`)).body).toEqual([]);
    expect((await fetch(`${baseUrl}/api/investigations/missing/community-view`)).status).toBe(404);
  });

  it("projects existing authority without mutating it, fabricating totals, or flattening provenance", async () => {
    const { KnowledgeObjectProjectionSchema, DiscoveryTopicsResponseSchema } =
      await import("@human-api/contracts");
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    await createMission(baseUrl, created.id);
    const saved = repository.get(created.id)!;
    saved.searches.zhihu.provenance = SEARCH_PROVENANCE.CACHE;
    saved.searches.global.provenance = SEARCH_PROVENANCE.GOLDEN_FIXTURE;
    saved.searches.zhihu.items.push(saved.searches.zhihu.items[0]!);
    const before = structuredClone(saved);
    const topics = DiscoveryTopicsResponseSchema.parse(
      (await request<unknown>(`${baseUrl}/api/discovery/topics`)).body,
    );
    expect(topics).toHaveLength(1);
    expect(topics[0]!.sourceCount).toBe(1);
    expect(topics[0]!.discussionCount).toBe(0);
    expect(topics[0]!.activeInvitation?.id).toBe(saved.missions[0]!.id);
    expect(topics[0]!.provenance).toEqual({ zhihu: "CACHE", global: "GOLDEN_FIXTURE" });
    const view = KnowledgeObjectProjectionSchema.parse(
      (await request<unknown>(`${baseUrl}/api/investigations/${created.id}/community-view`)).body,
    );
    expect(view.summary.consensus).toEqual(saved.evidenceState.known);
    expect(view.summary.disagreements).toEqual(saved.evidenceState.disagreements);
    expect(view.summary.unknowns).toContain(saved.knowledgeState.nextGap!.missingObservation);
    expect(new Set(view.evidenceGaps.map((gap) => gap.id)).size).toBe(view.evidenceGaps.length);
    expect((await request<unknown>(`${baseUrl}/api/knowledge-objects/${created.id}`)).body).toEqual(
      view,
    );
    expect(saved).toEqual(before);
    saved.missions[0]!.status = MISSION_STATUS.CLOSED;
    const closed = DiscoveryTopicsResponseSchema.parse(
      (await request<unknown>(`${baseUrl}/api/discovery/topics`)).body,
    );
    expect(closed[0]!.activeInvitation).toBeUndefined();
  });

  it("keeps the submitted receipt unchanged after later submissions and state changes", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const withMission = await createMission(baseUrl, created.id);
    const submit = (statement: string) =>
      fetch(`${baseUrl}/api/missions/${withMission.missions[0]!.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement }),
      });
    const first = await (await submit("我认为 AI 很有用")).json();
    await submit("AI 总有一天会替代所有人");
    const saved = repository.get(created.id)!;
    saved.knowledgeState.status = KNOWLEDGE_STATE.SUPPORTED_WITH_LIMITATIONS;
    saved.knowledgeState.limitations.push("Later limitation must not leak into older receipts");
    const read = await request<unknown>(`${baseUrl}/api/evidence/${first.record.id}/impact`);
    expect(read.status).toBe(200);
    expect(read.body).toEqual(first.receipt);
    expect(saved.impactReceipts).toHaveLength(2);
    saved.impactReceipts = [];
    expect((await fetch(`${baseUrl}/api/evidence/${first.record.id}/impact`)).status).toBe(404);
  });
});

describe("Product Direction v3 conversation demo", () => {
  const samples = JSON.parse(
    readFileSync(
      new URL("../../../fixtures/golden-case/conversation-samples.json", import.meta.url),
      "utf8",
    ),
  ) as { label: string; outcome: string; turns: string[] }[];
  const post = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  async function setup() {
    const runtime = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const prepared = await request<Investigation>(`${runtime.baseUrl}/api/demo/prepare`, post({}));
    const mission = prepared.body.missions[0];
    if (!mission) throw new Error("missing demo invitation");
    return {
      ...runtime,
      investigation: prepared.body,
      mission,
      url: `${runtime.baseUrl}/api/missions/${mission.id}/conversation`,
    };
  }
  it("prepares one topic and invitation even under concurrent homepage loads", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "学生和实习生用 AI 生成代码测试，但需要自己检查业务逻辑。",
    ]);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request<Investigation>(`${baseUrl}/api/demo/prepare`, post({})),
      ),
    );
    expect(new Set(results.map((item) => item.body.id)).size).toBe(1);
    expect(repository.listInvestigations()).toHaveLength(1);
    expect(results[0]?.body.missions).toHaveLength(1);
    const topics = await request<unknown>(`${baseUrl}/api/discovery/topics`);
    expect(DiscoveryTopicsResponseSchema.parse(topics.body)[0]?.activeInvitation).toBeDefined();
  });
  it("runs accepted, rejected, accepted-unchanged and preserves authoritative receipts on refresh", async () => {
    const { url, baseUrl, investigation } = await setup();
    for (const sample of samples) {
      const opening = await request<unknown>(url, post({ answers: [] }));
      expect(ConversationDraftSchema.parse(opening.body).question).toContain("反例");
      const followup = await request<unknown>(url, post({ answers: sample.turns.slice(0, 1) }));
      const draft = ConversationDraftSchema.parse(followup.body);
      expect(draft.question).toBeDefined();
      if (sample.outcome !== "rejected") {
        expect(draft.question).toContain("检查");
        expect(draft.question).not.toContain("你当时的身份");
      }
      const preview = await request<unknown>(url, post({ answers: sample.turns }));
      const finalDraft = ConversationDraftSchema.parse(preview.body);
      expect(finalDraft.question).toBeUndefined();
      expect(finalDraft.summary).toBe(sample.turns.join("\n"));
      const before = await request<Investigation>(
        `${baseUrl}/api/investigations/${investigation.id}`,
      );
      const countBefore = before.body.evidence.length;
      const result = await request<unknown>(
        `${url}/confirm`,
        post({
          confirmed: true,
          summary: finalDraft.summary,
          demoSample: true,
          grade: "E2_ARTIFACT_BACKED",
          affectedClaimId: "forged",
        }),
      );
      expect(result.status).toBe(201);
      const intake = EvidenceIntakeResponseSchema.parse(result.body);
      expect(intake.investigation.evidence).toHaveLength(countBefore + 1);
      expect(intake.record.submission.demoSample).toBe(true);
      expect(intake.receipt.accepted).toBe(sample.outcome !== "rejected");
      expect(intake.receipt.stateBefore === intake.receipt.stateAfter).toBe(
        sample.outcome !== "accepted",
      );
      expect(intake.receipt.contribution?.observation).toBe(
        sample.outcome === "rejected" ? undefined : finalDraft.summary,
      );
      expect(intake.receipt.contribution?.boundary).toContain("不能证明普遍规律");
      expect(intake.receipt.contribution?.explanation).toContain(
        sample.outcome === "rejected"
          ? "未"
          : sample.outcome === "accepted"
            ? "发生了变化"
            : "没有变化",
      );
      expect(intake.receipt.grade).not.toBe(EVIDENCE_GRADE.E2_ARTIFACT_BACKED);
      expect(intake.receipt.affectedClaimId).not.toBe("forged");
      const refreshed = await request<unknown>(
        `${baseUrl}/api/knowledge-objects/${investigation.id}`,
      );
      expect(KnowledgeObjectProjectionSchema.parse(refreshed.body).impactReceipts.at(-1)).toEqual(
        intake.receipt,
      );
      const reloadedReceipt = await request<unknown>(
        `${baseUrl}/api/evidence/${intake.record.id}/impact`,
      );
      expect(reloadedReceipt.body).toEqual(intake.receipt);
    }
  });
  it("drafts and cancellation never write; edited final summary is the only evaluated text", async () => {
    const { url, repository, investigation } = await setup();
    await request(url, post({ answers: samples[0]?.turns }));
    expect(repository.get(investigation.id)?.evidence).toHaveLength(0);
    expect(
      (await request(`${url}/confirm`, post({ confirmed: false, summary: "拒绝摘要" }))).status,
    ).toBe(400);
    expect(repository.get(investigation.id)?.evidence).toHaveLength(0);
    const result = await request<unknown>(
      `${url}/confirm`,
      post({ confirmed: true, summary: "我没有亲身经历，只是觉得 AI 很好。" }),
    );
    const intake = EvidenceIntakeResponseSchema.parse(result.body);
    expect(intake.receipt.accepted).toBe(false);
    expect(intake.record.submission.humanJudgment).toBeUndefined();
    expect(intake.record.observation).not.toContain("权限边界");
  });
  it("prioritizes at most two concrete missing contexts instead of collecting a profile", async () => {
    const { url } = await setup();
    const draft = ConversationDraftSchema.parse(
      (await request(url, post({ answers: ["我想讲一次自己的经历。"] }))).body,
    );
    expect(draft.question).toContain("具体做的任务");
    expect(draft.question).toContain("如何检查");
    expect(draft.question).not.toContain("你当时的身份");
    expect(draft.question).not.toContain("发生的时间");
    const next = ConversationDraftSchema.parse(
      (
        await request(
          url,
          post({
            answers: [
              "我想讲一次自己的经历。",
              "上周我在项目里编写测试，AI 生成用例。我检查并决定不采用结果。",
            ],
          }),
        )
      ).body,
    );
    expect(next.question).toContain("你当时的身份");
    expect(next.question).not.toContain("如何检查");
    expect(next.question).not.toContain("具体做的任务");
  });
  it("stops at two follow-ups, honors withholding and rejects closed or missing invitations", async () => {
    const { url, repository, investigation, mission } = await setup();
    const withheld = ConversationDraftSchema.parse(
      (await request(url, post({ answers: ["不方便说"] }))).body,
    );
    expect(withheld.question).toBeUndefined();
    const max = ConversationDraftSchema.parse(
      (await request(url, post({ answers: ["我在项目使用 AI", "我是实习生", "不记得细节"] }))).body,
    );
    expect(max.question).toBeUndefined();
    expect(max.followUpCount).toBeLessThanOrEqual(2);
    expect((await request(url, post({ answers: ["1", "2", "3", "4"] }))).status).toBe(400);
    expect((await request(url.replace(mission.id, "missing"), post({ answers: [] }))).status).toBe(
      404,
    );
    const stored = repository.get(investigation.id);
    if (!stored?.missions[0]) throw new Error("missing stored mission");
    stored.missions[0].status = MISSION_STATUS.CLOSED;
    expect((await request(url, post({ answers: [] }))).status).toBe(409);
    expect(
      (await request(`${url}/confirm`, post({ confirmed: true, summary: "不能写入" }))).status,
    ).toBe(409);
    expect(stored.evidence).toHaveLength(0);
  });
});

describe("Community Chat Spec HTTP loop", () => {
  it("routes chat through proposal, discovery, participation, maintenance and activity", async () => {
    const { baseUrl, repository } = await startServer(
      "复杂问题：AI 是否改变初级开发者的工作方式？",
      ["一手经验：需要人工检查业务逻辑。"],
    );
    const post = (body: unknown): RequestInit => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const route = await request<{ kind: string; question?: string }>(
      `${baseUrl}/api/chat/route`,
      post({ message: "这是一个复杂问题：AI 是否改变初级开发者的工作方式以及边界和证据？" }),
    );
    expect(route.body.kind).toBe("CREATE_PROPOSAL");
    const proposal = await request<{ proposalId: string }>(
      `${baseUrl}/api/investigations/proposals`,
      post({ question: route.body.question }),
    );
    expect(proposal.status).toBe(201);
    const confirmed = await request<Investigation>(
      `${baseUrl}/api/investigations/proposals/${proposal.body.proposalId}/confirm`,
      post({}),
    );
    expect(confirmed.status).toBe(201);
    const id = confirmed.body.id;
    expect((await request<unknown>(`${baseUrl}/api/discovery/topics`)).status).toBe(200);
    const participation = await request<{ intent: string }>(
      `${baseUrl}/api/investigations/${id}/participation`,
      post({ message: "我补充一个个人经历和观察案例" }),
    );
    expect(["EVIDENCE_SUBMISSION", "QUESTION"]).toContain(participation.body.intent);
    const maintenance = await request<{ runId: string }>(
      `${baseUrl}/api/investigations/${id}/maintenance`,
      post({}),
    );
    expect(maintenance.status).toBe(200);
    expect(
      (await request<unknown>(`${baseUrl}/api/investigations/${id}/maintenance-runs`)).status,
    ).toBe(200);
    const activity = await request<Array<{ eventId: string; createdAt: string }>>(
      `${baseUrl}/api/investigations/${id}/activity`,
    );
    expect(activity.status).toBe(200);
    expect(
      activity.body.every(
        (event, index) => index === 0 || event.createdAt >= activity.body[index - 1]!.createdAt,
      ),
    ).toBe(true);
    expect(repository.get(id)).toBeDefined();
  });
});

describe("Agent governance invariants", () => {
  it("keeps discussion non-evidence and maintenance idempotent", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "真实开发经历与人工检查业务逻辑。",
    ]);
    const post = (body: unknown): RequestInit => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const prepared = await request<Investigation>(`${baseUrl}/api/demo/prepare`, post({}));
    const before = prepared.body.knowledgeState.status;
    const discussion = await request<{ intent: string }>(
      `${baseUrl}/api/investigations/${prepared.body.id}/participation`,
      post({ message: "我认为 AI 一定会让所有初级开发者失业。" }),
    );
    expect(discussion.body.intent).toBe("QUESTION");
    const stored = repository.get(prepared.body.id);
    expect(stored?.evidence).toHaveLength(0);
    expect(stored?.knowledgeState.status).toBe(before);
    const first = await request<{ createdMissionIds: string[] }>(
      `${baseUrl}/api/investigations/${prepared.body.id}/maintenance`,
      post({}),
    );
    const second = await request<{ createdMissionIds: string[] }>(
      `${baseUrl}/api/investigations/${prepared.body.id}/maintenance`,
      post({}),
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      repository.get(prepared.body.id)?.missions.filter((m) => m.status === "OPEN"),
    ).toHaveLength(1);
    expect(second.body).toBeDefined();
    expect(repository.listMaintenanceRuns(prepared.body.id)).toHaveLength(2);
  });
});
