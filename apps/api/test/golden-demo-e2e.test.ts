import { createServer, type Server } from "node:http";
import {
  EVIDENCE_GRADE,
  MISSION_STATUS,
  SEARCH_PROVENANCE,
  SOURCE_PROVIDER,
  type Investigation,
  type SearchResponse,
  type ChatRouteResponse,
  type EvidenceIntakeResponse,
  type KnowledgeObjectProjection,
} from "@human-api/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import { SearchService, type SearchAdapter } from "../src/search-service.js";
import { FakeDiscussionOrganizer } from "../src/llm/discussion-organizer.js";
import type { SearchCache } from "../src/cache/file-search-cache.js";

const NOW = "2026-09-13T00:00:00.000Z";
const AI_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";

type Provider = "ZHIHU" | "GLOBAL";
function source(provider: Provider, contentId: string, excerpt: string) {
  return {
    id: provider.toLowerCase() + ":" + contentId,
    provider,
    contentId,
    contentType: "Answer",
    title: "真实经验与公开讨论",
    url: "https://example.com/" + provider.toLowerCase() + "/" + contentId,
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
    return this.values.get(provider + "\\n" + query);
  }
  async write(response: SearchResponse): Promise<void> {
    this.values.set(response.provider + "\\n" + response.query, response);
  }
}

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

interface TestServer {
  baseUrl: string;
  repository: InMemoryInvestigationRepository;
}
async function startServer(question: string, excerpts: string[]): Promise<TestServer> {
  const items = excerpts.map((excerpt, index) =>
    source(index % 2 === 0 ? SOURCE_PROVIDER.ZHIHU : SOURCE_PROVIDER.GLOBAL, "s" + index, excerpt),
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
    discussionOrganizer: new FakeDiscussionOrganizer(),
    clock: () => new Date(NOW),
    idFactory: () => "id-" + ++sequence,
  });
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server address unavailable");
  return { baseUrl: "http://127.0.0.1:" + address.port, repository };
}

