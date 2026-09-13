import {
  EVIDENCE_GRADE,
  type EvidenceGrade,
  type EvidenceGap,
  type EvidenceMission,
  type EvidenceSubmission,
} from "@human-api/contracts";

export interface GradeEvidenceInput {
  submission: EvidenceSubmission;
  mission: EvidenceMission;
  gap: EvidenceGap;
}

export interface GradeEvidenceResult {
  grade: EvidenceGrade;
  gradeReason: string;
  matchesGap: boolean;
  participantType: string;
  observation: string;
}

const OBSERVATION_TERMS = [
  "ai",
  "接口",
  "测试",
  "调试",
  "代码",
  "重构",
  "文档",
  "需求",
  "review",
  "审查",
  "bug",
  "crud",
  "日志",
  "理解",
  "实现",
  "生成",
  "部署",
];

function hasText(value: string | undefined, minimum = 2): value is string {
  return typeof value === "string" && value.trim().length >= minimum;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s–—-]/g, "");
}

function participantMatches(participantType: string, gap: EvidenceGap): boolean {
  const participant = normalize(participantType);
  return gap.targetParticipants.some((target) => {
    const normalizedTarget = normalize(target);
    return participant.includes(normalizedTarget) || normalizedTarget.includes(participant);
  });
}

function observationMatches(taskText: string): boolean {
  const normalized = taskText.toLowerCase();
  return OBSERVATION_TERMS.some((term) => normalized.includes(term));
}

export function gradeEvidenceSubmission({
  submission,
  mission,
  gap,
}: GradeEvidenceInput): GradeEvidenceResult {
  const participantType = submission.participantType?.trim() || "未声明";
  const hasFirstHandShape =
    hasText(submission.experience) &&
    hasText(submission.task) &&
    hasText(submission.aiRole) &&
    hasText(submission.humanJudgment);

  const relevantText = [submission.task, submission.aiRole, submission.humanJudgment]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  const matchesGap =
    hasFirstHandShape &&
    participantMatches(participantType, gap) &&
    observationMatches(relevantText);

  let grade: EvidenceGrade = EVIDENCE_GRADE.E0_OPINION;
  let gradeReason = "只有观点性陈述，没有提供可核验的本人具体任务、AI 贡献和人工判断。";

  if (hasFirstHandShape) {
    grade = EVIDENCE_GRADE.E1_FIRST_HAND;
    gradeReason = "提供了本人具体经历、任务、AI 贡献和人工判断，属于第一手观察。";
  }

  if (hasFirstHandShape && submission.artifactUrl) {
    grade = EVIDENCE_GRADE.E2_ARTIFACT_BACKED;
    gradeReason = "在第一手观察基础上提供了相关 Artifact，可增强该观察的可信度。";
  }

  const observation =
    [submission.experience, submission.task, submission.aiRole, submission.humanJudgment]
      .filter((value): value is string => hasText(value))
      .join("；") || submission.statement.trim();

  return {
    grade,
    gradeReason: `${gradeReason} Mission: ${mission.title}。`,
    matchesGap,
    participantType,
    observation,
  };
}
