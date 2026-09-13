import { SEARCH_PROVENANCE, SOURCE_PROVIDER, type SearchResponse } from "@human-api/contracts";
import { describe, expect, it } from "vitest";
import type { SearchCache } from "../src/cache/file-search-cache.js";
import { SearchAdapterError, searchError } from "../src/errors.js";
import { SearchService, type SearchAdapter } from "../src/search-service.js";
import type { SearchFixtureStore } from "../src/adapters/file-search-fixture-store.js";

const NOW = "2026-09-13T00:00:00.000Z";
const QUERY = "AI Coding 实际改变了初级开发者哪些工作？";

function response(provenance = SEARCH_PROVENANCE.LIVE): SearchResponse {
  return {
    query: QUERY,
    provider: SOURCE_PROVIDER.ZHIHU,
    provenance,
    items: [],
    hasMore: false,
    retrievedAt: NOW,
    limitations: [],
  };
}

class MemoryCache implements SearchCache {
  constructor(private readonly value?: SearchResponse) {}

  async read(): Promise<SearchResponse | undefined> {
    return this.value;
  }

  async write(): Promise<void> {}
}

class FailingAdapter implements SearchAdapter {
  async search(): Promise<SearchResponse> {
    throw searchError("UPSTREAM_TIMEOUT", "upstream timed out");
  }
}

class CountingAdapter implements SearchAdapter {
  calls = 0;

  async search(): Promise<SearchResponse> {
    this.calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return response();
  }
}

const emptyFixtures: SearchFixtureStore = {
  get: async () => undefined,
};

describe("SearchService fallback", () => {
  it("uses CACHE after a live failure without labeling it LIVE", async () => {
    const service = new SearchService({
      adapters: { ZHIHU: new FailingAdapter(), GLOBAL: new FailingAdapter() },
      cache: new MemoryCache(response(SEARCH_PROVENANCE.LIVE)),
      fixtures: emptyFixtures,
      defaultCount: 10,
    });

    const result = await service.searchZhihu(QUERY);
    expect(result.provenance).toBe(SEARCH_PROVENANCE.CACHE);
    expect(result.fallbackReason?.code).toBe("UPSTREAM_TIMEOUT");
  });

  it("uses GOLDEN_FIXTURE only when no cache exists", async () => {
    const service = new SearchService({
      adapters: { ZHIHU: new FailingAdapter(), GLOBAL: new FailingAdapter() },
      cache: new MemoryCache(),
      fixtures: { get: async () => response() },
      defaultCount: 10,
    });

    const result = await service.searchZhihu(QUERY);
    expect(result.provenance).toBe(SEARCH_PROVENANCE.GOLDEN_FIXTURE);
    expect(result.fallbackReason?.code).toBe("UPSTREAM_TIMEOUT");
  });

  it("deduplicates concurrent identical requests", async () => {
    const adapter = new CountingAdapter();
    const service = new SearchService({
      adapters: { ZHIHU: adapter, GLOBAL: new CountingAdapter() },
      cache: new MemoryCache(),
      fixtures: emptyFixtures,
      defaultCount: 10,
    });

    await Promise.all([service.searchZhihu(QUERY), service.searchZhihu(QUERY)]);
    expect(adapter.calls).toBe(1);
  });

  it("keeps the normalized error when neither cache nor fixture is available", async () => {
    const service = new SearchService({
      adapters: { ZHIHU: new FailingAdapter(), GLOBAL: new FailingAdapter() },
      cache: new MemoryCache(),
      fixtures: emptyFixtures,
      defaultCount: 10,
    });

    await expect(service.searchZhihu(QUERY)).rejects.toBeInstanceOf(SearchAdapterError);
  });
});
