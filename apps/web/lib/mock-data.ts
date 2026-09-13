import type {
  EvidenceMission,
  EvidenceRecord,
  EvidenceSubmission,
  ImpactReceipt,
  Investigation,
  InvestigationListItem,
  SourceRef,
} from "@human-api/contracts";

const now = "2026-09-13T09:30:00.000Z";

const source = (
  id: string,
  provider: "ZHIHU" | "GLOBAL",
  title: string,
  excerpt: string,
): SourceRef => ({
  id,
  provider,
  contentId: id,
  contentType: "Article",
  title,
  url: `https://example.com/source/${id}`,
  authorName: provider === "ZHIHU" ? "知乎用户" : "公开资料整理",
  excerpt,
  publishedAt: "2026-09-12T08:00:00.000Z",
  authorityLevel: "4",
  voteUpCount: 128,
  commentCount: 36,
});

const aiSources = [
  source(
    "mock-ai-zhihu-1",
    "ZHIHU",
    "AI Coding 正在改变初级开发者的工作方式",
    "代码生成、测试与调试正在更多采用 AI 生成加人工检查的方式。",
  ),
  source(
    "mock-ai-zhihu-2",
    "ZHIHU",
    "AI 时代，初级程序员还需要练习什么？",
    "真实开发者仍然需要理解业务边界、验证输出并承担最终责任。",
  ),
  source(
    "mock-ai-global-1",
    "GLOBAL",
    "Developers are becoming reviewers",
    "公开研究显示，编码执行正在被自动化，判断与验收的重要性上升。",
  ),
  source(
    "mock-ai-global-2",
    "GLOBAL",
    "The junior developer learning gap",
    "公开讨论尚不足以证明初级岗位数量已经发生稳定变化。",
  ),
];

const learningSources = [
  source(
    "mock-learning-zhihu-1",
    "ZHIHU",
    "AI 学习工具真的提高效率吗？",
    "学习者普遍提到理解速度变快，但注意力和复盘质量仍有差异。",
  ),
  source(
    "mock-learning-global-1",
    "GLOBAL",
    "How students use AI to study",
    "学习效率的变化依赖任务类型、基础能力和使用方式。",
  ),
];

const aiGap = {
  id: "mock-ai-gap",
  claim: "AI Coding 实际改变了初级开发者哪些工作？",
  affectedClaim: "部分具体编码任务正在从人工执行转向 AI 生成 + 人工检查。",
  affectedClaimId: "mock-ai-claim-task",
  whyUnresolved: "公开资料多是观点或二手总结，缺少目标人群最近一次真实工作的具体过程。",
  missingObservation:
    "最近使用 AI Coding 的学生、实习生或 0–3 年开发者，请描述一次任务变化，以及你最后保留的判断。",
  targetParticipants: ["学生开发者", "实习生", "0–3 年开发者"],
  expectedValue: "补充一条具体的一手经历，验证任务到底发生了怎样的变化。",
};

const learningGap = {
  id: "mock-learning-gap",
  claim: "AI 学习工具真的能提高学习效率吗？",
  affectedClaim: "AI 可能缩短资料理解时间，但学习效果仍取决于是否主动复盘。",
  affectedClaimId: "mock-learning-claim-efficiency",
  whyUnresolved: "公开讨论缺少同一学习者在具体任务中的前后对照经历。",
  missingObservation:
    "最近 30 天使用 AI 学习工具的人，请描述一次具体学习任务、AI 介入方式和你如何确认自己真的学会了。",
  targetParticipants: ["大学生", "备考者", "职场学习者"],
  expectedValue: "把“效率提高”拆成一次可描述、可核对的学习经历。",
};

