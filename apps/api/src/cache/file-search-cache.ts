import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SearchResponseSchema,
  type SearchResponse,
  type SourceProvider,
} from "@human-api/contracts";

export interface SearchCache {
  read(provider: SourceProvider, query: string, count: number): Promise<SearchResponse | undefined>;
  write(response: SearchResponse, count: number): Promise<void>;
}

function cacheKey(provider: SourceProvider, query: string, count: number): string {
  return createHash("sha256").update(`${provider}\n${query}\n${count}`).digest("hex");
}

export class FileSearchCache implements SearchCache {
  constructor(private readonly directory: string) {}

  private pathFor(provider: SourceProvider, query: string, count: number): string {
    return join(this.directory, `${cacheKey(provider, query, count)}.json`);
  }

  async read(
    provider: SourceProvider,
    query: string,
    count: number,
  ): Promise<SearchResponse | undefined> {
    try {
      const raw = await readFile(this.pathFor(provider, query, count), "utf8");
      const parsed = SearchResponseSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  async write(response: SearchResponse, count: number): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(
      this.pathFor(response.provider, response.query, count),
      `${JSON.stringify(response, null, 2)}\n`,
      "utf8",
    );
  }
}
