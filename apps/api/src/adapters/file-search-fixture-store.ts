import { readFile } from "node:fs/promises";
import {
  SearchResponseSchema,
  type SearchResponse,
  type SourceProvider,
} from "@human-api/contracts";
import { z } from "zod";

const GoldenFixtureSchema = z.object({
  query: z.string().min(1),
  zhihu: SearchResponseSchema,
  global: SearchResponseSchema,
});

export interface SearchFixtureStore {
  get(provider: SourceProvider, query: string): Promise<SearchResponse | undefined>;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export class FileSearchFixtureStore implements SearchFixtureStore {
  private loaded?: z.infer<typeof GoldenFixtureSchema>;

  constructor(private readonly fixturePath: string) {}

  async get(provider: SourceProvider, query: string): Promise<SearchResponse | undefined> {
    if (!this.loaded) {
      try {
        const raw = await readFile(this.fixturePath, "utf8");
        const parsed = GoldenFixtureSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return undefined;
        this.loaded = parsed.data;
      } catch {
        return undefined;
      }
    }

    if (normalize(this.loaded.query) !== normalize(query)) return undefined;
    return provider === "ZHIHU" ? this.loaded.zhihu : this.loaded.global;
  }
}
