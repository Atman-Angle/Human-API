import { randomUUID } from "node:crypto";
import {
  EVIDENCE_GRADE,
  type EvidenceMission,
  type EvidenceRecord,
  type EvidenceSubmission,
  type ImpactReceipt,
  type Investigation,
  type KnowledgeStateStatus,
  MISSION_STATUS,
} from "@human-api/contracts";
import { buildKnowledgeStateFromReevaluation, reevaluateKnowledgeState } from "@human-api/agent";
import { gradeEvidenceSubmission } from "@human-api/evidence";
import { HttpError } from "./errors.js";

export interface SubmitEvidenceInput {
  investigation: Investigation;
  mission: EvidenceMission;
  submission: EvidenceSubmission;
  clock?: () => Date;
  idFactory?: () => string;
}

export interface SubmitEvidenceResult {
  record: EvidenceRecord;
  receipt: ImpactReceipt;
  investigation: Investigation;
}

/**
 * Application action: orchestrates the full evidence intake flow.
 */
export function submitMissionEvidence({
  investigation,
  mission,
  submission,
  clock = () => new Date(),
  idFactory = randomUUID,
}: SubmitEvidenceInput): SubmitEvidenceResult {
  // 1. Mission OPEN Guard
  if (mission.status !== MISSION_STATUS.OPEN) {
    throw new HttpError(
      409,
      "VALIDATION_ERROR",
      mission.status === MISSION_STATUS.CLOSED
        ? "Mission is CLOSED and no longer accepts Evidence."
        : "Mission is not OPEN and cannot accept Evidence.",
    );
  }

  // 2. Resolve Gap from investigation
  const gap = [
    investigation.evidenceState.nextGap,
    investigation.evidenceState.candidateGap,
    investigation.evidenceState.gapSuitability?.reframedGap,
  ].find((candidate) => candidate?.id === mission.evidenceGapId);
  if (!gap) {
    throw new HttpError(409, "VALIDATION_ERROR", "Mission has no Evidence Gap.");
  }

  // 3. Resolve Claim from Gap
  const affectedClaim = [
    ...investigation.evidenceState.supported,
    ...investigation.evidenceState.unsupported,
  ].find((claim) => claim.id === gap.affectedClaimId);
  if (!affectedClaim) {
    throw new HttpError(
      409,
      "VALIDATION_ERROR",
      "Mission Gap references a Claim outside this Investigation.",
    );
  }

  // 4. Grade evidence
  const graded = gradeEvidenceSubmission({ submission, mission, gap });
  const now = clock().toISOString();
  const stateBefore: KnowledgeStateStatus = investigation.knowledgeState.status;

  // 5. Build evidence record
  const record: EvidenceRecord = {
    id: idFactory(),
    missionId: mission.id,
    participantType: graded.participantType,
    submission,
    observation: graded.observation,
    grade: graded.grade,
    gradeReason: graded.gradeReason,
    matchesGap: graded.matchesGap,
    createdAt: now,
  };
  investigation.evidence.push(record);

  // 6. Re-evaluate (isolated to target claim)
  const reevaluation = reevaluateKnowledgeState({
    question: investigation.question,
    evidenceState: investigation.evidenceState,
    mission,
    gap,
    evidence: investigation.evidence,
  });
  investigation.reevaluation = reevaluation;

  // 7. Build new knowledge state
  investigation.knowledgeState = buildKnowledgeStateFromReevaluation(
    investigation.knowledgeState,
    reevaluation,
    investigation.evidence.length,
  );
  investigation.updatedAt = now;

  // 8. Generate impact receipt
  const accepted =
    graded.matchesGap &&
    (graded.grade === EVIDENCE_GRADE.E1_FIRST_HAND ||
      graded.grade === EVIDENCE_GRADE.E2_ARTIFACT_BACKED);
  const stateAfter: KnowledgeStateStatus = investigation.knowledgeState.status;

  let impactSummary: string;
  if (!accepted) {
    if (!graded.matchesGap) {
      impactSummary =
        "The Observation does not match the current Evidence Gap and was not included in the Knowledge State evaluation.";
    } else {
      impactSummary =
        "The Observation is currently opinion-level (E0) and does not advance the Knowledge State; first-hand verifiable experience is required for evaluation.";
    }
  } else {
    impactSummary =
      "Observation accepted and included in Re-evaluation. Evidence from Mission " +
      mission.title +
      " advanced the Knowledge State of Claim " +
      affectedClaim.claim +
      ".";
  }

  const receipt: ImpactReceipt = {
    evidenceId: record.id,
    missionId: mission.id,
    investigationId: investigation.id,
    accepted,
    grade: graded.grade,
    affectedClaimId: gap.affectedClaimId,
    stateBefore,
    stateAfter,
    impactSummary,
    stillMissing: investigation.knowledgeState.limitations,
    createdAt: now,
  };

  return { record, receipt, investigation };
}
