import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonInvestigationRepository } from "../src/repository.js";
import type { Investigation, MaintenanceRun } from "@human-api/contracts";

describe("Community Chat spec persistence", () => {
  it("restores proposals, investigations, and maintenance runs after restart", () => {
    const directory = mkdtempSync(join(tmpdir(), "human-api-community-"));
    const file = join(directory, "state.json");
    try {
      const repo1 = new JsonInvestigationRepository(file);
      repo1.saveProposal({
        id: "proposal-1",
        question: "复杂问题",
        createdAt: "2026-09-14T00:00:00.000Z",
      });
      const investigation = {
        id: "inv-1",
        question: "复杂问题",
        createdAt: "2026-09-14T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        evidence: [],
        missions: [],
        actions: [],
        searches: {},
        evidenceState: {
          supported: [],
          unsupported: [],
          disagreements: [],
          nextGap: null,
          candidateGap: null,
        },
        knowledgeState: { status: "UNRESOLVED", rationale: "未评估" },
      } as unknown as Investigation;
      repo1.save(investigation);
      const run = {
        runId: "run-1",
        investigationId: "inv-1",
        trigger: "MANUAL",
        startedAt: "2026-09-14T00:00:00.000Z",
        completedAt: "2026-09-14T00:00:01.000Z",
        status: "SUCCEEDED",
        stateBefore: "UNRESOLVED",
        stateAfter: "UNRESOLVED",
        changed: false,
        createdMissionIds: [],
        closedMissionIds: [],
        limitations: [],
      } as MaintenanceRun;
      repo1.saveMaintenanceRun(run);
      const repo2 = new JsonInvestigationRepository(file);
      expect(repo2.getProposal("proposal-1")?.question).toBe("复杂问题");
      expect(repo2.get("inv-1")?.question).toBe("复杂问题");
      expect(repo2.listMaintenanceRuns("inv-1")).toHaveLength(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
