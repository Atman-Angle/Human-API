import {
  AGENT_ACTION,
  GAP_SUITABILITY_STATUS,
  SEARCH_PROVENANCE,
  SOURCE_PROVIDER,
  type EvidenceRecord,
  type SearchResponse,
  type SourceRef,
} from "@human-api/contracts";
import { describe, expect, it } from "vitest";
import {
  buildInitialAgentActions,
  createEvidenceMission,
  createInitialKnowledgeState,
  evaluateSearchEvidence,
  reevaluateKnowledgeState,
} from "../src/index.js";

const NOW = "2026-09-13T00:00:00.000Z";
const AI_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";
const ELDERLY_PAYMENT_QUESTION = "老年人使用智能手机支付时最容易被哪一步卡住？";
const EV_RANGE_QUESTION = "新能源车冬季跑高速时，车主实际续航下降了多少？";

function source(provider: "ZHIHU" | "GLOBAL", id: string, excerpt: string): SourceRef {
  return {
    id,
    provider,
    contentId: id,
    contentType: "Answer",
    title: `公开讨论 ${id}`,
    url: `https://example.com/${id}`,
    authorName: "作者",
    excerpt,
    publishedAt: NOW,
  };
}

function search(
  provider: "ZHIHU" | "GLOBAL",
  question: string,
  items: SourceRef[] = [],
): SearchResponse {
  return {
    query: question,
    provider,
    provenance: SEARCH_PROVENANCE.LIVE,
    items,
    hasMore: false,
    retrievedAt: NOW,
    limitations: ["摘要级结果"],
  };
}

function evaluate(question: string, excerpts: string[] = []) {
  const items = excerpts.map((excerpt, index) =>
    source(index % 2 === 0 ? SOURCE_PROVIDER.ZHIHU : SOURCE_PROVIDER.GLOBAL, `s${index}`, excerpt),
  );
  const zhihuItems = items.filter((item) => item.provider === SOURCE_PROVIDER.ZHIHU);
  const globalItems = items.filter((item) => item.provider === SOURCE_PROVIDER.GLOBAL);

  return evaluateSearchEvidence({
    question,
    zhihu: search(SOURCE_PROVIDER.ZHIHU, question, zhihuItems),
    global: search(SOURCE_PROVIDER.GLOBAL, question, globalItems),
  });
}

describe("Evidence Gap suitability gate", () => {
  it.each([
    AI_QUESTION,
    "你第一次使用 AI 写完整 PR 时，最后必须人工修改的部分是什么？",
    "你最近一次用 AI 调试线上故障时，最后是哪句话或哪条日志让你确认问题？",
    "你最近一次使用 AI 学习新框架时，哪个步骤仍由自己完成？",
  ])("marks a concrete individual observation as mission-ready: %s", (question) => {
    const state = evaluate(question);

    expect(state.candidateGap).toBeDefined();
    expect(state.gapSuitability).toMatchObject({
      status: GAP_SUITABILITY_STATUS.MISSION_READY,
      singleObservation: true,
      lowHumanCost: true,
      decisionImpact: true,
      prevalenceRisk: false,
      standardizedMeasurementDependency: false,
    });
    expect(state.nextGap?.id).toBe(state.candidateGap?.id);
  });

  it.each([
    ELDERLY_PAYMENT_QUESTION,
    "大学生使用 AI 后最容易放弃哪个学习步骤？",
    "大多数远程开发者一周里最常被哪类会议打断？",
    "初学者使用 Copilot 时最常在哪类问题上卡住？",
  ])(
    "reframes prevalence questions exactly once into a ready individual observation: %s",
    (question) => {
      const state = evaluate(question);

      expect(state.candidateGap).toBeDefined();
      expect(state.gapSuitability).toMatchObject({
        status: GAP_SUITABILITY_STATUS.MISSION_READY,
        initialStatus: GAP_SUITABILITY_STATUS.NEEDS_REFRAMING,
        prevalenceRisk: false,
        standardizedMeasurementDependency: false,
      });
      expect(state.gapSuitability?.reframedGap).toBeDefined();
      expect(state.gapSuitability?.reframedGap?.id).not.toBe(state.candidateGap?.id);
      expect(state.gapSuitability?.reframedGap?.missingObservation).toContain("最近 30 天");
      expect(state.gapSuitability?.reframedGap?.missingObservation).not.toBe(question);
      expect(state.nextGap?.id).toBe(state.gapSuitability?.reframedGap?.id);
    },
  );

  it.each([
    EV_RANGE_QUESTION,
    "全国大学生使用 AI 后平均成绩提高多少？",
    "过去一年所有远程员工的平均会议时长下降了多少？",
    "高血压患者使用这款应用后平均血压下降多少毫米汞柱？",
    "不同车型在冬季高速的平均续航下降差异是多少？",
    "一家公司过去三年的所有报销记录里最常见的异常类型是什么？",
    "用户在盲测实验中平均完成任务时间下降了多少？",
    "平台日志里，用户平均每单修改地址几次？",
  ])(
    "blocks gaps that need population measurement, experiments, or full records: %s",
    (question) => {
      const state = evaluate(question);

      expect(state.candidateGap).toBeDefined();
      expect(state.gapSuitability?.status).toBe(
        GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION,
      );
      expect(state.gapSuitability?.reason.length).toBeGreaterThan(20);
      expect(state.nextGap).toBeUndefined();

      const signals = state.gapSuitability;
      expect(
        signals?.standardizedMeasurementDependency ||
          !signals?.singleObservation ||
          !signals?.lowHumanCost,
      ).toBe(true);
    },
  );

  it("keeps the EV case explicitly multi-variable and measurement-dependent", () => {
    const suitability = evaluate(EV_RANGE_QUESTION).gapSuitability;

    expect(suitability?.standardizedMeasurementDependency).toBe(true);
    expect(suitability?.prevalenceRisk).toBe(false);
    expect(suitability?.status).toBe(GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION);
  });

  it("exposes the action path without creating a mission for a blocked gap", () => {
    const blocked = evaluate(EV_RANGE_QUESTION);
    const ready = evaluate(AI_QUESTION);
    const reframed = evaluate(ELDERLY_PAYMENT_QUESTION);

    expect(buildInitialAgentActions(blocked)).toEqual([
      AGENT_ACTION.SEARCH_ZHIHU,
      AGENT_ACTION.SEARCH_WEB,
      AGENT_ACTION.ASSESS_EVIDENCE,
      AGENT_ACTION.ASSESS_GAP_SUITABILITY,
      AGENT_ACTION.STOP,
    ]);
    expect(buildInitialAgentActions(ready)).not.toContain(AGENT_ACTION.CREATE_MISSION);
    expect(buildInitialAgentActions(reframed)).toContain(AGENT_ACTION.REFRAME_GAP);
  });
});