const mission = (id: string, investigationId: string, gap: typeof aiGap): EvidenceMission => ({
  id,
  investigationId,
  evidenceGapId: gap.id,
  title: `记录一次与“${gap.claim}”相关的真实经历`,
  description: gap.missingObservation,
  qualification: gap.targetParticipants,
  questions: [
    {
      id: "participantType",
      kind: "SINGLE_SELECT",
      prompt: "你与这次经历最接近的身份是什么？",
      options: gap.targetParticipants,
      required: true,
    },
    {
      id: "timeframe",
      kind: "SINGLE_SELECT",
      prompt: "这次经历大约发生在什么时候？",
      options: ["最近 24 小时", "最近 7 天", "最近 30 天", "更早"],
      required: true,
    },
    { id: "task", kind: "SHORT_TEXT", prompt: "具体发生在什么任务或场景？", required: true },
    { id: "aiRole", kind: "SHORT_TEXT", prompt: "AI 具体介入了哪一个环节？", required: true },
    { id: "humanJudgment", kind: "SHORT_TEXT", prompt: "你最后如何判断或处理？", required: true },
    { id: "artifactUrl", kind: "URL", prompt: "可选：提供相关材料链接", required: false },
  ],
  status: "OPEN",
  estimatedSeconds: 50,
  createdAt: now,
  updatedAt: now,
});

const makeInvestigation = (
  id: string,
  question: string,
  gap: typeof aiGap,
  sources: SourceRef[],
  known: string[],
  supportedClaim: string,
): Investigation => ({
  id,
  question,
  searches: {
    zhihu: {
      query: question,
      provider: "ZHIHU",
      provenance: "GOLDEN_FIXTURE",
      items: sources.filter((item) => item.provider === "ZHIHU"),
      hasMore: false,
      retrievedAt: now,
      limitations: ["当前为 Mock 数据，仅用于前端交互演示。"],
    },
    global: {
      query: question,
      provider: "GLOBAL",
      provenance: "GOLDEN_FIXTURE",
      items: sources.filter((item) => item.provider === "GLOBAL"),
      hasMore: false,
      retrievedAt: now,
      limitations: ["当前为 Mock 数据，仅用于前端交互演示。"],
    },
  },
  evidenceState: {
    known,
    disagreements: ["公开资料对同一现象存在不同解释，当前还不能代表所有人的经历。"],
    supported: [
      {
        id: gap.affectedClaimId,
        claim: supportedClaim,
        rationale: "当前判断来自公开资料中的重复任务描述。",
        sourceRefIds: sources.map((item) => item.id),
        evidenceIds: [],
      },
    ],
    unsupported: [
      {
        id: "mock-unsupported",
        claim: "当前资料不足以推出总体趋势。",
        rationale: "还缺少目标人群的一手观察和样本边界。",
        sourceRefIds: sources.slice(0, 2).map((item) => item.id),
        evidenceIds: [],
      },
    ],
    limitations: ["当前数据为 Mock，不代表实时检索。", "单次观察不能外推为总体结论。"],
    candidateGap: gap,
    gapSuitability: {
      status: "MISSION_READY",
      singleObservation: true,
      lowHumanCost: true,
      decisionImpact: true,
      prevalenceRisk: false,
      standardizedMeasurementDependency: false,
      reason: "该缺口适合通过一次具体真人经历补充。",
    },
    nextGap: gap,
  },
  actions: [
    "SEARCH_ZHIHU",
    "SEARCH_WEB",
    "ASSESS_EVIDENCE",
    "ASSESS_GAP_SUITABILITY",
    "CREATE_MISSION",
    "STOP",
  ],
  missions: [mission(`${id}-mission`, id, gap)],
  evidence: [],
  knowledgeState: {
    status: "UNRESOLVED",
    evidenceCount: 0,
    supported: [
      {
        id: gap.affectedClaimId,
        claim: supportedClaim,
        rationale: "当前判断来自公开资料中的重复任务描述。",
        sourceRefIds: sources.map((item) => item.id),
        evidenceIds: [],
      },
    ],
    unsupported: [
      {
        id: "mock-unsupported",
        claim: "当前资料不足以推出总体趋势。",
        rationale: "还缺少目标人群的一手观察和样本边界。",
        sourceRefIds: sources.slice(0, 2).map((item) => item.id),
        evidenceIds: [],
      },
    ],
    limitations: ["当前数据为 Mock，不代表实时检索。", "单次观察不能外推为总体结论。"],
    nextGap: gap,
    updatedAt: now,
  },
  createdAt: now,
  updatedAt: now,
});

