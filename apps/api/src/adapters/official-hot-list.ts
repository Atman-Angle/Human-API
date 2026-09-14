import {
  HotListResponseSchema,
  SEARCH_PROVENANCE,
  type HotListResponse,
} from "@human-api/contracts";
import { searchError } from "../errors.js";
import type { Fetcher } from "./official-search.js";

export class OfficialHotListAdapter {
  constructor(
    private readonly options: {
      accessSecret: string | undefined;
      endpoint?: string;
      timeoutMs?: number;
      fetcher?: Fetcher;
    },
  ) {}
  async list(limit = 10): Promise<HotListResponse> {
    if (!this.options.accessSecret)
      throw searchError("AUTH_REQUIRED", "ZHIHU_ACCESS_SECRET is not configured.");
    const url = new URL(
      this.options.endpoint ?? "https://developer.zhihu.com/api/v1/content/hot_list",
    );
    url.searchParams.set("Limit", String(Math.min(Math.max(limit, 1), 30)));
    let response: Response;
    try {
      response = await (this.options.fetcher ?? fetch)(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.options.accessSecret}`,
          "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 8000),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
        throw searchError("UPSTREAM_TIMEOUT", "Zhihu hot list timed out.");
      throw searchError("UPSTREAM_UNAVAILABLE", "Zhihu hot list request failed.");
    }
    if (response.status === 429)
      throw searchError("UPSTREAM_RATE_LIMIT", "Zhihu hot list rate limited.", "429");
    if (!response.ok)
      throw searchError(
        "UPSTREAM_UNAVAILABLE",
        `Zhihu hot list returned HTTP ${response.status}.`,
        String(response.status),
      );
    const raw = (await response.json().catch(() => null)) as {
      Code?: number;
      Data?: {
        Total?: number;
        Items?: Array<{ Title?: string; Url?: string; ThumbnailUrl?: string; Summary?: string }>;
      };
    } | null;
    if (!raw || raw.Code !== 0 || !raw.Data || !Array.isArray(raw.Data.Items))
      throw searchError("UPSTREAM_INVALID_RESPONSE", "Zhihu hot list response is invalid.");
    return HotListResponseSchema.parse({
      items: raw.Data.Items.map((item) => ({
        title: item.Title,
        url: item.Url,
        thumbnailUrl: item.ThumbnailUrl ?? "",
        summary: item.Summary ?? "",
      })),
      total: raw.Data.Total ?? raw.Data.Items.length,
      provenance: SEARCH_PROVENANCE.LIVE,
      retrievedAt: new Date().toISOString(),
      limitations: ["热榜反映讨论热度，不代表证据质量。"],
    });
  }
}
