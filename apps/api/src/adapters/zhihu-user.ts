import {
  ZhihuCreatedContentsResponseSchema,
  ZhihuFolloweesResponseSchema,
  type ZhihuCreatedContentsResponse,
  type ZhihuFolloweesResponse,
} from "@human-api/contracts";
import { searchError } from "../errors.js";
import type { Fetcher } from "./official-search.js";

const BASE_URL = "https://developer.zhihu.com";

type UserApiOptions = {
  accessSecret: string | undefined;
  baseUrl?: string;
  timeoutMs?: number;
  fetcher?: Fetcher;
};

function offsetValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  return undefined;
}

function countValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return undefined;
}

function mapPaging(raw: unknown): { isEnd: boolean; nextOffset?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const paging = raw as Record<string, unknown>;
  if (typeof paging.IsEnd !== "boolean") return null;
  const nextOffset = offsetValue(paging.NextOffset);
  return {
    isEnd: paging.IsEnd,
    ...(nextOffset ? { nextOffset } : {}),
  };
}

function upstreamError(code: unknown, message: unknown) {
  const text = typeof message === "string" && message ? message : "知乎用户接口请求失败。";
  if (code === 20001) return searchError("AUTH_REQUIRED", text, String(code));
  if (code === 30001 || code === 30002)
    return searchError("UPSTREAM_RATE_LIMIT", text, String(code));
  if (code === 10001) return searchError("UPSTREAM_INVALID_RESPONSE", text, String(code));
  return searchError("UPSTREAM_ERROR", text, typeof code === "number" ? String(code) : undefined);
}

export class OfficialUserAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: Fetcher;

  constructor(private readonly options: UserApiOptions) {
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetcher = options.fetcher ?? fetch;
  }

  listFollowees(oauthToken: string, offset = "0", limit = 20): Promise<ZhihuFolloweesResponse> {
    return this.request(
      "/api/v1/user/followees",
      oauthToken,
      offset,
      limit,
      "followees",
    ) as Promise<ZhihuFolloweesResponse>;
  }

  listContents(
    oauthToken: string,
    offset = "0",
    limit = 20,
  ): Promise<ZhihuCreatedContentsResponse> {
    return this.request(
      "/api/v1/user/contents",
      oauthToken,
      offset,
      limit,
      "contents",
    ) as Promise<ZhihuCreatedContentsResponse>;
  }

  private async request(
    path: string,
    oauthToken: string,
    offset: string,
    limit: number,
    kind: "followees" | "contents",
  ): Promise<ZhihuFolloweesResponse | ZhihuCreatedContentsResponse> {
    if (!this.options.accessSecret)
      throw searchError("AUTH_REQUIRED", "ZHIHU_ACCESS_SECRET is not configured.");
    if (!oauthToken) throw searchError("AUTH_REQUIRED", "知乎 OAuth 会话已失效，请重新登录。");
    const url = new URL(this.baseUrl + path);
    url.searchParams.set("Offset", offset || "0");
    url.searchParams.set("Limit", String(Math.min(Math.max(limit || 20, 1), 50)));
    if (kind === "contents") {
      url.searchParams.set("ContentType", "all");
      url.searchParams.set("SortField", "ts");
      url.searchParams.set("SortOrder", "desc");
    }

    let response: Response;
    try {
      response = await this.fetcher(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.options.accessSecret}`,
          "X-OAuth-Token": oauthToken,
          "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
        throw searchError("UPSTREAM_TIMEOUT", "知乎用户资料请求超时。");
      throw searchError("UPSTREAM_UNAVAILABLE", "知乎用户资料请求失败。");
    }
    if (response.status === 429)
      throw searchError("UPSTREAM_RATE_LIMIT", "知乎用户资料接口触发频率限制。", "429");
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎用户资料返回了无效 JSON。");
    }
    if (!response.ok)
      throw searchError(
        "UPSTREAM_UNAVAILABLE",
        `知乎用户资料返回 HTTP ${response.status}。`,
        String(response.status),
      );
    if (!raw || typeof raw !== "object")
      throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎用户资料响应结构无效。");
    const envelope = raw as Record<string, unknown>;
    if (envelope.Code !== 0) throw upstreamError(envelope.Code, envelope.Message);
    if (!envelope.Data || typeof envelope.Data !== "object")
      throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎用户资料缺少 Data。");
    const data = envelope.Data as Record<string, unknown>;
    const items = Array.isArray(data.Items) ? data.Items : null;
    const paging = mapPaging(data.Paging);
    if (!items || !paging)
      throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎用户资料分页结构无效。");

    if (kind === "followees") {
      const mapped = items.map((item) => {
        const value = (item ?? {}) as Record<string, unknown>;
        return {
          fullname: value.Fullname,
          urlToken: value.UrlToken,
          url: value.Url,
          ...(typeof value.AvatarUrl === "string" && value.AvatarUrl
            ? { avatarUrl: value.AvatarUrl }
            : {}),
          ...(typeof value.Headline === "string" ? { headline: value.Headline } : {}),
          ...(countValue(value.FollowerCount) !== undefined
            ? { followerCount: countValue(value.FollowerCount) }
            : {}),
        };
      });
      try {
        return ZhihuFolloweesResponseSchema.parse({ items: mapped, paging });
      } catch {
        throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎关注列表字段不符合预期。");
      }
    }

    const mapped = items.map((item) => {
      const value = (item ?? {}) as Record<string, unknown>;
      return {
        contentType: value.ContentType,
        url: value.Url,
        createdAt: countValue(value.CreatedAt),
        ...(countValue(value.LikeCount) !== undefined
          ? { likeCount: countValue(value.LikeCount) }
          : {}),
        ...(countValue(value.CommentCount) !== undefined
          ? { commentCount: countValue(value.CommentCount) }
          : {}),
        ...(countValue(value.FavoriteCount) !== undefined
          ? { favoriteCount: countValue(value.FavoriteCount) }
          : {}),
        ...(typeof value.Title === "string" ? { title: value.Title } : {}),
        ...(typeof value.Summary === "string" ? { summary: value.Summary } : {}),
      };
    });
    try {
      return ZhihuCreatedContentsResponseSchema.parse({ items: mapped, paging });
    } catch {
      throw searchError("UPSTREAM_INVALID_RESPONSE", "知乎创作列表字段不符合预期。");
    }
  }
}
