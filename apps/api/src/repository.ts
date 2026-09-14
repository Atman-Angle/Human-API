import type { EvidenceMission, Investigation } from "@human-api/contracts";
import { MISSION_STATUS } from "@human-api/contracts";

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
  listInvestigations(): Investigation[] {
    return [...this.investigations.values()];
  }
  listMissions(openOnly?: boolean): { investigation: Investigation; mission: EvidenceMission }[] {
    const result: { investigation: Investigation; mission: EvidenceMission }[] = [];
    for (const investigation of this.investigations.values()) {
      for (const mission of investigation.missions) {
        if (openOnly && mission.status !== MISSION_STATUS.OPEN) continue;
        if (openOnly) {
          const activeGapIds = new Set(
            [
              investigation.evidenceState.nextGap,
              investigation.evidenceState.candidateGap,
              investigation.evidenceState.gapSuitability?.reframedGap,
            ].flatMap((gap) => (gap ? [gap.id] : [])),
          );
          if (!activeGapIds.has(mission.evidenceGapId)) continue;
        }
        result.push({ investigation, mission });
      }
    }
    return result;
  }
}
