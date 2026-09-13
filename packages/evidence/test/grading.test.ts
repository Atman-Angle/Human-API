import type { EvidenceGap, EvidenceMission, EvidenceSubmission } from "@human-api/contracts";
import { describe, expect, it } from "vitest";
import { gradeEvidenceSubmission } from "../src/index.js";

const NOW = "2026-09-13T00:00:00.000Z";

const gap: EvidenceGap = {
  id: "gap-1",
  claim: "部分初级开发者的任务转移",
  affectedClaim: "AI Coding 改变哪些工作？",
  whyUnresolved: "缺少任务级第一手观察",
  missingObservation: "具体任务、AI 贡献和人工判断",
  targetParticipants: ["学生开发者", "实习生", "0–3 年开发者"],
  expectedValue: "检验任务主责是否转移",
};

const mission: EvidenceMission = {
  id: "mission-1",
  investigationId: "investigation-1",
  evidenceGapId: gap.id,
  title: "记录一次真实任务",
  description: "说明 AI 做了什么以及你判断什么",
  qualification: gap.targetParticipants,
  questions: [],
  estimatedSeconds: 55,
  createdAt: NOW,
};

function grade(submission: EvidenceSubmission) {
  return gradeEvidenceSubmission({ submission, mission, gap });
}

describe("Evidence grading", () => {
  it("keeps an opinion-only submission at E0 and unrelated to the gap", () => {
    const result = grade({ statement: "AI 以后肯定会取代初级程序员。" });
    expect(result.grade).toBe("E0_OPINION");
    expect(result.matchesGap).toBe(false);
  });

  it("grades a relevant concrete first-hand observation as E1", () => {
    const result = grade({
      statement: "测试以前自己写，现在让 AI 生成。",
      participantType: "实习生",
      experience: "最近三个月在实习中使用 Claude Code。",
      task: "接口测试和边界条件",
      aiRole: "AI 生成测试草稿。",
      humanJudgment: "我检查异常场景是否符合业务语义。",
    });
    expect(result.grade).toBe("E1_FIRST_HAND");
    expect(result.matchesGap).toBe(true);
  });

  it("requires a relevant first-hand observation before E2 artifact backing", () => {
    const result = grade({
      statement: "这是我的 Commit。",
      artifactUrl: "https://example.com/commit/123",
    });
    expect(result.grade).toBe("E0_OPINION");
    expect(result.matchesGap).toBe(false);
  });

  it("grades first-hand evidence with an artifact as E2", () => {
    const result = grade({
      statement: "接口测试现在主要交给 AI。",
      participantType: "0-3 年开发者",
      experience: "我最近三个月持续使用 Cursor。",
      task: "接口测试和调试",
      aiRole: "AI 生成测试代码和初始修复。",
      humanJudgment: "我判断边界、异常和业务语义。",
      artifactUrl: "https://example.com/commit/123",
    });
    expect(result.grade).toBe("E2_ARTIFACT_BACKED");
    expect(result.matchesGap).toBe(true);
  });
});
