import "./env.js";
import { createServer, type RequestListener } from "node:http";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SOURCE_PROVIDER } from "@human-api/contracts";
import { OfficialSearchAdapter } from "./adapters/official-search.js";
import { OfficialHotListAdapter } from "./adapters/official-hot-list.js";
import { FileSearchFixtureStore } from "./adapters/file-search-fixture-store.js";
import { createRequestHandler, type AppDependencies } from "./app.js";
import { FileSearchCache } from "./cache/file-search-cache.js";
import { JsonInvestigationRepository, SqliteInvestigationRepository } from "./repository.js";
import { SearchService } from "./search-service.js";
import { ZhihuCommunityAdapter } from "./adapters/zhihu-community.js";
import { OfficialUserAdapter } from "./adapters/zhihu-user.js";
import {
  createAuthSession,
  createOAuthState,
  consumeLatestOAuthState,
  consumeOAuthState,
  deleteAuthSession,
  getAuthAccessToken,
  getAuthSession,
} from "./zhihu-state-store.js";
import {
  FakeDiscussionOrganizer,
  FallbackDiscussionOrganizer,
  OpenAICompatibleDiscussionOrganizer,
} from "./llm/discussion-organizer.js";

export type PersistenceMode = "sqlite" | "json";

export interface RuntimeOptions {
  accessSecret?: string | undefined;
  cacheDirectory?: string;
  fixturePath?: string;
  dataPath?: string;
  storage?: PersistenceMode;
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
  const configuredDataPath =
    options.dataPath ?? process.env.INVESTIGATION_DB_PATH ?? process.env.INVESTIGATION_DATA_PATH;
  const configuredStorage = process.env.INVESTIGATION_STORAGE;
  const storage =
    options.storage ??
    (configuredStorage === "json" || configuredStorage === "sqlite"
      ? configuredStorage
      : undefined) ??
    (configuredDataPath?.toLowerCase().endsWith(".json") ? "json" : "sqlite");
  const dataPath =
    configuredDataPath ??
    resolve(
      process.cwd(),
      storage === "json" ? ".data/investigations.json" : ".data/investigations.sqlite",
    );
  const repository =
    storage === "json"
      ? new JsonInvestigationRepository(dataPath)
      : new SqliteInvestigationRepository(
          dataPath,
          configuredDataPath
            ? {}
            : { legacyJsonPath: resolve(dirname(dataPath), "investigations.json") },
        );

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

  const community =
    process.env.ZHIHU_APP_KEY && process.env.ZHIHU_APP_SECRET
      ? new ZhihuCommunityAdapter(process.env.ZHIHU_APP_KEY, process.env.ZHIHU_APP_SECRET)
      : undefined;

  const oauthAppId = process.env.ZHIHU_APP_ID ?? "";
  const oauthAppKey = process.env.ZHIHU_APP_KEY ?? "";
  const oauthRedirectUri =
    process.env.ZHIHU_REDIRECT_URI ?? "http://localhost:3001/auth/zhihu/callback";

  const deps: AppDependencies = {
    oauth: { appId: oauthAppId, appKey: oauthAppKey, redirectUri: oauthRedirectUri },
    oauthStateStore: {
      create: createOAuthState,
      consume: consumeOAuthState,
      consumeLatest: consumeLatestOAuthState,
    },
    authSessionStore: {
      create: createAuthSession,
      get: getAuthSession,
      delete: deleteAuthSession,
      getAccessToken: getAuthAccessToken,
    },
    repository,
    searchService,
    hotList: new OfficialHotListAdapter({ accessSecret, timeoutMs }),
    userApi: new OfficialUserAdapter({ accessSecret, timeoutMs }),
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

  if (community) deps.community = community;
  const dependencies = deps;
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
      `API listening on http://localhost:${port} (zhihu-auth=${Boolean(process.env.ZHIHU_ACCESS_SECRET)})
`,
    );
  });
}
