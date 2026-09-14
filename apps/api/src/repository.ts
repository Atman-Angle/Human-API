import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import type { EvidenceMission, Investigation, MaintenanceRun } from "@human-api/contracts";
import { MISSION_STATUS } from "@human-api/contracts";
export interface MissionLookup {
  investigation: Investigation;
  mission: EvidenceMission;
}
export interface InvestigationRepository {
  get(id: string): Investigation | undefined;
  save(i: Investigation): void;
  findMission(id: string): MissionLookup | undefined;
  listInvestigations(): Investigation[];
  listMissions(openOnly?: boolean): { investigation: Investigation; mission: EvidenceMission }[];
  saveMaintenanceRun(run: MaintenanceRun): void;
  listMaintenanceRuns(investigationId: string): MaintenanceRun[];
  saveProposal(proposal: InvestigationProposal): void;
  getProposal(id: string): InvestigationProposal | undefined;
  reset(): void;
}
export class InMemoryInvestigationRepository implements InvestigationRepository {
  protected readonly investigations = new Map<string, Investigation>();
  protected readonly maintenanceRuns = new Map<string, MaintenanceRun>();
  protected readonly proposals = new Map<string, InvestigationProposal>();
  get(id: string) {
    return this.investigations.get(id);
  }
  save(i: Investigation) {
    this.investigations.set(i.id, i);
  }
  findMission(id: string) {
    for (const investigation of this.investigations.values()) {
      const mission = investigation.missions.find((x) => x.id === id);
      if (mission) return { investigation, mission };
    }
    return undefined;
  }
  listInvestigations() {
    return [...this.investigations.values()];
  }
  listMissions(openOnly?: boolean) {
    const result: { investigation: Investigation; mission: EvidenceMission }[] = [];
    for (const investigation of this.investigations.values())
      for (const mission of investigation.missions) {
        if (openOnly && mission.status !== MISSION_STATUS.OPEN) continue;
        result.push({ investigation, mission });
      }
    return result;
  }
  saveMaintenanceRun(run: MaintenanceRun) {
    this.maintenanceRuns.set(run.runId, run);
  }
  listMaintenanceRuns(investigationId: string) {
    return [...this.maintenanceRuns.values()].filter((r) => r.investigationId === investigationId);
  }
  saveProposal(proposal: InvestigationProposal) {
    this.proposals.set(proposal.id, proposal);
  }
  getProposal(id: string) {
    return this.proposals.get(id);
  }
  reset() {
    this.investigations.clear();
    this.maintenanceRuns.clear();
    this.proposals.clear();
  }
}
export interface SqliteInvestigationRepositoryOptions {
  legacyJsonPath?: string;
}

/**
 * SQLite-backed persistence for the existing repository aggregate boundary.
 *
 * The payload remains the Contract-shaped aggregate JSON. SQLite owns durable
 * storage, indexing by id, transactions, and restart safety; it does not make
 * domain decisions or introduce a second DTO/state authority.
 */
export class SqliteInvestigationRepository extends InMemoryInvestigationRepository {
  private readonly database: DatabaseSync;

  constructor(filePath: string, options: SqliteInvestigationRepositoryOptions = {}) {
    super();
    if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true });
    this.database = new DatabaseSync(filePath);
    this.database.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS repository_records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      ) WITHOUT ROWID;
    `);
    this.load();
    if (this.isEmpty() && options.legacyJsonPath && existsSync(options.legacyJsonPath)) {
      this.importLegacyJson(options.legacyJsonPath);
    }
  }

  private load() {
    const rows = this.database
      .prepare("SELECT kind, id, payload FROM repository_records")
      .all() as Array<{ kind: string; id: string; payload: string }>;
    for (const row of rows) {
      const value = JSON.parse(row.payload) as
        Investigation | InvestigationProposal | MaintenanceRun;
      if (row.kind === "investigation") this.investigations.set(row.id, value as Investigation);
      if (row.kind === "proposal") this.proposals.set(row.id, value as InvestigationProposal);
      if (row.kind === "maintenance_run") this.maintenanceRuns.set(row.id, value as MaintenanceRun);
    }
  }

  private isEmpty() {
    return (
      this.investigations.size === 0 && this.proposals.size === 0 && this.maintenanceRuns.size === 0
    );
  }

  private upsert(kind: string, id: string, value: unknown) {
    this.database
      .prepare(
        `INSERT INTO repository_records (kind, id, payload) VALUES (?, ?, ?)
         ON CONFLICT (kind, id) DO UPDATE SET payload = excluded.payload`,
      )
      .run(kind, id, JSON.stringify(value));
  }

  private importLegacyJson(filePath: string) {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as
      | {
          investigations?: Investigation[];
          proposals?: InvestigationProposal[];
          maintenanceRuns?: MaintenanceRun[];
        }
      | Investigation[];
    const data = Array.isArray(parsed) ? { investigations: parsed } : parsed;
    this.database.exec("BEGIN");
    try {
      for (const investigation of data.investigations ?? []) {
        super.save(investigation);
        this.upsert("investigation", investigation.id, investigation);
      }
      for (const proposal of data.proposals ?? []) {
        super.saveProposal(proposal);
        this.upsert("proposal", proposal.id, proposal);
      }
      for (const run of data.maintenanceRuns ?? []) {
        super.saveMaintenanceRun(run);
        this.upsert("maintenance_run", run.runId, run);
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  override save(i: Investigation) {
    super.save(i);
    this.upsert("investigation", i.id, i);
  }

  override saveProposal(proposal: InvestigationProposal) {
    super.saveProposal(proposal);
    this.upsert("proposal", proposal.id, proposal);
  }

  override saveMaintenanceRun(run: MaintenanceRun) {
    super.saveMaintenanceRun(run);
    this.upsert("maintenance_run", run.runId, run);
  }

  override reset() {
    super.reset();
    this.database.exec("DELETE FROM repository_records");
  }

  close() {
    this.database.close();
  }
}

export class JsonInvestigationRepository extends InMemoryInvestigationRepository {
  constructor(private readonly filePath: string) {
    super();
    this.load();
  }
  private load() {
    if (!existsSync(this.filePath)) return;
    const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as
      | {
          investigations?: Investigation[];
          proposals?: InvestigationProposal[];
          maintenanceRuns?: MaintenanceRun[];
        }
      | Investigation[];
    const data = Array.isArray(parsed) ? { investigations: parsed } : parsed;
    for (const i of data.investigations ?? []) this.investigations.set(i.id, i);
    for (const proposal of data.proposals ?? []) this.proposals.set(proposal.id, proposal);
    for (const run of data.maintenanceRuns ?? []) this.maintenanceRuns.set(run.runId, run);
  }
  private persist() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(
      tmp,
      JSON.stringify(
        {
          investigations: this.listInvestigations(),
          proposals: [...this.proposals.values()],
          maintenanceRuns: [...this.maintenanceRuns.values()],
        },
        null,
        2,
      ),
    );
    renameSync(tmp, this.filePath);
  }
  override save(i: Investigation) {
    super.save(i);
    this.persist();
  }
  override saveProposal(proposal: InvestigationProposal) {
    super.saveProposal(proposal);
    this.persist();
  }
  override reset() {
    super.reset();
    this.persist();
  }
  override saveMaintenanceRun(run: MaintenanceRun) {
    super.saveMaintenanceRun(run);
    this.persist();
  }
}

export interface InvestigationProposal {
  id: string;
  question: string;
  createdAt: string;
  confirmedInvestigationId?: string;
}
