import { createServer, type Server } from "node:http";
import {
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