export const MOCK_INVESTIGATIONS: Investigation[] = [
  makeInvestigation(
    "mock-ai-coding",
    "AI Coding 会让初级程序员失业吗？",
    aiGap,
    aiSources,
    [
      "公开资料反复提到代码生成、测试、调试和文档任务正在引入 AI。",
      "人仍然需要检查业务语义、异常边界和最终结果。",
    ],
    "部分具体编码任务正在从人工执行转向 AI 生成 + 人工检查。",
  ),
  makeInvestigation(
    "mock-ai-learning",
    "AI 学习真的能提高学习效率吗？",
    learningGap,
    learningSources,
    ["AI 可以降低资料整理和概念解释的成本。", "学习效率的提升依赖任务类型、基础能力和主动复盘。"],
    "AI 可能缩短资料理解时间，但学习效果仍取决于是否主动复盘。",
  ),
];

export interface MockFeedItem extends InvestigationListItem {
  author: string;
  excerpt: string;
  discussionCount: number;
  firstHandCount: number;
  topic: string;
}

export const MOCK_FEED_ITEMS: MockFeedItem[] = [
  {
    id: "mock-ai-coding",
    question: "AI Coding 会让初级程序员失业吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 0,
    createdAt: "2026-09-13T07:30:00.000Z",
    updatedAt: now,
    author: "开发者小明",
    excerpt:
      "最近使用 Cursor 做项目之后，我发现很多原本自己写的测试和调试工作，已经变成了 AI 先做、人来验收。",
    discussionCount: 18,
    firstHandCount: 0,
    topic: "AI",
  },
  {
    id: "mock-ai-learning",
    question: "AI 学习真的能提高学习效率吗？",
    knowledgeState: "EARLY_EVIDENCE",
    missionCount: 1,
    evidenceCount: 12,
    createdAt: "2026-09-13T04:30:00.000Z",
    updatedAt: now,
    author: "某大学生",
    excerpt: "我用 AI 做资料整理之后，理解新概念快了很多，但真正能不能记住，还是取决于后面的复盘。",
    discussionCount: 12,
    firstHandCount: 4,
    topic: "教育",
  },
];

const mockInvestigationStore: Investigation[] = [...MOCK_INVESTIGATIONS];
const mockFeedStore: MockFeedItem[] = [...MOCK_FEED_ITEMS];

export function listMockInvestigations(): MockFeedItem[] {
  return [...mockFeedStore];
}

export function getMockInvestigation(id: string): Investigation | undefined {
  return mockInvestigationStore.find((item) => item.id === id);
}

export function createMockInvestigation(question: string): Investigation {
  const base = mockInvestigationStore[0];
  if (!base) throw new Error("Mock Investigation base is missing.");
  const id = `mock-${Date.now()}`;
  const investigation: Investigation = {
    ...base,
    id,
    question,
    searches: {
      ...base.searches,
      zhihu: { ...base.searches.zhihu, query: question },
      global: { ...base.searches.global, query: question },
    },
    evidenceState: {
      ...base.evidenceState,
      candidateGap: {
        ...base.evidenceState.candidateGap!,
        claim: question,
        affectedClaim: question,
      },
      nextGap: { ...base.evidenceState.nextGap!, claim: question, affectedClaim: question },
    },
    missions: base.missions.map((item) => ({
      ...item,
      id: `${id}-mission`,
      investigationId: id,
      title: `记录一次与“${question}”相关的真实经历`,
    })),
  };
  mockInvestigationStore.unshift(investigation);
  mockFeedStore.unshift(mockInvestigationToListItem(investigation));
  return investigation;
}

