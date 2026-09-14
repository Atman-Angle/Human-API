import { describe, expect, it } from "vitest";
import { OfficialUserAdapter } from "../src/adapters/zhihu-user.js";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OfficialUserAdapter", () => {
  it("sends app and user credentials and maps paged followees", async () => {
    let requestedUrl = "";
    let requestedHeaders: HeadersInit | undefined;
    const adapter = new OfficialUserAdapter({
      accessSecret: "app-access-secret",
      baseUrl: "https://example.test",
      fetcher: async (input, init) => {
        requestedUrl = input;
        requestedHeaders = init?.headers;
        return response({
          Code: 0,
          Data: {
            Items: [
              {
                Fullname: "知乎用户",
                UrlToken: "zhihu-user",
                Url: "https://www.zhihu.com/people/zhihu-user",
                AvatarUrl: "https://example.test/avatar.png",
                Headline: "关注的问题",
                FollowerCount: "12",
              },
            ],
            Paging: { IsEnd: false, NextOffset: "20" },
          },
        });
      },
    });

    const result = await adapter.listFollowees("user-oauth-token", "0", 20);
    const headers = new Headers(requestedHeaders);

    expect(new URL(requestedUrl).pathname).toBe("/api/v1/user/followees");
    expect(new URL(requestedUrl).searchParams.get("Offset")).toBe("0");
    expect(new URL(requestedUrl).searchParams.get("Limit")).toBe("20");
    expect(headers.get("Authorization")).toBe("Bearer app-access-secret");
    expect(headers.get("X-OAuth-Token")).toBe("user-oauth-token");
    expect(result.items[0]).toMatchObject({
      fullname: "知乎用户",
      urlToken: "zhihu-user",
      followerCount: 12,
    });
    expect(result.paging).toEqual({ isEnd: false, nextOffset: "20" });
  });

  it("maps created contents and clamps page size", async () => {
    let requestedUrl = "";
    const adapter = new OfficialUserAdapter({
      accessSecret: "secret",
      baseUrl: "https://example.test",
      fetcher: async (input) => {
        requestedUrl = input;
        return response({
          Code: 0,
          Data: {
            Items: [
              {
                ContentType: "answer",
                Url: "https://www.zhihu.com/question/1/answer/2",
                CreatedAt: 1700000000,
                LikeCount: 3,
                CommentCount: 4,
                Title: "一次创作",
                Summary: "内容摘要",
              },
            ],
            Paging: { IsEnd: true },
          },
        });
      },
    });

    const result = await adapter.listContents("oauth", "50", 999);
    const url = new URL(requestedUrl);

    expect(url.pathname).toBe("/api/v1/user/contents");
    expect(url.searchParams.get("Limit")).toBe("50");
    expect(url.searchParams.get("ContentType")).toBe("all");
    expect(result.items[0]).toMatchObject({ contentType: "answer", createdAt: 1700000000 });
    expect(result.paging).toEqual({ isEnd: true });
  });

  it("returns AUTH_REQUIRED when the app secret is absent", async () => {
    const adapter = new OfficialUserAdapter({ accessSecret: undefined });
    await expect(adapter.listFollowees("oauth")).rejects.toMatchObject({
      normalized: { code: "AUTH_REQUIRED" },
    });
  });
});
