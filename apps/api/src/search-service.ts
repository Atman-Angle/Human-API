import {
  SEARCH_PROVENANCE,
  SearchResponseSchema,
  type SearchResponse,
  type SourceProvider,
} from "@human-api/contracts";
import { SearchAdapterError, searchError } from "./errors.js";
import type { SearchCache } from "./cache/file-search-cache.js";
import type { SearchFixtureStore } from "./adapters/file-search-fixture-store.js";

export interface SearchAdapter {
  search(query: string, count?: number): Promise<SearchResponse>;
}

export interface SearchServiceOptions {
  adapters: Record<SourceProvider, SearchAdapter>;
  cache: SearchCache;
  fixtures: SearchFixtureStore;
  defaultCount: number;
}

export class SearchService {
  private readonly inFlight = new Map<string, Promise<SearchResponse>>();

  constructor(private readonly options: SearchServiceOptions) {}

  searchZhihu(query: string, count = this.options.defaultCount): Promise<SearchResponse> {
    return this.search("ZHIHU", query, count);
  }

  searchGlobal(query: string, count = this.options.defaultCount): Promise<SearchResponse> {
    return this.search("GLOBAL", query, count);
  }

  private search(provider: SourceProvider, query: string, count: number): Promise<SearchResponse> {
    const key = `${provider}\n${query}\n${count}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = this.searchWithFallback(provider, query, count);
    this.inFlight.set(key, request);
    void request.then(
      () => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      },
      () => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      },
    );
    return request;
  }

  private async searchWithFallback(
    provider: SourceProvider,
    query: string,
    count: number,
  ): Promise<SearchResponse> {
    try {
      const live = await this.options.adapters[provider].search(query, count);
      await this.options.cache.write(live, count);
      return SearchResponseSchema.parse({ ...live, provenance: SEARCH_PROVENANCE.LIVE });
    } catch (error) {
      const normalized =
        error instanceof SearchAdapterError
          ? error.normalized
          : searchError(
              "UPSTREAM_UNAVAILABLE",
              `${provider} search failed: ${error instanceof Error ? error.message : "unknown error"}`,
            ).normalized;

      const cached = await this.options.cache.read(provider, query, count);
      if (cached) {
        return SearchResponseSchema.parse({
          ...cached,
          provenance: SEARCH_PROVENANCE.CACHE,
          fallbackReason: normalized,
          limitations: [...cached.limitations, "当前结果来自缓存，不是本次实时调用。"],
        });
      }

      const fixture = await this.options.fixtures.get(provider, query);
      if (fixture) {
        return SearchResponseSchema.parse({
          ...fixture,
          provenance: SEARCH_PROVENANCE.GOLDEN_FIXTURE,
          fallbackReason: normalized,
          limitations: [...fixture.limitations, "当前结果来自 Golden Fixture，不是实时数据。"],
        });
      }

      throw new SearchAdapterError(normalized);
    }
  }
}
