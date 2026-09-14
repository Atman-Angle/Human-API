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

  // 4. Grade evidence and make identical submissions idempotent.
  const graded = gradeEvidenceSubmission({ submission, mission, gap });
  const submissionKey = JSON.stringify({ missionId: mission.id, submission });
  const duplicate = investigation.evidence.find(
    (existing) =>
      JSON.stringify({ missionId: existing.missionId, submission: existing.submission }) ===
      submissionKey,
  );
  if (duplicate) {
    const existingReceipt = investigation.impactReceipts?.find(
      (receipt) => receipt.evidenceId === duplicate.id,
    );
    if (!existingReceipt) {
      throw new HttpError(
        500,
        "INTERNAL_ERROR",
        `Evidence ${duplicate.id} exists without its Impact Receipt.`,
      );
    }
    return { record: duplicate, receipt: existingReceipt, investigation };
  }
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
      (stateBefore === stateAfter
        ? " supplemented evidence without changing the overall state for Claim "
        : " changed the Knowledge State for Claim ") +
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
    contribution: {
      ...(accepted ? { observation: submission.statement } : {}),
      explanation: !accepted
        ? !graded.matchesGap
          ? "这段内容没有匹配本次邀请的知识缺口，未纳入该缺口的证据。"
          : "这段内容暂未满足第一手经历的评估条件，未作为证据推进判断。可以补充具体任务、AI 的作用和你自己的检查过程。"
        : stateBefore === stateAfter
          ? "已记录这条经历并纳入本次评估；整体知识状态没有变化。记录增加不等于发现了新结论，也不代表这条经历已被独立核验。"
          : "这条经历已纳入本次评估，整体知识状态发生了变化。下面保留你确认的原话，便于大家核对这次判断的具体依据。",
      boundary: "单次个人观察不能证明普遍规律；支持、反例与没有变化的经历都需要保留其具体背景。",
    },
    stillMissing: [...investigation.knowledgeState.limitations],
    createdAt: now,
  };

  investigation.impactReceipts = [
    ...(investigation.impactReceipts ?? []),
    structuredClone(receipt),
  ];
  return { record, receipt, investigation };
}
