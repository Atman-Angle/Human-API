import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { EvidenceSubmissionSchema, type Investigation } from "@human-api/contracts";
import { createRuntime } from "../apps/api/src/server.js";

const QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";
const writeFixture = process.argv.includes("--write-fixture");

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T;
  if (!response.ok) throw new Error(`POST ${url} failed: ${JSON.stringify(payload)}`);
  return payload;
}

async function main(): Promise<void> {
  if (!process.env.ZHIHU_ACCESS_SECRET) {
    throw new Error("ZHIHU_ACCESS_SECRET is required for the live Golden run.");
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runtime = createRuntime({
    cacheDirectory: resolve(process.cwd(), ".cache", `live-${runId}`),
  });
  const server = createServer(runtime.handler);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server address unavailable");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const investigation = await post<Investigation>(`${baseUrl}/api/investigations`, {
      question: QUESTION,
    });
    if (
      investigation.searches.zhihu.provenance !== "LIVE" ||
      investigation.searches.global.provenance !== "LIVE"
    ) {
      throw new Error(
        `Expected LIVE search, received ${investigation.searches.zhihu.provenance}/${investigation.searches.global.provenance}`,
      );
    }

    const withMission = await post<Investigation>(
      `${baseUrl}/api/investigations/${investigation.id}/missions`,
      {},
    );
    const mission = withMission.missions[0];
    if (!mission) throw new Error("Mission was not created");

    const afterE0 = await post<Investigation>(`${baseUrl}/api/missions/${mission.id}/evidence`, {
      statement: "AI 以后肯定会全面取代初级程序员。",
    });
    const e0 = afterE0.evidence.at(-1);
    if (e0?.grade !== "E0_OPINION" || afterE0.knowledgeState.status !== "UNRESOLVED") {
      throw new Error("E0 incorrectly changed Knowledge State");
    }

    let afterHumanEvidence: Investigation | undefined;
    const evidenceFile = process.env.SPIKE_EVIDENCE_FILE;
    if (evidenceFile) {
      const submission = EvidenceSubmissionSchema.parse(
        JSON.parse(await readFile(resolve(evidenceFile), "utf8")),
      );
      afterHumanEvidence = await post<Investigation>(
        `${baseUrl}/api/missions/${mission.id}/evidence`,
        submission,
      );
    }

    if (writeFixture) {
      const fixturePath = resolve(process.cwd(), "fixtures/golden-case/search-fixture.json");
      await mkdir(dirname(fixturePath), { recursive: true });
      await writeFile(
        fixturePath,
        `${JSON.stringify(
          {
            query: QUESTION,
            zhihu: { ...investigation.searches.zhihu, provenance: "GOLDEN_FIXTURE" },
            global: { ...investigation.searches.global, provenance: "GOLDEN_FIXTURE" },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          question: QUESTION,
          search: {
            zhihu: {
              provenance: investigation.searches.zhihu.provenance,
              count: investigation.searches.zhihu.items.length,
              hasMore: investigation.searches.zhihu.hasMore,
            },
            global: {
              provenance: investigation.searches.global.provenance,
              count: investigation.searches.global.items.length,
              hasMore: investigation.searches.global.hasMore,
            },
          },
          gap: investigation.evidenceState.nextGap,
          mission: {
            id: mission.id,
            estimatedSeconds: mission.estimatedSeconds,
            questions: mission.questions.length,
          },
          e0: {
            grade: e0.grade,
            knowledgeState: afterE0.knowledgeState.status,
          },
          humanEvidence: afterHumanEvidence
            ? {
                grade: afterHumanEvidence.evidence.at(-1)?.grade,
                matchesGap: afterHumanEvidence.evidence.at(-1)?.matchesGap,
                knowledgeState: afterHumanEvidence.knowledgeState.status,
              }
            : "SKIPPED: SPIKE_EVIDENCE_FILE was not supplied; no human submission was fabricated.",
          fixtureWritten: writeFixture,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await new Promise<void>((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose())),
    );
  }
}

await main();
