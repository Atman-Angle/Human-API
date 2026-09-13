import {
  SEARCH_PROVENANCE,
  SearchResponseSchema,
  type SearchResponse,
  type SourceProvider,
  type SourceRef,
} from "@human-api/contracts";
import { z } from "zod";
import { searchError } from "../errors.js";

const OfficialEnvelopeSchema = z.object({
  Code: z.number(),
  Message: z.string(),
  Data: z.unknown(),
});

const OfficialDataSchema = z.object({
  HasMore: z.boolean(),
  SearchHashId: z.string().optional(),
  Items: z.array(z.unknown()),
});

const OfficialItemSchema = z.object({
  Title: z.string(),
  ContentType: z.string(),
  ContentID: z.string(),
  ContentText: z.string(),
  Url: z.string().url(),
  CommentCount: z.number().int().nonnegative(),
  VoteUpCount: z.number().int().nonnegative(),
  AuthorName: z.string(),
  EditTime: z.number().int().nonnegative(),
  AuthorityLevel: z.string().optional(),
});

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export interface OfficialSearchAdapterOptions {
  provider: SourceProvider;
  endpoint: string;
  accessSecret: string | undefined;
  timeoutMs?: number;
  fetcher?: Fetcher;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function mapItem(provider: SourceProvider, item: z.infer<typeof OfficialItemSchema>): SourceRef {
  return {
    id: `${provider.toLowerCase()}:${item.ContentID}`,
    provider,
    contentId: item.ContentID,
    contentType: item.ContentType.trim() || "UNKNOWN",
    title: item.Title.trim() || "未命名内容",
    url: item.Url,
    authorName: item.AuthorName,
    excerpt: stripHtml(item.ContentText),
    publishedAt: new Date(item.EditTime * 1000).toISOString(),
    ...(item.AuthorityLevel ? { authorityLevel: item.AuthorityLevel } : {}),
    voteUpCount: item.VoteUpCount,
    commentCount: item.CommentCount,
  };
}

function mapUpstreamCode(code: number, message: string) {
  if (code === 20001) return searchError("AUTH_REQUIRED", message, String(code));
  if (code === 30001) return searchError("UPSTREAM_RATE_LIMIT", message, String(code));
  if (code === 10001) return searchError("UPSTREAM_INVALID_RESPONSE", message, String(code));
  return searchError("UPSTREAM_ERROR", message, String(code));
}

export class OfficialSearchAdapter {
  private readonly timeoutMs: number;
  private readonly fetcher: Fetcher;

  constructor(private readonly options: OfficialSearchAdapterOptions) {
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetcher = options.fetcher ?? fetch;
  }

  async search(query: string, count = 10): Promise<SearchResponse> {
    if (!this.options.accessSecret) {
      throw searchError("AUTH_REQUIRED", "ZHIHU_ACCESS_SECRET is not configured.");
    }
    if (!query.trim()) {
      throw searchError("UPSTREAM_INVALID_RESPONSE", "Search query cannot be empty.");
    }

    const safeCount =
      this.options.provider === "ZHIHU"
        ? Math.min(Math.max(count, 1), 10)
        : Math.min(Math.max(count, 1), 20);
    const url = new URL(this.options.endpoint);
    url.searchParams.set("Query", query);
    url.searchParams.set("Count", String(safeCount));

    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.options.accessSecret}`,
          "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw searchError("UPSTREAM_TIMEOUT", `${this.options.provider} search timed out.`);
      }
      throw searchError("UPSTREAM_UNAVAILABLE", `${this.options.provider} search request failed.`);
    }

    if (response.status === 429) {
      throw searchError(
        "UPSTREAM_RATE_LIMIT",
        `${this.options.provider} search rate limited.`,
        "429",
      );
    }
    if (!response.ok) {
      throw searchError(
        "UPSTREAM_UNAVAILABLE",
        `${this.options.provider} search returned HTTP ${response.status}.`,
        String(response.status),
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw searchError(
        "UPSTREAM_INVALID_RESPONSE",
        `${this.options.provider} search returned invalid JSON.`,
      );
    }

    const envelope = OfficialEnvelopeSchema.safeParse(raw);
    if (!envelope.success) {
      throw searchError(
        "UPSTREAM_INVALID_RESPONSE",
        `${this.options.provider} search envelope is invalid.`,
      );
    }
    if (envelope.data.Code !== 0) {
      throw mapUpstreamCode(envelope.data.Code, envelope.data.Message);
    }

    const data = OfficialDataSchema.safeParse(envelope.data.Data);
    if (!data.success) {
      throw searchError(
        "UPSTREAM_INVALID_RESPONSE",
        `${this.options.provider} search data is invalid.`,
      );
    }

    const items: SourceRef[] = [];
    for (const candidate of data.data.Items) {
      const parsed = OfficialItemSchema.safeParse(candidate);
      if (!parsed.success) {
        throw searchError(
          "UPSTREAM_INVALID_RESPONSE",
          `${this.options.provider} search item is invalid.`,
        );
      }
      items.push(mapItem(this.options.provider, parsed.data));
    }

    return SearchResponseSchema.parse({
      query,
      provider: this.options.provider,
      provenance: SEARCH_PROVENANCE.LIVE,
      items,
      hasMore: data.data.HasMore,
      retrievedAt: new Date().toISOString(),
      ...(data.data.SearchHashId ? { searchHashId: data.data.SearchHashId } : {}),
      limitations:
        this.options.provider === "ZHIHU"
          ? ["知乎搜索当前固定 HasMore=false，单页最多 10 条，不能视为穷尽检索。"]
          : ["全网搜索仅取当前单页结果，不能视为穷尽检索。"],
    });
  }
}
