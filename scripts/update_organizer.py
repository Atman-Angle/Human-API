import re

with open("apps/api/src/llm/discussion-organizer.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add SourceRef import
content = content.replace(
    'type LLMRun,\n} from "@human-api/contracts";',
    'type LLMRun,\n  type SourceRef,\n} from "@human-api/contracts";'
)

# 2. Add summarizeSources to interface
content = content.replace(
    "export interface DiscussionOrganizer {\n  organize(input: DiscussionInput): Promise<{ organization: DiscussionOrganization; run: LLMRun }>;\n  answerQuestion?(",
    "export interface DiscussionOrganizer {\n  organize(input: DiscussionInput): Promise<{ organization: DiscussionOrganization; run: LLMRun }>;\n  summarizeSources(question: string, sources: SourceRef[]): Promise<{ summaries: Record<string, string>; run: LLMRun }>;\n  answerQuestion?("
)

openai_method = """  }

  async summarizeSources(
    question: string,
    sources: SourceRef[],
  ): Promise<{ summaries: Record<string, string>; run: LLMRun }> {
    if (!this.options.apiKey || !this.options.baseUrl)
      throw new LLMAdapterError("LLM_AUTH_REQUIRED", "LLM credentials are not configured.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 60000);
    try {
      const sourceList = sources.map((s) =>
        JSON.stringify({ id: s.id, title: s.title, excerpt: s.excerpt, authorName: s.authorName }),
      );
      const response = await fetch(`${this.options.baseUrl.replace(/\\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model ?? "",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `你是一名调查研究专家。针对研究问题，为每个来源生成一篇独立的、LLM 阅读理解后的精炼摘要。

要求：
1. 对每一个来源，基于其原始内容和标题，写一段 100-200 字的中文精炼摘要
2. 紧扣研究问题来组织，突出该来源的核心观点和发现
3. 用第三人称、书面语，信息密度高
4. 不要重复原文摘录，而是总结、提炼和重组
5. 返回 JSON，key 为来源 id，value 为该来源的精炼摘要
6. 如果来源与问题无关，value 写"该来源与当前研究问题无直接关联"`,
            },
            {
              role: "user",
              content: JSON.stringify({
                question,
                sources: sourceList,
              }),
            },
          ],
        }),
      });
      if (response.status === 401 || response.status === 403)
        throw new LLMAdapterError("LLM_AUTH_REQUIRED", "LLM authentication rejected.");
      if (response.status === 429)
        throw new LLMAdapterError("LLM_RATE_LIMIT", "LLM rate limit reached.");
      if (!response.ok)
        throw new LLMAdapterError(
          "LLM_UPSTREAM_UNAVAILABLE",
          `LLM upstream returned ${response.status}.`,
        );
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const c = body.choices?.[0]?.message?.content;
      if (!c)
        throw new LLMAdapterError("LLM_INVALID_RESPONSE", "LLM response did not contain content.");
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(c);
      } catch {
        throw new LLMAdapterError("LLM_INVALID_RESPONSE", "LLM output is not valid JSON.");
      }
      if (typeof parsed !== "object" || parsed === null)
        throw new LLMAdapterError("LLM_INVALID_RESPONSE", "LLM output is not a JSON object.");
      for (const src of sources) {
        if (typeof parsed[src.id] !== "string") {
          parsed[src.id] = src.excerpt;
        }
      }
      const run: LLMRun = {
        runId: randomUUID(),
        agentAction: "SUMMARIZE_SOURCES",
        inputRefs: sources.map((s) => s.id),
        model: this.options.model ?? "",
        provenance: "LIVE",
        status: "SUCCEEDED",
        structuredOutput: parsed,
        limitations: [],
        createdAt: new Date().toISOString(),
      };
      return { summaries: parsed, run };
    } catch (error) {
      if (error instanceof LLMAdapterError) throw error;
      if ((error as Error).name === "AbortError")
        throw new LLMAdapterError("LLM_TIMEOUT", "LLM request timed out.");
      throw new LLMAdapterError("LLM_UPSTREAM_UNAVAILABLE", "LLM upstream unavailable.");
    } finally {
      clearTimeout(timer);
    }
  }
"""

content = content.replace(
    "}\n\nexport class FakeDiscussionOrganizer",
    openai_method + "export class FakeDiscussionOrganizer"
)

fake_method = """  }

  async summarizeSources(
    question: string,
    sources: SourceRef[],
  ): Promise<{ summaries: Record<string, string>; run: LLMRun }> {
    const summaries: Record<string, string> = {};
    for (const src of sources) {
      summaries[src.id] = src.excerpt;
    }
    return {
      summaries,
      run: {
        runId: randomUUID(),
        agentAction: "SUMMARIZE_SOURCES",
        inputRefs: sources.map((s) => s.id),
        model: "fake-deterministic",
        provenance: "GOLDEN_FIXTURE",
        status: "SUCCEEDED",
        structuredOutput: summaries,
        limitations: [],
        createdAt: new Date().toISOString(),
      },
    };
  }
"""

content = content.replace(
    "}\n\nexport class FallbackDiscussionOrganizer",
    fake_method + "export class FallbackDiscussionOrganizer"
)

fallback_method = """  }

  async summarizeSources(
    question: string,
    sources: SourceRef[],
  ): Promise<{ summaries: Record<string, string>; run: LLMRun }> {
    try {
      if (!this.live.summarizeSources)
        throw new LLMAdapterError("LLM_UPSTREAM_UNAVAILABLE", "Live summarization is unavailable.");
      const result = await this.live.summarizeSources(question, sources);
      const key = `${question}:${sources.map((s) => s.id).join(",")}`;
      this.cache.set(key, { organization: null as never, run: result.run });
      return result;
    } catch (error) {
      const key = `${question}:${sources.map((s) => s.id).join(",")}`;
      const cached = this.cache.get(key);
      if (cached) {
        const summaries = cached.organization as never as Record<string, string>;
        return {
          summaries,
          run: {
            ...cached.run,
            provenance: "CACHE",
            status: "FALLBACK",
            fallbackReason: error instanceof Error ? error.message : "live failed",
          },
        };
      }
      if (!this.fixture.summarizeSources) throw error;
      const result = await this.fixture.summarizeSources(question, sources);
      return {
        summaries: result.summaries,
        run: {
          ...result.run,
          provenance: "GOLDEN_FIXTURE",
          status: "FALLBACK",
          fallbackReason: error instanceof Error ? error.message : "live failed",
        },
      };
    }
  }
"""

last_brace = content.rfind("}")
content = content[:last_brace] + fallback_method + "\n" + content[last_brace:]

with open("apps/api/src/llm/discussion-organizer.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("DONE")
