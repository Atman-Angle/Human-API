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
