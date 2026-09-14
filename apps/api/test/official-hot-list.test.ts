import { describe, expect, it, vi } from "vitest";
import { OfficialHotListAdapter } from "../src/adapters/official-hot-list.js";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OfficialHotListAdapter", () => {
  it("maps the official response and clamps limit", async () => {
    let requested = "";
    const adapter = new OfficialHotListAdapter({
      accessSecret: "secret",
      endpoint: "https://example.test/hot",
      fetcher: async (input) => {
        requested = input;
        return response({
          Code: 0,
          Data: {
            Total: 1,
            Items: [{ Title: "热点", Url: "https://zhihu.com/q", Summary: "摘要" }],
          },
        });
      },
    });
    const result = await adapter.list(99);
    expect(new URL(requested).searchParams.get("Limit")).toBe("30");
    expect(result.items[0]?.title).toBe("热点");
    expect(result.provenance).toBe("LIVE");
  });

  it("rejects missing credentials", async () => {
    await expect(
      new OfficialHotListAdapter({ accessSecret: undefined }).list(),
    ).rejects.toMatchObject({ normalized: { code: "AUTH_REQUIRED" } });
  });

  it("normalizes rate limit and invalid payload", async () => {
    const limited = new OfficialHotListAdapter({
      accessSecret: "secret",
      fetcher: async () => response({}, 429),
    });
    await expect(limited.list()).rejects.toMatchObject({
      normalized: { code: "UPSTREAM_RATE_LIMIT" },
    });
    const invalid = new OfficialHotListAdapter({
      accessSecret: "secret",
      fetcher: async () => response({ Code: 1 }),
    });
    await expect(invalid.list()).rejects.toMatchObject({
      normalized: { code: "UPSTREAM_INVALID_RESPONSE" },
    });
  });

  it("normalizes timeout", async () => {
    const adapter = new OfficialHotListAdapter({
      accessSecret: "secret",
      fetcher: vi.fn(async () => {
        const error = new Error("timeout");
        error.name = "TimeoutError";
        throw error;
      }),
    });
    await expect(adapter.list()).rejects.toMatchObject({
      normalized: { code: "UPSTREAM_TIMEOUT" },
    });
  });
});
