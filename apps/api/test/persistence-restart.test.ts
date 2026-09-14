import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonInvestigationRepository, SqliteInvestigationRepository } from "../src/repository.js";
import { createRuntime } from "../src/server.js";
import { createServer } from "node:http";
import type { Investigation, MaintenanceRun } from "@human-api/contracts";

describe("Investigation persistence", () => {
  it("preserves the complete aggregate through a real HTTP handler restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "human-gateway-http-"));
    const file = join(directory, "investigations.json");
    try {
      const repo1 = new JsonInvestigationRepository(file);
      const investigation = {
        id: "inv-http",
        question: "q",
        missions: [{ id: "mission-http", status: "OPEN" }],
        evidence: [{ id: "e-http", missionId: "mission-http" }],
        impactReceipts: [
          {
            evidenceId: "e-http",
            missionId: "mission-http",
            stateBefore: "UNRESOLVED",
            stateAfter: "EARLY_EVIDENCE",
          },
        ],
      } as unknown as Investigation;
      repo1.save(investigation);
      const handler1 = createRuntime({ dataPath: file, accessSecret: "test" }).handler;
      const server1 = createServer(handler1);
      await new Promise<void>((resolve) => server1.listen(0, resolve));
      const port = (server1.address() as { port: number }).port;
      const first = await fetch(`http://127.0.0.1:${port}/api/investigations/inv-http`);
      expect(first.status).toBe(200);
      await new Promise<void>((resolve, reject) =>
        server1.close((error) => (error ? reject(error) : resolve())),
      );
      const handler2 = createRuntime({ dataPath: file, accessSecret: "test" }).handler;
      const server2 = createServer(handler2);
      await new Promise<void>((resolve) => server2.listen(0, resolve));
      const port2 = (server2.address() as { port: number }).port;
      const second = await fetch(`http://127.0.0.1:${port2}/api/evidence/e-http/impact`);
      expect(second.status).toBe(200);
      expect((await second.json()).stateAfter).toBe("EARLY_EVIDENCE");
      await new Promise<void>((resolve, reject) =>
        server2.close((error) => (error ? reject(error) : resolve())),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("round-trips the persisted Investigation aggregate across repository instances", () => {
    const directory = mkdtempSync(join(tmpdir(), "human-gateway-"));
    const file = join(directory, "investigations.json");
    try {
      const first = new JsonInvestigationRepository(file);
      const investigation = {
        id: "inv-1",
        question: "q",
        missions: [{ id: "mission-1", status: "OPEN" }],
        evidence: [{ id: "evidence-1", missionId: "mission-1" }],
        impactReceipts: [{ evidenceId: "evidence-1", missionId: "mission-1" }],
      } as unknown as Investigation;
      first.save(investigation);
      const second = new JsonInvestigationRepository(file);
      expect(second.get("inv-1")?.id).toBe("inv-1");
      expect(second.get("inv-1")?.question).toBe("q");
      expect(second.get("inv-1")?.missions[0]?.id).toBe("mission-1");
      expect(second.get("inv-1")?.evidence[0]?.id).toBe("evidence-1");
      expect(second.get("inv-1")?.impactReceipts?.[0]?.evidenceId).toBe("evidence-1");
      expect(second.get("inv-1")?.impactReceipts?.[0]?.stateBefore).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("round-trips the repository data through SQLite", () => {
    const directory = mkdtempSync(join(tmpdir(), "human-gateway-sqlite-"));
    const file = join(directory, "investigations.sqlite");
    let first: SqliteInvestigationRepository | undefined;
    let second: SqliteInvestigationRepository | undefined;
    try {
      first = new SqliteInvestigationRepository(file);
      first.save({
        id: "inv-sqlite",
        question: "SQLite q",
        missions: [{ id: "mission-sqlite", status: "OPEN" }],
        evidence: [{ id: "evidence-sqlite", missionId: "mission-sqlite" }],
        impactReceipts: [{ evidenceId: "evidence-sqlite", missionId: "mission-sqlite" }],
      } as unknown as Investigation);
      first.saveProposal({
        id: "proposal-sqlite",
        question: "SQLite proposal",
        createdAt: "2026-09-14T00:00:00.000Z",
      });
      first.saveMaintenanceRun({
        runId: "run-sqlite",
        investigationId: "inv-sqlite",
        trigger: "test",
        startedAt: "2026-09-14T00:00:00.000Z",
        completedAt: "2026-09-14T00:00:01.000Z",
        status: "SUCCEEDED",
        stateBefore: "UNRESOLVED",
        stateAfter: "UNRESOLVED",
        changed: false,
        createdMissionIds: [],
        closedMissionIds: [],
        limitations: [],
      } satisfies MaintenanceRun);
      first.close();
      first = undefined;

      second = new SqliteInvestigationRepository(file);
      expect(second.get("inv-sqlite")?.question).toBe("SQLite q");
      expect(second.get("inv-sqlite")?.evidence[0]?.id).toBe("evidence-sqlite");
      expect(second.getProposal("proposal-sqlite")?.question).toBe("SQLite proposal");
      expect(second.listMaintenanceRuns("inv-sqlite")).toHaveLength(1);
    } finally {
      second?.close();
      first?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("imports the legacy JSON file once when creating a fresh SQLite database", () => {
    const directory = mkdtempSync(join(tmpdir(), "human-gateway-migration-"));
    const jsonFile = join(directory, "investigations.json");
    const sqliteFile = join(directory, "investigations.sqlite");
    let repository: SqliteInvestigationRepository | undefined;
    try {
      const legacy = new JsonInvestigationRepository(jsonFile);
      legacy.save({
        id: "inv-migrated",
        question: "legacy question",
        missions: [],
        evidence: [],
      } as unknown as Investigation);
      repository = new SqliteInvestigationRepository(sqliteFile, { legacyJsonPath: jsonFile });
      expect(repository.get("inv-migrated")?.question).toBe("legacy question");
      repository.close();
      repository = undefined;

      repository = new SqliteInvestigationRepository(sqliteFile, { legacyJsonPath: jsonFile });
      expect(repository.listInvestigations()).toHaveLength(1);
    } finally {
      repository?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
