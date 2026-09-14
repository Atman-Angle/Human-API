import { createServer, type Server } from "node:http";
import {
  SEARCH_PROVENANCE,
  SOURCE_PROVIDER,
  type Investigation,
  type SearchResponse,
} from "@human-api/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import { SearchService, type SearchAdapter } from "../src/search-service.js";
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

describe("Demo reset", () => {
  it("clears all investigations and proposals", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "真实开发经历与人工检查业务逻辑。",
    ]);
    const post = (body: unknown): RequestInit => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Create investigation
    const created = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(created.status).toBe(200);
    expect(repository.listInvestigations().length).toBe(1);

    // Create proposal
    const proposal = await request<{ proposalId: string }>(
      baseUrl + "/api/investigations/proposals",
      post({ question: "测试问题" }),
    );
    expect(proposal.status).toBe(201);
    expect(repository.getProposal(proposal.body.proposalId)).toBeDefined();

    // Reset
    const reset = await request<{ ok: boolean }>(baseUrl + "/api/demo/reset", post({}));
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);

    // Verify cleared
    expect(repository.listInvestigations().length).toBe(0);
    expect(repository.getProposal(proposal.body.proposalId)).toBeUndefined();

    // Can recreate
    const recreated = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(recreated.status).toBe(200);
    expect(repository.listInvestigations().length).toBe(1);
    expect(recreated.body.id).not.toBe(created.body.id);
  });

  it("allows full demo loop after reset", async () => {
    const { baseUrl, repository } = await startServer(AI_QUESTION, [
      "真实开发经历与人工检查业务逻辑。",
    ]);
    const post = (body: unknown): RequestInit => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Prepare demo
    const prepared = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(prepared.status).toBe(200);
    const firstId = prepared.body.id;

    // Reset
    await request(baseUrl + "/api/demo/reset", post({}));

    // Run demo again
    const second = await request<Investigation>(baseUrl + "/api/demo/prepare", post({}));
    expect(second.status).toBe(200);
    expect(second.body.id).not.toBe(firstId);
    expect(repository.listInvestigations().length).toBe(1);

    // Create mission
    const missionResult = await request<Investigation>(
      baseUrl + "/api/investigations/" + second.body.id + "/missions",
      post({}),
    );
    expect([200, 201]).toContain(missionResult.status);
    expect(missionResult.body.missions.length).toBe(1);

    // Discovery works after reset
    const discovery = await request<unknown[]>(baseUrl + "/api/discovery/topics");
    expect(discovery.status).toBe(200);
    expect(discovery.body.length).toBe(1);
  });
});