describe("Agent evidence state", () => {
  it("creates a concrete mission from the effective Gap", () => {
    const state = evaluate(AI_QUESTION, [
      "学生和实习生用 Claude Code 生成接口测试，但自己检查异常和业务边界。",
    ]);
    if (!state.nextGap) throw new Error("Gap missing");

    const mission = createEvidenceMission({
      investigationId: "investigation-1",
      question: AI_QUESTION,
      gap: state.nextGap,
    });

    expect(mission.evidenceGapId).toBe(state.nextGap.id);
    expect(mission.description).toBe(state.nextGap.missingObservation);
    expect(mission.estimatedSeconds).toBeLessThanOrEqual(60);
    expect(mission.title).toContain("AI Coding");
  });

  it("does not advance on E0 and advances on relevant E1 while retaining unsupported claims", () => {
    const evidenceState = evaluate(AI_QUESTION, [
      "学生和实习生用 Claude Code 生成接口测试，但自己检查异常和业务边界。",
    ]);
    if (!evidenceState.nextGap) throw new Error("Gap missing");
    const mission = createEvidenceMission({
      investigationId: "investigation-1",
      question: AI_QUESTION,
      gap: evidenceState.nextGap,
    });
    const initial = createInitialKnowledgeState(evidenceState, NOW);

    const e0: EvidenceRecord = {
      id: "evidence-0",
      missionId: mission.id,
      participantType: "未声明",
      submission: { statement: "AI 会取代初级开发者。" },
      observation: "AI 会取代初级开发者。",
      grade: "E0_OPINION",
      gradeReason: "只有观点",
      matchesGap: false,
      createdAt: NOW,
    };
    const e0State = reevaluateKnowledgeState({
      question: AI_QUESTION,
      evidenceState,
      missions: [mission],
      evidence: [e0],
    });
    expect(e0State.knowledgeState).toBe("UNRESOLVED");

    const e1: EvidenceRecord = {
      id: "evidence-1",
      missionId: mission.id,
      participantType: "实习生",
      submission: {
        statement: "接口测试以前自己写，现在主要让 AI 生成。",
        participantType: "实习生",
        experience: "最近三个月在实习中使用 Claude Code。",
        task: "接口测试和异常边界",
        aiRole: "AI 生成测试草稿。",
        humanJudgment: "我负责判断异常场景和业务语义。",
      },
      observation: "接口测试和异常边界转移给 AI，本人判断异常场景和业务语义。",
      grade: "E1_FIRST_HAND",
      gradeReason: "第一手观察",
      matchesGap: true,
      createdAt: NOW,
    };
    const e1State = reevaluateKnowledgeState({
      question: AI_QUESTION,
      evidenceState,
      missions: [mission],
      evidence: [e0, e1],
    });

    expect(initial.status).toBe("UNRESOLVED");
    expect(e1State.knowledgeState).toBe("EARLY_EVIDENCE");
    expect(e1State.supportedNow).toHaveLength(1);
    expect(e1State.supportedNow[0]?.claim).toBe(evidenceState.nextGap.claim);
    expect(e1State.stillUnsupported).toEqual(evidenceState.unsupported);
  });

  it("keeps claims, gaps, sources, and limitations isolated across investigations", () => {
    const first = evaluate(AI_QUESTION, [
      "初级开发者用 Claude Code 生成测试和接口，但仍需要人工检查业务边界。",
    ]);
    const second = evaluate("你最近一次线下退货时，具体卡在了哪个环节？", [
      "顾客讨论线下退货时最常提到的步骤是排队和核对订单。",
      "门店员工也描述了材料不全、换货和退款确认等处理结果。",
    ]);

    expect(first.supported.some((item) => item.id === "claim-task-transfer-signal")).toBe(true);
    expect(second.supported.some((item) => item.id === "claim-task-transfer-signal")).toBe(false);
    expect(second.supported.flatMap((item) => item.sourceRefIds)).toEqual(["s0", "s1"]);
    expect(second.known.join(" ")).not.toContain("AI");
    expect(second.candidateGap?.affectedClaim).toBe("你最近一次线下退货时，具体卡在了哪个环节？");
    expect(second.unsupported.some((item) => item.claim.includes("招聘数量"))).toBe(false);
    expect(second.limitations).toEqual(first.limitations);
  });
});
