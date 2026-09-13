import { createServer, type Server } from "node:http";
import {
  GAP_SUITABILITY_STATUS,
  MISSION_STATUS,
  SEARCH_PROVENANCE,
  SOURCE_PROVIDER,
  type Investigation,
  type SearchResponse,
} from "@human-api/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import type { SearchCache } from "../src/cache/file-search-cache.js";
import { closeMission } from "../src/mission-lifecycle.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import { SearchService, type SearchAdapter } from "../src/search-service.js";

const NOW = "2026-09-13T00:00:00.000Z";
const AI_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";
const ELDERLY_PAYMENT_QUESTION = "老年人使用智能手机支付时最容易被哪一步卡住？";
const EV_RANGE_QUESTION = "新能源车冬季跑高速时，车主实际续航下降了多少？";

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
    return this.values.get(`${provider}\n${query}`);
  }

  async write(response: SearchResponse): Promise<void> {
    this.values.set(`${response.provider}\n${response.query}`, response);
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
  return { baseUrl: `http://127.0.0.1:${address.port}`, repository };
}

async function request<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: (await response.json()) as T,
  };
}

function post(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

describe("Golden vertical slice", () => {
  it("runs the AI Coding case through mission creation and re-evaluation", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "初级开发者现在用 AI 生成接口和测试，但还是要自己检查异常场景和边界条件。",
      "学生和实习生把部分调试、文档和代码理解任务交给 AI Coding，人类负责最终验证。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);

    expect(created.knowledgeState.status).toBe("UNRESOLVED");
    expect(created.evidenceState.gapSuitability?.status).toBe(GAP_SUITABILITY_STATUS.MISSION_READY);
    expect(created.evidenceState.nextGap?.id).toBe(created.evidenceState.candidateGap?.id);
    const targetGap = created.evidenceState.nextGap;
    const targetClaim = targetGap
      ? created.evidenceState.supported.find((item) => item.id === targetGap.affectedClaimId)
      : undefined;
    const otherClaim = created.evidenceState.unsupported[0];
    if (!targetGap || !targetClaim || !otherClaim) {
      throw new Error("Attribution fixture incomplete");
    }
    expect(targetGap.affectedClaimId).toBe(targetClaim.id);

    const missionResult = await request<Investigation>(
      `${baseUrl}/api/investigations/${created.id}/missions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
    expect(missionResult.status).toBe(201);
    expect(missionResult.body.actions).toContain("CREATE_MISSION");
    const mission = missionResult.body.missions[0];
    if (!mission) throw new Error("Mission missing");
    expect(mission.evidenceGapId).toBe(targetGap.id);
    expect(mission.status).toBe(MISSION_STATUS.OPEN);
    expect(mission.updatedAt).toBe(mission.createdAt);

    const duplicateMissionResult = await request<Investigation>(
      `${baseUrl}/api/investigations/${created.id}/missions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapId: targetGap.id }),
      },
    );
    expect(duplicateMissionResult.status).toBe(200);
    expect(duplicateMissionResult.body.missions).toHaveLength(1);
    expect(duplicateMissionResult.body.missions[0]?.id).toBe(mission.id);

    const e0Response = await post(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      statement: "AI 以后肯定会全面取代初级程序员。",
    });
    const { investigation: e0Inv } = (await e0Response.json()) as { investigation: Investigation };
    expect(e0Inv.evidence[0]?.grade).toBe("E0_OPINION");
    expect(e0Inv.evidence[0]?.matchesGap).toBe(false);
    expect(e0Inv.knowledgeState.status).toBe("UNRESOLVED");
    expect(e0Inv.knowledgeState.evidenceCount).toBe(1);

    const e1Response = await post(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      statement: "接口测试和异常边界以前自己写，现在主要由 Claude Code 生成。",
      participantType: "实习生",
      experience: "我最近三个月在实习项目中持续使用 Claude Code。",
      task: "接口测试、异常场景和边界条件",
      aiRole: "Claude Code 生成测试草稿和常见异常分支。",
      humanJudgment: "我检查业务语义、边界条件和异常场景是否符合真实接口。",
      affectedClaimId: otherClaim.id,
      missionId: "forged-mission",
      evidenceGapId: "forged-gap",
    });
    const { investigation: e1Inv } = (await e1Response.json()) as { investigation: Investigation };
    const e1Record = e1Inv.evidence[1];
    if (!e1Record) throw new Error("E1 Evidence missing");
    expect(e1Record.grade).toBe("E1_FIRST_HAND");
    expect(e1Record.matchesGap).toBe(true);
    expect(e1Record.missionId).toBe(mission.id);
    expect(e1Record.submission).not.toHaveProperty("affectedClaimId");
    expect(e1Record.submission).not.toHaveProperty("missionId");
    expect(e1Record.submission).not.toHaveProperty("evidenceGapId");
    const updatedTargetClaim = e1Inv.knowledgeState.supported.find(
      (item) => item.id === targetClaim.id,
    );
    const unchangedOtherClaim = e1Inv.knowledgeState.unsupported.find(
      (item) => item.id === otherClaim.id,
    );
    expect(updatedTargetClaim?.evidenceIds).toContain(e1Record.id);
    expect(unchangedOtherClaim).toEqual(otherClaim);
    expect(e1Inv.knowledgeState.status).toBe("EARLY_EVIDENCE");
    expect(e1Inv.reevaluation?.stillUnsupported).toEqual(created.evidenceState.unsupported);
  });

  it("rejects Evidence for a CLOSED Mission without deleting attribution", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "初级开发者现在用 AI 生成接口和测试，但还是要自己检查异常场景和边界条件。",
      "学生和实习生把部分调试、文档和代码理解任务交给 AI Coding，人类负责最终验证。",
    ]);
    const created = await createInvestigation(baseUrl, AI_QUESTION);
    const missionResult = await request<Investigation>(
      `${baseUrl}/api/investigations/${created.id}/missions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
    const mission = missionResult.body.missions[0];
    if (!mission) throw new Error("Mission missing");

    const evidenceResponse = await post(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      statement: "接口测试和异常边界以前自己写，现在主要由 Claude Code 生成。",
      participantType: "实习生",
      experience: "我最近三个月在实习项目中持续使用 Claude Code。",
      task: "接口测试、异常场景和边界条件",
      aiRole: "Claude Code 生成测试草稿和常见异常分支。",
      humanJudgment: "我检查业务语义、边界条件和异常场景是否符合真实接口。",
    });
    expect(evidenceResponse.status).toBe(201);
    const { investigation: beforeCloseInv } = (await evidenceResponse.json()) as {
      investigation: Investigation;
    };

    const lookup = repository.findMission(mission.id);
    if (!lookup) throw new Error("Mission lookup missing");
    const closedMission = closeMission({
      investigation: lookup.investigation,
      missionId: mission.id,
      reason: "CLAIM_SUFFICIENTLY_SUPPORTED",
      closedAt: NOW,
    });
    repository.save(lookup.investigation);

    expect(closedMission.status).toBe(MISSION_STATUS.CLOSED);
    expect(closedMission.updatedAt).toBe(NOW);
    expect(closedMission.closedAt).toBe(NOW);
    expect(closedMission.closedReason).toBe("CLAIM_SUFFICIENTLY_SUPPORTED");

    const rejected = await request<{ error: { code: string; message: string } }>(
      `${baseUrl}/api/missions/${mission.id}/evidence`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: "这是关闭后的另一条真实经历。" }),
      },
    );
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("VALIDATION_ERROR");
    expect(rejected.body.error.message).toContain("CLOSED");

    const saved = await request<Investigation>(`${baseUrl}/api/investigations/${created.id}`);
    expect(saved.status).toBe(200);
    expect(saved.body.evidence).toHaveLength(beforeCloseInv.evidence.length);
    expect(saved.body.knowledgeState).toEqual(beforeCloseInv.knowledgeState);

    const savedMission = saved.body.missions.find((item) => item.id === mission.id);
    if (!savedMission) throw new Error("Saved Mission missing");
    const savedGap = [
      saved.body.evidenceState.nextGap,
      saved.body.evidenceState.candidateGap,
      saved.body.evidenceState.gapSuitability?.reframedGap,
    ].find((candidate) => candidate?.id === savedMission.evidenceGapId);
    if (!savedGap) throw new Error("Saved Gap missing");
    const savedClaim = [
      ...saved.body.evidenceState.supported,
      ...saved.body.evidenceState.unsupported,
    ].find((claim) => claim.id === savedGap.affectedClaimId);
    const savedEvidence = saved.body.evidence.find(
      (record) => record.missionId === savedMission.id,
    );
    if (!savedClaim || !savedEvidence) throw new Error("Attribution chain missing");

    expect(savedMission.status).toBe(MISSION_STATUS.CLOSED);
    expect(savedEvidence.missionId).toBe(savedMission.id);
    expect(savedMission.evidenceGapId).toBe(savedGap.id);
    expect(savedGap.affectedClaimId).toBe(savedClaim.id);
  });

  it("reframes the elderly payment case once and creates the mission from the reframed Gap", async () => {
    const { baseUrl } = await startServer(ELDERLY_PAYMENT_QUESTION, [
      "老人提到手机支付时，常在不同页面、密码输入和确认步骤遇到困难。",
      "社区经验帖描述了求助店员、重新扫码和放弃付款等不同处理方式。",
    ]);
    const created = await createInvestigation(baseUrl, ELDERLY_PAYMENT_QUESTION);
    const suitability = created.evidenceState.gapSuitability;

    expect(suitability).toMatchObject({
      status: GAP_SUITABILITY_STATUS.MISSION_READY,
      initialStatus: GAP_SUITABILITY_STATUS.NEEDS_REFRAMING,
    });
    expect(suitability?.reframedGap).toBeDefined();
    expect(suitability?.reframedGap?.id).not.toBe(created.evidenceState.candidateGap?.id);
    expect(created.evidenceState.nextGap?.id).toBe(suitability?.reframedGap?.id);

    const missionResult = await request<Investigation>(
      `${baseUrl}/api/investigations/${created.id}/missions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapId: suitability?.reframedGap?.id }),
      },
    );
    expect(missionResult.status).toBe(201);
    expect(missionResult.body.missions[0]?.evidenceGapId).toBe(suitability?.reframedGap?.id);
    expect(missionResult.body.missions[0]?.description).toContain("最近 30 天");
  });

  it("rejects mission creation for the EV range case and leaves the investigation without a mission", async () => {
    const { baseUrl } = await startServer(EV_RANGE_QUESTION, [
      "车主讨论冬季高速续航时给出了不同车型、温度和车速下的体验。",
      "公开文章强调统一测试条件和多变量控制后才能比较真实续航。",
    ]);
    const created = await createInvestigation(baseUrl, EV_RANGE_QUESTION);

    expect(created.evidenceState.gapSuitability?.status).toBe(
      GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION,
    );
    expect(created.evidenceState.nextGap).toBeUndefined();

    const missionResult = await request<{ error: { code: string; message: string } }>(
      `${baseUrl}/api/investigations/${created.id}/missions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
    expect(missionResult.status).toBe(409);
    expect(missionResult.body.error.code).toBe("VALIDATION_ERROR");
    expect(missionResult.body.error.code).toBe("VALIDATION_ERROR");

    const saved = await request<Investigation>(`${baseUrl}/api/investigations/${created.id}`);
    expect(saved.status).toBe(200);
    expect(saved.body.missions).toHaveLength(0);
  });
});
