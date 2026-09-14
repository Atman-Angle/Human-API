import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createRequestHandler } from "../src/app.js";
import { InMemoryInvestigationRepository } from "../src/repository.js";
import { SearchService } from "../src/search-service.js";
import { searchError } from "../src/errors.js";

describe("investigation creation failure semantics", () => {
  it("does not persist a fake investigation when both upstreams fail without fallback", async () => {
    const repository = new InMemoryInvestigationRepository();
    const failing = {
      search: async () => {
        throw searchError("UPSTREAM_TIMEOUT", "timeout");
      },
    };
    const service = new SearchService({
      adapters: { ZHIHU: failing, GLOBAL: failing },
      cache: { read: async () => undefined, write: async () => undefined },
      fixtures: { get: async () => undefined },
      defaultCount: 10,
    });
    const server = createServer(createRequestHandler({ repository, searchService: service }));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("server unavailable");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/investigations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "真实失败测试" }),
      });
      expect(response.status).toBe(504);
      expect(repository.listInvestigations()).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