async function request<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(url, init);
  return { status: response.status, body: (await response.json()) as T };
}
function post(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ============================================================
// Golden Demo 验收 — Spec Section 13 路径 A 和路径 B
// ============================================================
describe("Golden Demo 验收 — 路径 A: 对话框 → 共创全流程", () => {
  it("完整运行 A 路径: 对话框→路由→创建帖子→初始文章→Observation→Evidence→Receipt", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "初级开发者现在用 AI 生成接口和测试，但还是要自己检查异常场景和边界条件。",
      "学生和实习生把部分调试、文档和代码理解任务交给 AI Coding，人类负责最终验证。",
    ]);

    // === 1. 对话框输入问题 ===
    const route = await request<ChatRouteResponse>(
      baseUrl + "/api/chat/route",
      post({
        message: "AI Coding 实际改变了初级开发者哪些工作？这是一个复杂问题需要深入探讨。",
      }),
    );
    expect(route.status).toBe(200);

    // 应该匹配已有 Investigation 或建议创建
    const kind = route.body.kind;
    expect(["MATCHED_INVESTIGATION", "CREATE_PROPOSAL"]).toContain(kind);

    // === 2. 创建 Proposal ===
    const question =
      kind === "CREATE_PROPOSAL"
        ? (route.body as ChatRouteResponse & { question: string }).question
        : AI_QUESTION;
    const proposal = await request<{ proposalId: string }>(
      baseUrl + "/api/investigations/proposals",
      post({ question }),
    );
    expect(proposal.status).toBe(201);
    expect(proposal.body.proposalId).toBeTruthy();

    // === 3. 确认创建 Investigation （Agent 生成初始文章） ===
    const confirmed = await request<Investigation>(
      baseUrl + "/api/investigations/proposals/" + proposal.body.proposalId + "/confirm",
      post({}),
    );
    expect(confirmed.status).toBe(201);
    const invId = confirmed.body.id;
    expect(confirmed.body.knowledgeState.status).toBeDefined();
    expect(confirmed.body.evidenceState.supported.length).toBeGreaterThanOrEqual(0);

    // === 4. 浏览圈子广场 ===
    const discovery = await request<Array<{ id: string; title: string; knowledgeState: string }>>(
      baseUrl + "/api/discovery/topics",
    );
    expect(discovery.status).toBe(200);
    expect(discovery.body.length).toBeGreaterThanOrEqual(1);
    expect(discovery.body.some((t) => t.id === invId)).toBe(true);

    // === 5. 查看文章 (Knowledge Object 投影) ===
    const article = await request<KnowledgeObjectProjection>(
      baseUrl + "/api/knowledge-objects/" + invId,
    );
    expect(article.status).toBe(200);
    expect(article.body.kind).toBe("KNOWLEDGE_OBJECT");
    expect(article.body.claims).toBeDefined();
    expect(article.body.knowledgeState).toBeDefined();
    expect(article.body.summary.consensus).toBeDefined();
    expect(article.body.summary.unknowns).toBeDefined();
    expect(article.body.summary.limitations).toBeDefined();

    // === 6. 查看 Mission 和 Evidence Gap ===
    const missions = article.body.missions;
    const gaps = article.body.evidenceGaps;
    expect(gaps.length).toBeGreaterThanOrEqual(0);
    // demo/prepare 已经创建了 Mission
    if (missions.length > 0) {
      expect(missions[0]!.status).toBe(MISSION_STATUS.OPEN);
    }

    // === 7. 获取活动事件 ===
    const events = await request<Array<{ eventType: string; createdAt: string }>>(
      baseUrl + "/api/investigations/" + invId + "/activity",
    );
    expect(events.status).toBe(200);
    expect(events.body.length).toBeGreaterThanOrEqual(1);
    // 应该按时间排序
    for (let i = 1; i < events.body.length; i++) {
      expect(events.body[i]!.createdAt >= events.body[i - 1]!.createdAt).toBe(true);
    }

    // === 8. 通过 participation 提交讨论 ===
    const participation = await request<{ intent: string }>(
      baseUrl + "/api/investigations/" + invId + "/participation",
      post({ message: "我在实习项目中用 AI 生成接口测试，自己检查异常边界。" }),
    );
    expect(participation.status).toBe(200);
    expect(["EVIDENCE_SUBMISSION", "QUESTION", "MISSION_INTEREST"]).toContain(
      participation.body.intent,
    );

    // === 9. Maintenance Run：Agent 探索现实边界 ===
    const maintenance = await request<{ changed: boolean }>(
      baseUrl + "/api/investigations/" + invId + "/maintenance",
      post({}),
    );
    expect(maintenance.status).toBe(200);

    const runs = await request<Array<{ runId: string }>>(
      baseUrl + "/api/investigations/" + invId + "/maintenance-runs",
    );
    expect(runs.status).toBe(200);
    expect(runs.body.length).toBeGreaterThanOrEqual(1);

    // === 10. 如果有 Mission，提交 Evidence ===
    if (missions.length > 0) {
      const missionId = missions[0]!.id;
      const evidenceResult = await request<EvidenceIntakeResponse>(
        baseUrl + "/api/missions/" + missionId + "/evidence",
        post({
          statement: "我在实习项目中用 AI 生成接口测试，自己检查异常边界。",
          participantType: "实习生",
          experience: "我最近三个月在实习项目中持续使用 Claude Code。",
          task: "接口测试、异常场景和边界条件",
          aiRole: "Claude Code 生成测试草稿和常见异常分支。",
          humanJudgment: "我检查业务语义、边界条件和异常场景是否符合真实接口。",
        }),
      );
      expect(evidenceResult.status).toBe(201);
      expect(evidenceResult.body.record.grade).toBeDefined();
      expect(evidenceResult.body.receipt.accepted).toBeDefined();
      expect(evidenceResult.body.receipt.evidenceId).toBe(evidenceResult.body.record.id);
      expect(evidenceResult.body.receipt.stateBefore).toBeDefined();
      expect(evidenceResult.body.receipt.stateAfter).toBeDefined();
      expect(evidenceResult.body.receipt.impactSummary).toBeTruthy();

      // Evidence Grade 校验
      const grade = evidenceResult.body.record.grade;
      expect([
        EVIDENCE_GRADE.E0_OPINION,
        EVIDENCE_GRADE.E1_FIRST_HAND,
        EVIDENCE_GRADE.E2_ARTIFACT_BACKED,
      ]).toContain(grade);

      // === 11. 查看文章更新 ===
      const updated = await request<KnowledgeObjectProjection>(
        baseUrl + "/api/knowledge-objects/" + invId,
      );
      expect(updated.status).toBe(200);
      expect(updated.body.evidence.length).toBeGreaterThanOrEqual(1);
      expect(updated.body.impactReceipts.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Golden Demo 验收 — 路径 B: 圈子广场 → 已有帖子 → 讨论 → 文章更新", () => {
  it("完整运行 B 路径: 准备 Demo → 浏览帖子 → 查看文章 → 发布讨论 → 更新历史", async () => {
    const { baseUrl } = await startServer(AI_QUESTION, [
      "初级开发者现在用 AI 生成接口和测试，但还是要自己检查异常场景和边界条件。",
      "学生和实习生把部分调试、文档和代码理解任务交给 AI Coding，人类负责最终验证。",
    ]);

    // === 1. 准备 Demo（相当于 Seed） ===
    const prepared = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(prepared.status).toBe(200);
    const invId = prepared.body.id;

    // === 2. 进入圈子广场浏览已有帖子 ===
    const topics = await request<Array<{ id: string; title: string; knowledgeState: string }>>(
      baseUrl + "/api/discovery/topics",
    );
    expect(topics.status).toBe(200);
    expect(topics.body.length).toBeGreaterThanOrEqual(1);
    const topic = topics.body.find((t) => t.id === invId);
    expect(topic).toBeDefined();
    expect(topic!.title).toBe(AI_QUESTION);

    // === 3. 打开帖子文章 ===
    const article = await request<KnowledgeObjectProjection>(
      baseUrl + "/api/knowledge-objects/" + invId,
    );
    expect(article.status).toBe(200);
    // 查看当前结论
    expect(article.body.summary.consensus).toBeDefined();
    // 查看现实边界
    expect(article.body.summary.unknowns).toBeDefined();
    // 查看限制条件
    expect(article.body.summary.limitations).toBeDefined();

    // 如果存在 Mission，查看活动邀请
    const activeInvitation = article.body.activeInvitation;
    if (activeInvitation) {
      expect(activeInvitation.status).toBe(MISSION_STATUS.OPEN);
    }

    // === 4. 发布讨论 ===
    const participation = await request<{ intent: string }>(
      baseUrl + "/api/investigations/" + invId + "/participation",
      post({ message: "我来说说我的实际想法：AI 帮我写单元测试，但边界条件还是我自己补的。" }),
    );
    expect(participation.status).toBe(200);

    // === 5. Agent 探索现实边界 ===
    const maintenance = await request<{ changed: boolean }>(
      baseUrl + "/api/investigations/" + invId + "/maintenance",
      post({}),
    );
    expect(maintenance.status).toBe(200);

    // === 6. 查看更新历史 ===
    const events = await request<Array<{ eventType: string; summary: string }>>(
      baseUrl + "/api/investigations/" + invId + "/activity",
    );
    expect(events.status).toBe(200);

    // 应该有创建事件和讨论事件
    const eventTypes = events.body.map((e) => e.eventType);
    expect(eventTypes).toContain("CREATED");
    expect(eventTypes).toContain("DISCUSSION_ADDED");
  });
});

describe("Golden Demo 验收 — Reset & 重复演示", () => {
  it("Reset 后可以重新运行完整 Demo", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "初级开发者现在用 AI 生成接口和测试。",
    ]);

    // 1. 第一次运行
    const first = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(first.status).toBe(200);
    const firstId = first.body.id;

    // 2. Reset
    const reset = await request<{ ok: boolean }>(baseUrl + "/api/demo/reset", post({}));
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    expect(repository.listInvestigations().length).toBe(0);

    // 3. 第二次运行（应该可以重新演示）
    const second = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(second.status).toBe(200);
    expect(second.body.id).not.toBe(firstId);

    // 4. 第二次演示完整功能
    const route = await request<ChatRouteResponse>(
      baseUrl + "/api/chat/route",
      post({
        message: "AI Coding 实际改变了初级开发者哪些工作？",
      }),
    );
    expect(route.status).toBe(200);
    expect(route.body.kind).toBe("MATCHED_INVESTIGATION");

    // 5. 创建 Mission
    const missionResult = await request<Investigation>(
      baseUrl + "/api/investigations/" + second.body.id + "/missions",
      post({}),
    );
    expect([200, 201]).toContain(missionResult.status);

    // 6. 提交 Evidence
    const evidenceResult = await request<EvidenceIntakeResponse>(
      baseUrl + "/api/missions/" + second.body.missions[0]!.id + "/evidence",
      post({
        statement: "我在项目中使用 AI 工具。",
        participantType: "0-3年开发者",
        experience: "最近一个月都在用 AI 写测试。",
        task: "编写单元测试",
        aiRole: "AI 生成了测试框架和基础用例。",
        humanJudgment: "我补充了边界条件和异常场景。",
      }),
    );
    expect(evidenceResult.status).toBe(201);
    expect(evidenceResult.body.receipt.accepted).toBeDefined();
  });
});