export function mockInvestigationToListItem(investigation: Investigation): MockFeedItem {
  return {
    id: investigation.id,
    question: investigation.question,
    knowledgeState: investigation.knowledgeState.status,
    missionCount: investigation.missions.length,
    evidenceCount: investigation.evidence.length,
    createdAt: investigation.createdAt,
    updatedAt: investigation.updatedAt,
    author: "我发起的求证",
    excerpt: "这是刚刚发起的求证，Agent 正在整理公开资料和知识边界。",
    discussionCount: 0,
    firstHandCount: 0,
    topic: "推荐",
  };
}

export function submitMockEvidence(
  investigation: Investigation,
  mission: EvidenceMission,
  submission: EvidenceSubmission,
): { record: EvidenceRecord; receipt: ImpactReceipt; investigation: Investigation } {
  const nowValue = new Date().toISOString();
  const complete = Boolean(
    submission.participantType &&
    submission.experience &&
    submission.task &&
    submission.aiRole &&
    submission.humanJudgment,
  );
  const grade = complete
    ? submission.artifactUrl
      ? "E2_ARTIFACT_BACKED"
      : "E1_FIRST_HAND"
    : "E0_OPINION";
  const matchesGap = complete;
  const record: EvidenceRecord = {
    id: `mock-evidence-${Date.now()}`,
    missionId: mission.id,
    participantType: submission.participantType ?? "未声明",
    submission,
    observation:
      [submission.experience, submission.task, submission.aiRole, submission.humanJudgment]
        .filter(Boolean)
        .join("；") || submission.statement,
    grade,
    gradeReason: matchesGap
      ? "提供了本人具体经历、任务、AI 介入方式和最终判断，属于可用于当前求证的第一手观察。"
      : "内容还不完整，暂时无法判断为可核验的第一手观察。",
    matchesGap,
    createdAt: nowValue,
  };
  const nextStatus = matchesGap ? "EARLY_EVIDENCE" : investigation.knowledgeState.status;
  const gap = investigation.evidenceState.nextGap;
  const nextInvestigation: Investigation = {
    ...investigation,
    evidence: [...investigation.evidence, record],
    knowledgeState: {
      ...investigation.knowledgeState,
      status: nextStatus,
      evidenceCount: investigation.knowledgeState.evidenceCount + 1,
      ...(matchesGap && gap
        ? {
            supported: [
              ...investigation.knowledgeState.supported,
              {
                id: `mock-supported-${record.id}`,
                claim: gap.claim,
                rationale: "新增一条与当前 Gap 直接相关的第一手观察。",
                sourceRefIds: [],
                evidenceIds: [record.id],
              },
            ],
          }
        : {}),
      updatedAt: nowValue,
    },
    reevaluation: {
      supportedNow:
        matchesGap && gap
          ? [
              {
                id: `mock-supported-${record.id}`,
                claim: gap.claim,
                rationale: "新增一条与当前 Gap 直接相关的第一手观察。",
                sourceRefIds: [],
                evidenceIds: [record.id],
              },
            ]
          : [],
      stillUnsupported: investigation.knowledgeState.unsupported,
      limitations: investigation.knowledgeState.limitations,
      knowledgeState: nextStatus,
      whyStateChanged: matchesGap
        ? "新增的真实经历与当前 Evidence Gap 相关，因此 Knowledge State 从 UNRESOLVED 推进到 EARLY_EVIDENCE。"
        : "这次提交信息不足，Knowledge State 保持不变。",
      updatedAt: nowValue,
    },
    updatedAt: nowValue,
  };
  const receipt: ImpactReceipt = {
    evidenceId: record.id,
    missionId: mission.id,
    investigationId: investigation.id,
    accepted: matchesGap,
    grade,
    affectedClaimId: gap?.affectedClaimId ?? "mock-unknown-claim",
    stateBefore: investigation.knowledgeState.status,
    stateAfter: nextStatus,
    impactSummary: matchesGap
      ? "这条观察已进入当前求证链路，并帮助验证一个具体 Claim。"
      : "这条提交暂未进入当前求证链路。",
    stillMissing: nextInvestigation.knowledgeState.limitations,
    createdAt: nowValue,
  };
  return { record, receipt, investigation: nextInvestigation };
}
