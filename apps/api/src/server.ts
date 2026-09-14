import { createServer, type RequestListener } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SOURCE_PROVIDER } from "@human-api/contracts";
import { OfficialSearchAdapter } from "./adapters/official-search.js";
import { FileSearchFixtureStore } from "./adapters/file-search-fixture-store.js";
import { createRequestHandler, type AppDependencies } from "./app.js";
import { FileSearchCache } from "./cache/file-search-cache.js";
import { InMemoryInvestigationRepository } from "./repository.js";
import { SearchService } from "./search-service.js";
import {
  FakeDiscussionOrganizer,
  FallbackDiscussionOrganizer,
  OpenAICompatibleDiscussionOrganizer,
} from "./llm/discussion-organizer.js";

export interface RuntimeOptions {
  accessSecret?: string | undefined;
  cacheDirectory?: string;
  fixturePath?: string;
  timeoutMs?: number;
}

export interface Runtime {
  handler: RequestListener;
  dependencies: AppDependencies;
}

export function createRuntime(options: RuntimeOptions = {}): Runtime {
  const accessSecret = options.accessSecret ?? process.env.ZHIHU_ACCESS_SECRET;
  const cacheDirectory = options.cacheDirectory ?? resolve(process.cwd(), ".cache/search");
  const fixturePath =
    options.fixturePath ?? resolve(process.cwd(), "fixtures/golden-case/search-fixture.json");
  const timeoutMs = options.timeoutMs ?? 8_000;

  const zhihu = new OfficialSearchAdapter({
    provider: SOURCE_PROVIDER.ZHIHU,
    endpoint: "https://developer.zhihu.com/api/v1/content/zhihu_search",
    accessSecret,
    timeoutMs,
  });
  const global = new OfficialSearchAdapter({
    provider: SOURCE_PROVIDER.GLOBAL,
    endpoint: "https://developer.zhihu.com/api/v1/content/global_search",
    accessSecret,
    timeoutMs,
  });

  const searchService = new SearchService({
    adapters: { ZHIHU: zhihu, GLOBAL: global },
    cache: new FileSearchCache(cacheDirectory),
    fixtures: new FileSearchFixtureStore(fixturePath),
    defaultCount: 10,
  });

  const dependencies: AppDependencies = {
    repository: new InMemoryInvestigationRepository(),
    searchService,
    discussionOrganizer: new FallbackDiscussionOrganizer(
      new OpenAICompatibleDiscussionOrganizer({
        ...(process.env.LLM_API_KEY ? { apiKey: process.env.LLM_API_KEY } : {}),
        ...(process.env.LLM_BASE_URL ? { baseUrl: process.env.LLM_BASE_URL } : {}),
        ...(process.env.LLM_MODEL ? { model: process.env.LLM_MODEL } : {}),
        timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 30000),
      }),
      new FakeDiscussionOrganizer(),
    ),
  };

  return { handler: createRequestHandler(dependencies), dependencies };
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isMain) {
  const runtime = createRuntime();
  const port = Number(process.env.PORT ?? 3000);
  const server = createServer(runtime.handler);
  server.listen(port, () => {
    process.stdout.write(
      `API listening on http://localhost:${port} (zhihu-auth=${Boolean(process.env.ZHIHU_ACCESS_SECRET)})\n`,
    );
  });
}
