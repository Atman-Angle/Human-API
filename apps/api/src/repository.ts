import type { EvidenceMission, Investigation } from "@human-api/contracts";

export interface MissionLookup {
  investigation: Investigation;
  mission: EvidenceMission;
}

export class InMemoryInvestigationRepository {
  private readonly investigations = new Map<string, Investigation>();

  get(id: string): Investigation | undefined {
    return this.investigations.get(id);
  }

  save(investigation: Investigation): void {
    this.investigations.set(investigation.id, investigation);
  }

  findMission(missionId: string): MissionLookup | undefined {
    for (const investigation of this.investigations.values()) {
      const mission = investigation.missions.find((item) => item.id === missionId);
      if (mission) return { investigation, mission };
    }
    return undefined;
  }
}
