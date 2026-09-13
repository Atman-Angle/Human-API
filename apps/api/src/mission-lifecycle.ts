import { MISSION_STATUS, type EvidenceMission, type Investigation } from "@human-api/contracts";

export interface CloseMissionInput {
  investigation: Investigation;
  missionId: string;
  reason: string;
  closedAt?: string;
}

export function closeMission({
  investigation,
  missionId,
  reason,
  closedAt = new Date().toISOString(),
}: CloseMissionInput): EvidenceMission {
  const missionIndex = investigation.missions.findIndex((mission) => mission.id === missionId);
  if (missionIndex < 0) {
    throw new Error(`Mission ${missionId} not found in Investigation ${investigation.id}.`);
  }

  const mission = investigation.missions[missionIndex];
  if (!mission) {
    throw new Error(`Mission ${missionId} not found in Investigation ${investigation.id}.`);
  }
  if (mission.status === MISSION_STATUS.CLOSED) return mission;

  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error("Mission close reason is required.");

  const closedMission: EvidenceMission = {
    ...mission,
    status: MISSION_STATUS.CLOSED,
    updatedAt: closedAt,
    closedAt,
    closedReason: normalizedReason,
  };
  investigation.missions[missionIndex] = closedMission;
  return closedMission;
}
