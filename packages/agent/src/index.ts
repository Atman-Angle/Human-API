import { createHash, randomUUID } from "node:crypto";
import {
  AGENT_ACTION,
  EVIDENCE_GRADE,
  GAP_SUITABILITY_STATUS,
  KNOWLEDGE_STATE,
  MISSION_STATUS,
  type AgentAction,
  type ClaimAssessment,
  type EvidenceGap,
  type EvidenceMission,
  type EvidenceRecord,
  type EvidenceState,
  type GapSuitabilityResult,
  type GapSuitabilityStatus,
  type KnowledgeState,
  type KnowledgeStateStatus,
  type ReEvaluation,
  type SearchResponse,
  type SourceRef,
} from "@human-api/contracts";

const PUBLIC_SEARCH_LIMITATION =
  "当前结论来自搜索摘要，不是完整正文；知乎搜索固定最多返回 10 条且 HasMore=false，不能视为穷尽检索。";
const SMALL_SAMPLE_LIMITATION = "当前样本规模有限且参与者自选择，不能外推为行业总体比例。";

const PREVALENCE_MARKERS = [
  "最容易",
  "大多数人",
  "多数人",
  "大部分人",
  "普遍",
  "多少比例",
  "多大比例",
  "占比",
  "几成",
  "超过一半",
  "最常",
  "最常见的",
];

const STANDARDIZED_MEASUREMENT_MARKERS = [
  "平均",
  "总体",
  "全体",
  "全国",
  "行业",
  "样本",
  "样本量",
  "实验",
  "测量",
  "控制变量",
  "标准差",
  "置信区间",
  "统计",
  "分布",
  "比例",
  "占比",
  "差异",
  "下降多少",
  "提高多少",
  "降低多少",
  "增加多少",
  "上升多少",
  "多少毫米汞柱",
];

const QUANTITATIVE_SUBJECT_MARKERS = [
  "续航",
  "成绩",
  "血压",
  "崩溃率",
  "转化率",
  "成功率",
  "交付率",
  "故障率",
  "温度",
  "车速",
  "路况",
  "载重",
];

const MULTI_VARIABLE_MARKERS = [
  "不同年龄段",
  "不同车型",
  "多种条件",
  "相关性",
  "因果",
  "同时控制",
  "标准条件",
];

const FULL_RECORD_PATTERN = /(?:所有|全部).{0,12}(?:记录|账目|日志|报销)/;

const HIGH_COST_MARKERS = [
  "查账",
  "对账",
  "所有记录",
  "全部记录",
  "过去一年所有",
  "近三年所有",
  "历史记录",
  "完整日志",
  "档案",
  "体检报告",
  "实验",
  "测量",
  "连续记录",
  "样本",
  "统计",
  "上传",
];

const BLOCKAGE_MARKERS = ["卡住", "受阻", "失败", "中断", "无法完成", "哪一步", "停住", "报错"];

interface EvaluationInput {
  question: string;
  zhihu: SearchResponse;
  global: SearchResponse;
}

interface MissionInput {
  investigationId: string;
  question: string;
  gap: EvidenceGap;
}

interface ReEvaluationInput {
  question: string;
  evidenceState: EvidenceState;
  mission: EvidenceMission;
  gap: EvidenceGap;
  evidence: EvidenceRecord[];
}

interface SuitabilitySignals {
  singleObservation: boolean;
  lowHumanCost: boolean;
  decisionImpact: boolean;
  prevalenceRisk: boolean;
  standardizedMeasurementDependency: boolean;
}

