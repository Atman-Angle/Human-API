import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestHandler } from "../src/app.js";
import {
  FakeDiscussionOrganizer,
  FallbackDiscussionOrganizer,
  LLMAdapterError,
  OpenAICompatibleDiscussionOrganizer,
} from "../src/llm/discussion-organizer.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import type { SearchService } from "../src/search-service.js";

const searchService = {} as SearchService;
const input = {
  id: "discussion-1",
  investigationId: "inv-1",
  content: "I used an AI coding tool.",
  createdAt: "2026-09-13T00:00:00.000Z",
  source: "test",
};

describe("discussion organization", () => {
  it("returns schema-valid deterministic fake output", async () => {
    const organizer = new FakeDiscussionOrganizer();
    const result = await organizer.organize(input);
    expect(result.run.provenance).toBe("GOLDEN_FIXTURE");
    expect(result.organization.discussionId).toBe(input.id);
  });
  it("exposes the HTTP organization endpoint", async () => {
    const handler = createRequestHandler({
      repository: new InMemoryInvestigationRepository(),
      searchService,
      discussionOrganizer: new FakeDiscussionOrganizer(),
    });
    const response = await new Promise<Response>((resolve) => {
      const server = createServer(handler);
      server.listen(0, async () => {
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        const r = await fetch(`http://127.0.0.1:${port}/api/discussions/organize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        server.close();
        resolve(r);
      });
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.run.provenance).toBe("GOLDEN_FIXTURE");
  });
  it("falls back to fixture with explicit provenance", async () => {
    const live = {
      organize: async () => {
        throw new LLMAdapterError("LLM_TIMEOUT", "timeout");
      },
    };
    const result = await new FallbackDiscussionOrganizer(
      live,
      new FakeDiscussionOrganizer(),
    ).organize(input);
    expect(result.run.provenance).toBe("GOLDEN_FIXTURE");
    expect(result.run.status).toBe("FALLBACK");
    expect(result.run.fallbackReason).toContain("timeout");
  });
});
it("does not reuse cached organization across discussion ids", async () => {
  let fail = false;
  const live = {
    organize: async (value: typeof input) => {
      if (fail) throw new LLMAdapterError("LLM_TIMEOUT", "timeout");
      return await new FakeDiscussionOrganizer((current) => ({
        discussionId: current.id,
        relations: [],
        classifications: [],
        claims: [],
        gaps: [],
        limitations: [],
      })).organize(value);
    },
  };
  const organizer = new FallbackDiscussionOrganizer(live, new FakeDiscussionOrganizer());
  await organizer.organize(input);
  fail = true;
  const result = await organizer.organize({ ...input, id: "discussion-2" });
  expect(result.run.provenance).toBe("GOLDEN_FIXTURE");
  expect(result.organization.discussionId).toBe("discussion-2");
});
it("uses CACHE provenance after a live result is cached", async () => {
  let fail = false;
  const live = {
    organize: async () => {
      if (fail) throw new LLMAdapterError("LLM_TIMEOUT", "timeout");
      return await new FakeDiscussionOrganizer().organize(input);
    },
  };
  const organizer = new FallbackDiscussionOrganizer(live, new FakeDiscussionOrganizer());
  await organizer.organize(input);
  fail = true;
  const result = await organizer.organize(input);
  expect(result.run.provenance).toBe("CACHE");
  expect(result.run.status).toBe("FALLBACK");
});

afterEach(() => vi.unstubAllGlobals());

it.each([
  [401, "LLM_AUTH_REQUIRED"],
  [403, "LLM_AUTH_REQUIRED"],
  [429, "LLM_RATE_LIMIT"],
  [503, "LLM_UPSTREAM_UNAVAILABLE"],
])("maps upstream HTTP %s without exposing its body", async (status, code) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("private upstream body", { status: Number(status) })),
  );
  const adapter = new OpenAICompatibleDiscussionOrganizer({
    apiKey: "test-only",
    baseUrl: "https://example.test",
    model: "test",
  });
  await expect(adapter.organize(input)).rejects.toMatchObject({ code });
});

it.each([
  "not-json",
  JSON.stringify({ discussionId: input.id, classifications: [{ label: "INVALID" }] }),
])("rejects malformed structured output", async (content) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content } }] })),
  );
  const adapter = new OpenAICompatibleDiscussionOrganizer({
    apiKey: "test-only",
    baseUrl: "https://example.test",
    model: "test",
  });
  await expect(adapter.organize(input)).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
});

it("rejects relations and gaps that reference unknown claims", async () => {
  const content = JSON.stringify({
    discussionId: input.id,
    classifications: [],
    claims: [],
    gaps: [],
    relations: [{ claimId: "missing", relation: "SUPPORTS", rationale: "bad ref" }],
    limitations: [],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content } }] })),
  );
  const adapter = new OpenAICompatibleDiscussionOrganizer({
    apiKey: "test-only",
    baseUrl: "https://example.test",
    model: "test",
  });
  await expect(adapter.organize(input)).rejects.toMatchObject({ code: "LLM_INVALID_RESPONSE" });
});
