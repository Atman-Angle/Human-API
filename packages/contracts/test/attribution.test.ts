import {
  ClaimAssessmentSchema,
  EvidenceGapSchema,
  EvidenceMissionSchema,
  EvidenceRecordSchema,
  MISSION_STATUS,
  MissionStatusSchema,
} from "../src/index.js";
import { describe, expect, it } from "vitest";

const gap = {
  id: "gap-1",
  claim: "一条近期经历可以检验具体任务是否转移。",
  affectedClaim: "AI Coding 改变哪些工作？",
  affectedClaimId: "claim-1",
  whyUnresolved: "缺少第一手观察。",
  missingObservation: "最近真实发生的一次任务转移。",
  targetParticipants: ["实习生"],
  expectedValue: "直接检验目标 Claim。",
};

const missionPlaceholder = {
  id: "mission-placeholder",
  investigationId: "investigation-1",
  evidenceGapId: gap.id,
  title: "记录一次经历",
  description: gap.missingObservation,
  qualification: gap.targetParticipants,
  questions: [
    {
      id: "task",
      kind: "SHORT_TEXT",
      prompt: "发生了什么？",
      required: true,
    },
  ],
  status: MISSION_STATUS.OPEN,
  estimatedSeconds: 50,
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
};

describe("Attribution contract", () => {
  it("requires EvidenceGap.affectedClaimId to reference a stable Claim id", () => {
    expect(EvidenceGapSchema.safeParse(gap).success).toBe(true);
    const { affectedClaimId, ...withoutAffectedClaimId } = gap;
    expect(affectedClaimId).toBe(gap.affectedClaimId);
    expect(EvidenceGapSchema.safeParse(withoutAffectedClaimId).success).toBe(false);
  });

  it("derives Evidence → Mission → Gap → Claim through explicit ids", () => {
    const claim = ClaimAssessmentSchema.parse({
      id: "claim-1",
      claim: "部分任务采用 AI 生成与人工审核。",
      rationale: "测试关系。",
      sourceRefIds: [],
      evidenceIds: [],
    });
    const parsedGap = EvidenceGapSchema.parse(gap);
    const mission = EvidenceMissionSchema.parse({
      id: "mission-1",
      investigationId: "investigation-1",
      evidenceGapId: parsedGap.id,
      title: "记录一次经历",
      description: parsedGap.missingObservation,
      qualification: parsedGap.targetParticipants,
      questions: [
        {
          id: "task",
          kind: "SHORT_TEXT",
          prompt: "发生了什么？",
          required: true,
        },
      ],
      status: MISSION_STATUS.OPEN,
      estimatedSeconds: 50,
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
    });
    const evidence = EvidenceRecordSchema.parse({
      id: "evidence-1",
      missionId: mission.id,
      participantType: "实习生",
      submission: { statement: "接口测试主要由 AI 生成。" },
      observation: "接口测试主要由 AI 生成。",
      grade: "E1_FIRST_HAND",
      gradeReason: "第一手观察。",
      matchesGap: true,
      createdAt: "2026-09-13T00:00:00.000Z",
    });

    expect(parsedGap.affectedClaimId).toBe(claim.id);
    expect(mission.evidenceGapId).toBe(parsedGap.id);
    expect(mission.status).toBe(MISSION_STATUS.OPEN);
    expect(mission.updatedAt).toBe(mission.createdAt);
    expect(evidence.missionId).toBe(mission.id);
  });

  it("requires a supported Mission lifecycle state and updatedAt timestamp", () => {
    expect(MissionStatusSchema.safeParse(MISSION_STATUS.OPEN).success).toBe(true);
    expect(MissionStatusSchema.safeParse(MISSION_STATUS.CLOSED).success).toBe(true);
    expect(MissionStatusSchema.safeParse("PAUSED").success).toBe(false);
    expect(
      EvidenceMissionSchema.safeParse({ ...missionPlaceholder, status: undefined }).success,
    ).toBe(false);
    expect(
      EvidenceMissionSchema.safeParse({ ...missionPlaceholder, updatedAt: undefined }).success,
    ).toBe(false);
  });
});