function stableId(prefix: string, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `${prefix}-${digest}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s–—-]/g, "");
}

function sourceText(source: SourceRef): string {
  return `${source.title} ${source.excerpt}`.toLowerCase();
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function claim(
  id: string,
  text: string,
  rationale: string,
  sources: SourceRef[] = [],
  evidenceIds: string[] = [],
): ClaimAssessment {
  return {
    id,
    claim: text,
    rationale,
    sourceRefIds: sources.map((source) => source.id),
    evidenceIds,
  };
}

function inferParticipants(question: string): string[] {
  if (includesAny(question, ["老年人", "老人", "60 岁", "60岁", "银发"])) {
    return ["60 岁以上智能手机用户"];
  }
  if (includesAny(question, ["大学生", "高校学生", "大学在读"])) {
    return ["最近使用过相关工具或流程的在校大学生"];
  }
  if (includesAny(question, ["新能源车", "电动车", "车主"])) {
    return ["具备完整行程与充电记录的新能源车车主"];
  }
  if (includesAny(question, ["学生", "实习", "初级开发者", "junior", "0–3", "0-3"])) {
    return ["学生开发者", "实习生", "0–3 年开发者"];
  }
  if (includesAny(question, ["远程工作", "远程办公"])) {
    return ["持续进行远程工作的从业者"];
  }
  return ["最近 30 天内真实经历过该具体场景的当事人"];
}

function hasAiDomain(question: string): boolean {
  return includesAny(question, [
    "ai coding",
    "ai 编程",
    "ai写代码",
    "copilot",
    "claude code",
    "cursor",
    "codex",
  ]);
}

function analyzeSuitabilitySignals(value: string): SuitabilitySignals {
  const normalized = normalize(value);
  const prevalenceRisk = includesAny(normalized, PREVALENCE_MARKERS);
  const standardizedMeasurementDependency =
    includesAny(normalized, STANDARDIZED_MEASUREMENT_MARKERS) ||
    (includesAny(normalized, QUANTITATIVE_SUBJECT_MARKERS) &&
      includesAny(normalized, ["多少", "比例", "平均", "下降", "提高", "降低", "增加", "上升"])) ||
    includesAny(normalized, MULTI_VARIABLE_MARKERS);
  const fullRecordDependency = FULL_RECORD_PATTERN.test(normalized);
  const lowHumanCost =
    !standardizedMeasurementDependency &&
    !fullRecordDependency &&
    !includesAny(normalized, HIGH_COST_MARKERS);
  const singleObservation =
    !standardizedMeasurementDependency &&
    !fullRecordDependency &&
    !includesAny(normalized, ["全体", "全国", "总体", "行业", "所有记录", "全部记录"]);
  const decisionImpact = normalized.length >= 4;

  return {
    singleObservation,
    lowHumanCost,
    decisionImpact,
    prevalenceRisk,
    standardizedMeasurementDependency,
  };
}

function determineSuitabilityStatus(signals: SuitabilitySignals): GapSuitabilityStatus {
  if (!signals.singleObservation || signals.standardizedMeasurementDependency) {
    return GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION;
  }
  if (signals.prevalenceRisk) return GAP_SUITABILITY_STATUS.NEEDS_REFRAMING;
  if (!signals.lowHumanCost || !signals.decisionImpact) {
    return GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION;
  }
  return GAP_SUITABILITY_STATUS.MISSION_READY;
}

function buildMeasurementGap(
  question: string,
  sources: SourceRef[],
  affectedClaimId: string,
): EvidenceGap {
  return {
    id: stableId("gap", `measurement:${question}`),
    claim: "该问题要求一个在可比条件下得到的量化结果，单次经历或摘要检索不能直接回答。",
    affectedClaim: question,
    affectedClaimId,
    whyUnresolved:
      sources.length > 0
        ? "公开材料没有给出一致测量口径、完整样本框架和可复核原始数据，单个叙述也无法替代可比较的总体结果。"
        : "本次检索没有返回足以确定测量口径、样本框架和可比条件的原始材料。",
    missingObservation:
      "在明确目标对象、测量口径、时间窗口和关键控制条件后采集的一组可比 Observation；仅凭一次 30–60 秒叙述无法补齐。",
    targetParticipants: inferParticipants(question),
    expectedValue:
      "只有可比测量或合格样本数据能够改变该量化 Claim 的 Evidence State，单个故事只能提供背景。",
  };
}

function buildPrevalenceGap(
  question: string,
  sources: SourceRef[],
  affectedClaimId: string,
): EvidenceGap {
  return {
    id: stableId("gap", `prevalence:${question}`),
    claim: "该问题要求判断相关事件在目标群体中的相对频率或共同模式，而不是记录单个事件。",
    affectedClaim: question,
    affectedClaimId,
    whyUnresolved:
      sources.length > 0
        ? "公开摘要中的经验叙述无法提供目标人群、时间窗口和抽样方式一致的可比较数据。"
        : "本次检索没有返回能够比较目标人群频率或共同模式的可比材料。",
    missingObservation:
      "覆盖目标群体与时间窗口、说明抽样方式并能处理选择偏差的频率观察或多例可比数据；单一故事不能回答“最容易”“大多数”或具体比例。",
    targetParticipants: inferParticipants(question),
    expectedValue: "只有可比频率结果可以改变总体性 Claim；单个人只能提供后续改写的具体案例。",
  };
}

function buildExperienceGap(
  question: string,
  sources: SourceRef[],
  affectedClaimId: string,
): EvidenceGap {
  return {
    id: stableId("gap", `experience:${question}`),
    claim:
      "在一次近期真实经历中，可以指出一个具体环节：原本如何发生、主要执行者是谁，以及当事人最终在哪一步作出判断。",
    affectedClaim: question,
    affectedClaimId,
    whyUnresolved:
      sources.length > 0
        ? "公开材料提供的是二手总结或零散叙述，尚未形成与问题主题直接对应、包含具体情境和本人判断的第一手观察。"
        : "本次检索没有返回足够相关的原始材料，无法把问题拆成可由真人直接观察的具体环节。",
    missingObservation:
      "最近 30 天内亲身经历该主题的人，在最近一次真实事件中说明：具体发生了什么、哪个任务或环节发生变化、谁主要执行，以及本人最后保留了什么判断。",
    targetParticipants: inferParticipants(question),
    expectedValue:
      "一条包含事件、执行主体和本人判断的第一手观察，可以直接检验当前具体 Claim，而不是增加一条泛化观点。",
  };
}

function affectedClaimIdForGap(isAiTaskGap: boolean, signals: SuitabilitySignals): string {
  if (isAiTaskGap) return "claim-task-transfer-signal";
  if (signals.standardizedMeasurementDependency) return "claim-quantified-result-unsupported";
  if (signals.prevalenceRisk) return "claim-prevalence-result-unsupported";
  return "claim-population-pattern-unsupported";
}

function buildCandidateGap(
  question: string,
  sources: SourceRef[],
  isAiTaskGap: boolean,
  signals: SuitabilitySignals,
): EvidenceGap {
  const affectedClaimId = affectedClaimIdForGap(isAiTaskGap, signals);
  if (signals.standardizedMeasurementDependency) {
    return buildMeasurementGap(question, sources, affectedClaimId);
  }
  if (signals.prevalenceRisk) return buildPrevalenceGap(question, sources, affectedClaimId);
  return buildExperienceGap(question, sources, affectedClaimId);
}

function reframeGap(gap: EvidenceGap, question: string): EvidenceGap {
  const isBlockage = includesAny(question, BLOCKAGE_MARKERS);
  const observation = isBlockage
    ? "最近 30 天内亲身经历过该主题的人，回忆最近一次真实事件：具体在哪一步停住、当时如何处理、最终是否完成。"
    : "最近 30 天内亲身经历过该主题的人，回忆最近一次真实事件：哪一个具体步骤或行为发生变化、当时发生了什么、本人最后如何判断。";

  return {
    id: stableId("gap", `reframed:${gap.id}:${observation}`),
    claim: isBlockage
      ? "一条最近真实经历可以具体说明受阻发生在什么步骤、当事人如何应对以及最终结果。"
      : "一条最近真实经历可以具体说明某个步骤如何发生变化，以及当事人采取了什么判断或行动。",
    affectedClaim: gap.affectedClaim,
    affectedClaimId: gap.affectedClaimId,
    whyUnresolved:
      "原 Gap 试图从单个案例推断群体频率，问题与 Observation 粒度不匹配；改写后只要求描述一次可核实的具体经历。",
    missingObservation: observation,
    targetParticipants: gap.targetParticipants,
    expectedValue: gap.expectedValue,
  };
}

function negativeReason(signals: SuitabilitySignals): string {
  if (signals.standardizedMeasurementDependency) {
    return "该 Gap 依赖标准化测量、可比条件或多变量控制，单次 30–60 秒人类 Observation 不能可靠补充。";
  }
  if (!signals.singleObservation) {
    return "该 Gap 要求总体或全量事实，单个参与者的一次经历无法提供对应 Observation。";
  }
  if (!signals.lowHumanCost) {
    return "该 Gap 需要查大量历史记录、填写多项参数或完成实验，不符合当前 30–60 秒 Mission 成本约束。";
  }
  return "该 Gap 无法明确改变一个具体 Claim，新增回答只会增加一条泛化观点。";
}

export function evaluateGapSuitability(gap: EvidenceGap, question: string): GapSuitabilityResult {
  const signals = analyzeSuitabilitySignals(question);
  const initialStatus = determineSuitabilityStatus(signals);

  if (initialStatus === GAP_SUITABILITY_STATUS.NEEDS_REFRAMING) {
    const reframedGap = reframeGap(gap, question);
    const reframedSignals = analyzeSuitabilitySignals(
      `${reframedGap.claim}\n${reframedGap.missingObservation}`,
    );
    const reframedStatus = determineSuitabilityStatus(reframedSignals);

    if (reframedStatus === GAP_SUITABILITY_STATUS.MISSION_READY) {
      return {
        status: reframedStatus,
        initialStatus,
        ...reframedSignals,
        reason:
          "原 Gap 有 prevalenceRisk：单个 Observation 不能回答群体频率。已自动改写为最近 30 天内的一次真实经历，并在重评后通过 Mission 条件。",
        reframedGap,
      };
    }

    return {
      status: GAP_SUITABILITY_STATUS.NOT_SUITABLE_FOR_HUMAN_MISSION,
      initialStatus,
      ...reframedSignals,
      reason: `原 Gap 需要改写，但一次改写仍未通过：${negativeReason(reframedSignals)}`,
      reframedGap,
    };
  }

  return {
    status: initialStatus,
    ...signals,
    reason:
      initialStatus === GAP_SUITABILITY_STATUS.MISSION_READY
        ? `该 Gap 可由一名合格参与者通过一次近期真实经历提供，信息可在 30–60 秒内完成，并能直接检验“${gap.affectedClaim}”中的一个具体环节。`
        : negativeReason(signals),
  };
}

export function evaluateSearchEvidence({
  question,
  zhihu,
  global,
}: EvaluationInput): EvidenceState {
  const allSources = [...zhihu.items, ...global.items];
  const text = allSources.map(sourceText).join("\n");
  const isAiQuestion =
    hasAiDomain(question) &&
    includesAny(text, [
      "ai coding",
      "copilot",
      "claude code",
      "cursor",
      "codex",
      "ai 编程",
      "ai写代码",
    ]);
  const hasTaskSignal = includesAny(text, [
    "接口",
    "测试",
    "调试",
    "代码",
    "重构",
    "文档",
    "实现",
    "crud",
    "bug",
  ]);
  const hasJuniorSignal = includesAny(question, ["初级", "junior", "学生", "实习", "新人"]);

  const supported: ClaimAssessment[] = [];
  const unsupported: ClaimAssessment[] = [];
  const known: string[] = [
    `本次检索获得 ${zhihu.items.length} 条知乎结果和 ${global.items.length} 条全网结果，均为标题与摘要级信息。`,
  ];
  const disagreements: string[] = [];

  if (isAiQuestion && hasTaskSignal) {
    supported.push(
      claim(
        "claim-task-transfer-signal",
        "部分公开材料显示，代码生成、测试、调试、文档或理解类任务正在更多地采用“AI 生成 + 人工检查”的方式。",
        "该判断只来自检索摘要中的任务与 AI 使用描述，不代表行业普遍比例。",
        allSources.slice(0, 5),
      ),
    );
    known.push("公开材料中反复出现 AI 参与具体编码、测试、调试、文档或代码理解的任务级描述。");
  } else if (allSources.length >= 2) {
    supported.push(
      claim(
        "claim-public-discussion-signal",
        "公开检索中存在多条与问题主题相关的材料，说明该问题有现实讨论和观察价值。",
        "该判断只说明检索中存在相关材料，不代表问题所要求的总体结论已经被证明。",
        allSources.slice(0, 5),
      ),
    );
  }

  if (isAiQuestion && hasJuniorSignal) {
    known.push("问题与公开材料的共同主题集中在初级开发者、学生或实习生的工作内容变化。");
  } else {
    known.push(
      "公开材料主要提供个人叙述、经验总结或二手分析，不能替代与问题粒度一致的第一手 Observation。",
    );
  }

  if (includesAny(text, ["但是", "不过", "争议", "相反", "不会", "降低", "削弱", "反而"])) {
    disagreements.push(
      "公开材料对同一现象存在不同解释，当前摘要无法判断哪一种解释更符合目标人群的真实情况。",
    );
  }

  const suitabilitySignals = analyzeSuitabilitySignals(question);
  const candidateGap = buildCandidateGap(
    question,
    allSources,
    isAiQuestion && hasTaskSignal,
    suitabilitySignals,
  );
  const gapSuitability = evaluateGapSuitability(candidateGap, question);

  if (gapSuitability.standardizedMeasurementDependency) {
    unsupported.push(
      claim(
        "claim-quantified-result-unsupported",
        "当前搜索摘要不能支持问题所要求的平均值、比例或多变量量化结论。",
        "检索结果是摘要级叙述，没有一致测量口径、完整样本和可复核原始数据。",
        allSources.slice(0, 3),
      ),
    );
  } else if (suitabilitySignals.prevalenceRisk || gapSuitability.prevalenceRisk) {
    unsupported.push(
      claim(
        "claim-prevalence-result-unsupported",
        "当前搜索摘要不能支持目标群体中的普遍性或相对频率结论。",
        "个体叙述和二手总结不能提供可比较的人群频率，也不能替代说明抽样方式的观察。",
        allSources.slice(0, 3),
      ),
    );
  } else {
    unsupported.push(
      claim(
        "claim-population-pattern-unsupported",
        "当前搜索摘要不能支持目标群体已经形成稳定共同模式，也不能将个体体验外推为总体结论。",
        "当前结果缺少与目标问题一致、可核验的第一手 Observation 和样本说明。",
        allSources.slice(0, 3),
      ),
    );
  }

  const limitations = [
    PUBLIC_SEARCH_LIMITATION,
    "知乎与全网搜索各只获取单页结果；结果相关性由关键词检索决定，可能遗漏反例。",
    "搜索摘要无法验证作者身份、真实项目上下文和长期行为变化。",
  ];

  return {
    known,
    disagreements,
    supported,
    unsupported,
    limitations,
    candidateGap,
    gapSuitability,
    ...(gapSuitability.status === GAP_SUITABILITY_STATUS.MISSION_READY
      ? { nextGap: gapSuitability.reframedGap ?? candidateGap }
      : {}),
  };
}

export function buildInitialAgentActions(evidenceState: EvidenceState): AgentAction[] {
  const actions: AgentAction[] = [
    AGENT_ACTION.SEARCH_ZHIHU,
    AGENT_ACTION.SEARCH_WEB,
    AGENT_ACTION.ASSESS_EVIDENCE,
    AGENT_ACTION.ASSESS_GAP_SUITABILITY,
  ];

  if (evidenceState.gapSuitability?.initialStatus === GAP_SUITABILITY_STATUS.NEEDS_REFRAMING) {
    actions.push(AGENT_ACTION.REFRAME_GAP);
  }
  if (evidenceState.gapSuitability?.status !== GAP_SUITABILITY_STATUS.MISSION_READY) {
    actions.push(AGENT_ACTION.STOP);
  }
  return actions;
}

export function createInitialKnowledgeState(
  evidenceState: EvidenceState,
  now: string,
): KnowledgeState {
  return {
    status: KNOWLEDGE_STATE.UNRESOLVED,
    evidenceCount: 0,
    supported: evidenceState.supported,
    unsupported: evidenceState.unsupported,
    limitations: evidenceState.limitations,
    ...(evidenceState.nextGap ? { nextGap: evidenceState.nextGap } : {}),
    updatedAt: now,
  };
}

function shortLabel(question: string): string {
  const compact = question.replace(/\s+/g, " ").trim();
  return compact.length <= 36 ? compact : `${compact.slice(0, 35)}…`;
}

export function createEvidenceMission({
  investigationId,
  question,
  gap,
}: MissionInput): EvidenceMission {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    investigationId,
    evidenceGapId: gap.id,
    title: `记录一次与“${shortLabel(question)}”相关的真实经历`,
    description: gap.missingObservation,
    qualification: gap.targetParticipants,
    questions: [
      {
        id: "participantType",
        kind: "SINGLE_SELECT",
        prompt: "你与这次经历最接近的身份是什么？",
        options: [...gap.targetParticipants, "其他"],
        required: true,
      },
      {
        id: "timeframe",
        kind: "SINGLE_SELECT",
        prompt: "这次经历大约发生在什么时候？",
        options: ["最近 24 小时", "最近 7 天", "最近 30 天", "更早"],
        required: true,
      },
      {
        id: "task",
        kind: "SHORT_TEXT",
        prompt: "最近一次真实经历中，具体发生在什么任务、步骤或场景？",
        required: true,
      },
      {
        id: "aiRole",
        kind: "SHORT_TEXT",
        prompt: "当时具体发生了什么？哪一个环节发生了变化？",
        required: true,
      },
      {
        id: "humanJudgment",
        kind: "SHORT_TEXT",
        prompt: "你最后如何判断或处理？最终结果是什么？",
        required: true,
      },
      {
        id: "artifactUrl",
        kind: "URL",
        prompt: "可选：提供截图、记录链接或其他相关材料",
        required: false,
      },
    ],
    status: MISSION_STATUS.OPEN,
    estimatedSeconds: 50,
    createdAt: now,
    updatedAt: now,
  };
}

function firstHandEvidence(evidence: EvidenceRecord[]): EvidenceRecord[] {
  return evidence.filter(
    (record) =>
      record.matchesGap &&
      (record.grade === EVIDENCE_GRADE.E1_FIRST_HAND ||
        record.grade === EVIDENCE_GRADE.E2_ARTIFACT_BACKED),
  );
}

function uniqueClaims(claims: ClaimAssessment[]): ClaimAssessment[] {
  const seen = new Set<string>();
  return claims.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function findClaimById(evidenceState: EvidenceState, claimId: string): ClaimAssessment | undefined {
  return [...evidenceState.supported, ...evidenceState.unsupported].find(
    (item) => item.id === claimId,
  );
}

export function reevaluateKnowledgeState({
  evidenceState,
  mission,
  gap,
  evidence,
}: ReEvaluationInput): ReEvaluation {
  const now = new Date().toISOString();
  if (mission.evidenceGapId !== gap.id) {
    throw new Error(
      `Mission ${mission.id} references Gap ${mission.evidenceGapId}, not Gap ${gap.id}.`,
    );
  }

  const targetClaim = findClaimById(evidenceState, gap.affectedClaimId);
  if (!targetClaim) {
    throw new Error(
      `Gap ${gap.id} references missing Claim ${gap.affectedClaimId} in this Investigation.`,
    );
  }

  const missionEvidence = evidence.filter((record) => record.missionId === mission.id);
  const relevantEvidence = firstHandEvidence(missionEvidence);
  const stillUnsupported = uniqueClaims(evidenceState.unsupported);

  if (relevantEvidence.length === 0) {
    return {
      supportedNow: [],
      stillUnsupported,
      limitations: evidenceState.limitations,
      knowledgeState: KNOWLEDGE_STATE.UNRESOLVED,
      whyStateChanged:
        "目标 Mission 下没有同时满足“与 Gap 相关、第一手、包含可核对事件与本人判断”的 Evidence，因此 Knowledge State 保持不变。",
      updatedAt: now,
    };
  }

  const relevantEvidenceIds = relevantEvidence.map((record) => record.id);
  const supportedNow: ClaimAssessment[] = [
    {
      ...targetClaim,
      evidenceIds: uniqueIds([...targetClaim.evidenceIds, ...relevantEvidenceIds]),
    },
  ];

  const limitations = [
    ...evidenceState.limitations,
    SMALL_SAMPLE_LIMITATION,
    `当前只验证 Mission“${mission.title}”覆盖的单次观察，未建立总体统计。`,
  ];

  return {
    supportedNow,
    stillUnsupported: uniqueClaims(stillUnsupported.filter((item) => item.id !== targetClaim.id)),
    limitations,
    knowledgeState: KNOWLEDGE_STATE.EARLY_EVIDENCE,
    whyStateChanged: `Mission ${mission.id} → Gap ${gap.id} → Claim ${targetClaim.id} 的关联 Evidence ${relevantEvidenceIds.join(", ")} 属于 E1/E2 第一手观察；本次仅使用该 Mission 下的 Evidence。`,
    updatedAt: now,
  };
}
export function buildKnowledgeStateFromReevaluation(
  previous: KnowledgeState,
  reevaluation: ReEvaluation,
  evidenceCount: number,
): KnowledgeState {
  const status: KnowledgeStateStatus = reevaluation.knowledgeState;
  const supported = new Map(previous.supported.map((item) => [item.id, item]));
  for (const item of reevaluation.supportedNow) supported.set(item.id, item);
  return {
    status,
    evidenceCount,
    supported: [...supported.values()],
    unsupported: reevaluation.stillUnsupported,
    limitations: reevaluation.limitations,
    ...(status === KNOWLEDGE_STATE.UNRESOLVED && previous.nextGap
      ? { nextGap: previous.nextGap }
      : {}),
    updatedAt: reevaluation.updatedAt,
  };
}
