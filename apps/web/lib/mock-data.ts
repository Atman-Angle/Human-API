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
  discussions: [],
  discussionOrganizations: [],
  llmRuns: [],
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
  claims: MockClaim[];
  conflictText: string;
  gapText: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface MockClaim {
  id: string;
  text: string;
  supportCount: number;
  opposeCount: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export type ContributionType = "VIEWPOINT" | "COUNTEREXAMPLE" | "EVIDENCE";

export interface MockContribution {
  id: string;
  investigationId: string;
  type: ContributionType;
  author: string;
  summary: string;
  createdAt: string;
  grade?: string;
  impact?: string;
  accepted?: boolean;
}

const emptyClaims: MockClaim[] = [];

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
    claims: [
      {
        id: "mock-claim-1",
        text: "测试、调试、文档等具体编码任务正在转向 AI 生成 + 人工检查",
        supportCount: 5,
        opposeCount: 1,
        confidence: "MEDIUM",
      },
      {
        id: "mock-claim-2",
        text: "初级开发者岗位总量已经明显减少",
        supportCount: 2,
        opposeCount: 4,
        confidence: "LOW",
      },
    ],
    conflictText: "同一现象有两种解释：是任务结构变化，还是岗位总量变化，公开资料无法区分。",
    gapText: "缺少初级开发者本人最近一次真实任务变化的记录",
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
    claims: [
      {
        id: "mock-claim-3",
        text: "AI 能缩短资料理解和整理的时间",
        supportCount: 9,
        opposeCount: 1,
        confidence: "HIGH",
      },
      {
        id: "mock-claim-4",
        text: "AI 会自动提升长期记忆效果",
        supportCount: 2,
        opposeCount: 6,
        confidence: "LOW",
      },
    ],
    conflictText: "短期理解速度的提升，是否等于长期学习效果的提升，仍存在明显分歧。",
    gapText: "缺少同一学习者使用前后的对照记录",
  },
  {
    id: "mock-ai-agent",
    question: "AI Agent 会如何改变独立游戏开发者的日常工作？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 2,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "独立开发者 Alex",
    excerpt: "在引入 AI Agent 做自动化测试和素材生成后，开发节奏明显变快，但调试时间反而增加了。",
    discussionCount: 8,
    firstHandCount: 1,
    topic: "AI",
    claims: [
      {
        id: "mock-ai-agent-c1",
        text: "AI Agent 能显著缩短原型开发周期",
        supportCount: 7,
        opposeCount: 1,
        confidence: "HIGH",
      },
      {
        id: "mock-ai-agent-c2",
        text: "AI 生成的代码在边界条件下维护成本更高",
        supportCount: 4,
        opposeCount: 2,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "开发速度提升和调试成本增加是否抵消，不同项目类型差异很大。",
    gapText: "缺少独立开发者长期使用 AI Agent 的完整项目复盘记录",
    sourceUrl: "https://www.zhihu.com/question/648315287",
    sourceTitle: "知乎热榜 · AI Agent 实际应用体验",
  },
  {
    id: "mock-ai-design",
    question: "AI 生成 UI 设计稿真的能缩短产品迭代周期吗？",
    knowledgeState: "EARLY_EVIDENCE",
    missionCount: 1,
    evidenceCount: 5,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "产品设计师 Luna",
    excerpt: "用 AI 出初稿确实从两天缩到两小时，但团队沟通成本反而因为视觉风格不一致增加了。",
    discussionCount: 15,
    firstHandCount: 3,
    topic: "AI",
    claims: [
      {
        id: "mock-ai-design-c1",
        text: "AI 出图阶段效率提升 5-10 倍",
        supportCount: 11,
        opposeCount: 0,
        confidence: "HIGH",
      },
      {
        id: "mock-ai-design-c2",
        text: "AI 生成的风格一致性需要人工统一把控",
        supportCount: 8,
        opposeCount: 1,
        confidence: "HIGH",
      },
    ],
    conflictText: "出图效率提升明显，但维护设计系统一致性的工具有待成熟。",
    gapText: "缺少跨团队协作中使用 AI 设计工具的完整影响评估",
    sourceUrl: "https://www.zhihu.com/question/651234567",
    sourceTitle: "知乎热榜 · AI 设计工具实践",
  },
  {
    id: "mock-tech-auto",
    question: "自动驾驶真的能在三年内普及吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 3,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "汽车工程师老王",
    excerpt: "L4 在城市开放场景的决策可靠性仍然不稳定，但高速场景已经接近商业化。",
    discussionCount: 42,
    firstHandCount: 2,
    topic: "科技",
    claims: [
      {
        id: "mock-tech-auto-c1",
        text: "高速公路场景的 L4 自动驾驶 2 年内可商业化",
        supportCount: 6,
        opposeCount: 3,
        confidence: "MEDIUM",
      },
      {
        id: "mock-tech-auto-c2",
        text: "城市复杂路况的 L4 在 5 年内难以大规模推广",
        supportCount: 8,
        opposeCount: 1,
        confidence: "HIGH",
      },
    ],
    conflictText: "技术可行性和法规/保险等社会基础设施的成熟速度不同步。",
    gapText: "缺少一线测试工程师对不同场景真实表现的量化记录",
    sourceUrl: "https://www.zhihu.com/question/649872154",
    sourceTitle: "知乎热榜 · 自动驾驶进展讨论",
  },
  {
    id: "mock-tech-quantum",
    question: "量子计算离我们还有多远？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 1,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "物理爱好者小林",
    excerpt: "当前量子比特数虽然在增长，但错误纠正和实用算法之间的差距还很大。",
    discussionCount: 6,
    firstHandCount: 0,
    topic: "科技",
    claims: [
      {
        id: "mock-tech-quantum-c1",
        text: "量子-经典混合编程将在 3 年内出现首个主流框架",
        supportCount: 3,
        opposeCount: 2,
        confidence: "LOW",
      },
    ],
    conflictText: "量子优势的展示和实用化之间还有明确的工程鸿沟。",
    gapText: "缺少量子计算一线研究者的实际工程进度评估",
    sourceUrl: "https://www.zhihu.com/question/650123456",
    sourceTitle: "知乎热榜 · 量子计算进展",
  },
  {
    id: "mock-tech-chip",
    question: "AI 芯片的算力增长还能持续多久？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 2,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "芯片研究员 Sarah",
    excerpt: "3nm 以下制程的经济性在快速下降，但 Chiplet 和先进封装正在开辟新路线。",
    discussionCount: 31,
    firstHandCount: 1,
    topic: "科技",
    claims: [
      {
        id: "mock-tech-chip-c1",
        text: "3nm 以下制程的经济性在快速下降",
        supportCount: 7,
        opposeCount: 2,
        confidence: "HIGH",
      },
      {
        id: "mock-tech-chip-c2",
        text: "Chiplet 架构将成为算力增长的主要方式",
        supportCount: 6,
        opposeCount: 1,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "制程微缩放缓与架构创新之间的赛跑仍在继续。",
    gapText: "缺少芯片设计一线团队对 Chiplet 实际收益的量化数据",
    sourceUrl: "https://www.zhihu.com/question/651789012",
    sourceTitle: "知乎热榜 · AI 芯片发展趋势",
  },
  {
    id: "mock-prog-rust",
    question: "Rust 真的会成为系统编程的未来吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 2,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "系统开发者 Kyle",
    excerpt: "Linux 内核和 Android 都在引入 Rust，但学习曲线和生态成熟度仍是主要障碍。",
    discussionCount: 23,
    firstHandCount: 0,
    topic: "编程",
    claims: [
      {
        id: "mock-prog-rust-c1",
        text: "Rust 在安全关键领域的采用率在加速",
        supportCount: 9,
        opposeCount: 0,
        confidence: "HIGH",
      },
      {
        id: "mock-prog-rust-c2",
        text: "大规模遗留 C++ 项目的 Rust 化不具备经济合理性",
        supportCount: 5,
        opposeCount: 3,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "新项目选 Rust 还是 C++，取决于安全需求和现有生态依赖的权衡。",
    gapText: "缺少从 C++ 迁移到 Rust 的实际项目成本和收益对比",
    sourceUrl: "https://www.zhihu.com/question/648901234",
    sourceTitle: "知乎热榜 · Rust 生态发展",
  },
  {
    id: "mock-prog-ts",
    question: "TypeScript 的类型系统真的能减少生产事故吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 1,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "前端架构师 Anna",
    excerpt: "严格模式确实能提前发现很多类型错误，但运行时数据不合预期的情况反而增多了。",
    discussionCount: 19,
    firstHandCount: 0,
    topic: "编程",
    claims: [
      {
        id: "mock-prog-ts-c1",
        text: "strict 模式 + eslint 可以将 any 减少 80%",
        supportCount: 7,
        opposeCount: 1,
        confidence: "HIGH",
      },
      {
        id: "mock-prog-ts-c2",
        text: "运行时数据校验比编译期类型更能防止线上问题",
        supportCount: 3,
        opposeCount: 4,
        confidence: "LOW",
      },
    ],
    conflictText: "类型检查和运行时验证之间应该是互补而不是替代关系。",
    gapText: "缺少长期项目中 TS 类型系统的实际故障预防率数据",
    sourceUrl: "https://www.zhihu.com/question/652345678",
    sourceTitle: "知乎热榜 · TypeScript 类型实践",
  },
  {
    id: "mock-prog-fullstack",
    question: "全栈开发者还有前途吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 3,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "技术总监老张",
    excerpt: "0-3 年全栈确实成长更快，但 5 年后的薪资上限还是专精方向更有优势。",
    discussionCount: 45,
    firstHandCount: 1,
    topic: "编程",
    claims: [
      {
        id: "mock-prog-fullstack-c1",
        text: "0-3 年全栈路线成长速度更快",
        supportCount: 14,
        opposeCount: 5,
        confidence: "MEDIUM",
      },
      {
        id: "mock-prog-fullstack-c2",
        text: "5 年后专精方向的薪资显著高于全栈",
        supportCount: 8,
        opposeCount: 9,
        confidence: "LOW",
      },
    ],
    conflictText: "职业路线选择和个人发展阶段、市场需求高度相关。",
    gapText: "缺少同一批开发者在全栈和专精方向上的长期薪资跟踪数据",
    sourceUrl: "https://www.zhihu.com/question/650987654",
    sourceTitle: "知乎热榜 · 职业发展路径讨论",
  },
  {
    id: "mock-edu-online",
    question: "线上教育的效果真的被验证了吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 4,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "教育研究员陈老师",
    excerpt: "动手实操类课程线下优于线上约 40%，但理论课程线上和线下无显著差异。",
    discussionCount: 9,
    firstHandCount: 2,
    topic: "教育",
    claims: [
      {
        id: "mock-edu-online-c1",
        text: "动手实操类课程线下优于线上 40%",
        supportCount: 8,
        opposeCount: 1,
        confidence: "MEDIUM",
      },
      {
        id: "mock-edu-online-c2",
        text: "理论课程线上和线下学习效果无显著差异",
        supportCount: 10,
        opposeCount: 2,
        confidence: "HIGH",
      },
    ],
    conflictText: "不同课程类型的线上效果差异巨大，需要细分讨论。",
    gapText: "缺少细分学科和不同学习阶段的线上效果对比数据",
    sourceUrl: "https://www.zhihu.com/question/649012345",
    sourceTitle: "知乎热榜 · 在线教育效果讨论",
  },
  {
    id: "mock-edu-self",
    question: "自学编程到底可不可行？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 3,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "自学转行者小王",
    excerpt: "自学在 Web 开发等应用领域入门确实更快，但底层原理和调试能力需要系统训练。",
    discussionCount: 34,
    firstHandCount: 1,
    topic: "教育",
    claims: [
      {
        id: "mock-edu-self-c1",
        text: "自学在 Web 开发等应用领域的入门速度更快",
        supportCount: 12,
        opposeCount: 1,
        confidence: "HIGH",
      },
      {
        id: "mock-edu-self-c2",
        text: "系统训练在底层原理和调试能力上有持续优势",
        supportCount: 9,
        opposeCount: 2,
        confidence: "HIGH",
      },
    ],
    conflictText: "自学和系统训练不是非此即彼，关键在于学习阶段和目标。",
    gapText: "缺少自学者和科班生在 2-3 年后的能力对比追踪数据",
    sourceUrl: "https://www.zhihu.com/question/651234098",
    sourceTitle: "知乎热榜 · 自学编程讨论",
  },
  {
    id: "mock-career-remote",
    question: "远程工作到底是自由还是孤独？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 4,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "远程工作者 Mike",
    excerpt: "效率确实提升了 20-30%，但晋升和涨薪的概率明显低于办公室同事。",
    discussionCount: 56,
    firstHandCount: 2,
    topic: "职场",
    claims: [
      {
        id: "mock-career-remote-c1",
        text: "远程工作提升个人效率 20-30%",
        supportCount: 15,
        opposeCount: 2,
        confidence: "HIGH",
      },
      {
        id: "mock-career-remote-c2",
        text: "远程工作显著降低晋升和涨薪概率",
        supportCount: 11,
        opposeCount: 3,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "效率提升和职业发展之间的权衡因人因公司而异。",
    gapText: "缺少远程工作者 1-3 年内的实际晋升和薪资变化对比数据",
    sourceUrl: "https://www.zhihu.com/question/652109876",
    sourceTitle: "知乎热榜 · 远程工作体验",
  },
  {
    id: "mock-career-ai-ready",
    question: "AI 时代职场人需要什么新技能？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 2,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "职场培训师 Lisa",
    excerpt: "AI 工具的熟练度已成为非技术岗的硬门槛，跨领域判断能力的薪资溢价在 30% 以上。",
    discussionCount: 38,
    firstHandCount: 0,
    topic: "职场",
    claims: [
      {
        id: "mock-career-ai-ready-c1",
        text: "AI 工具的熟练度已成为非技术岗的硬门槛",
        supportCount: 18,
        opposeCount: 0,
        confidence: "HIGH",
      },
      {
        id: "mock-career-ai-ready-c2",
        text: "跨领域判断能力的薪资溢价在 30% 以上",
        supportCount: 7,
        opposeCount: 3,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "技能需求变化速度超过培训体系的更新速度。",
    gapText: "缺少企业招聘中对 AI 相关技能的实际要求和薪资变化数据",
    sourceUrl: "https://www.zhihu.com/question/651678901",
    sourceTitle: "知乎热榜 · AI 职场技能",
  },
  {
    id: "mock-career-35",
    question: "35 岁危机的本质到底是什么？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 4,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "职业规划师 Tom",
    excerpt: "与其说是年龄问题，不如说是成本结构和技能折旧率之间的矛盾在 35 岁集中暴露。",
    discussionCount: 67,
    firstHandCount: 1,
    topic: "职场",
    claims: [
      {
        id: "mock-career-35-c1",
        text: "35 岁问题是互联网行业高薪+快迭代模式的系统性结果",
        supportCount: 16,
        opposeCount: 1,
        confidence: "HIGH",
      },
      {
        id: "mock-career-35-c2",
        text: "有管理经验的 35+ 开发者反而更抢手",
        supportCount: 8,
        opposeCount: 6,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "年龄和薪资脱钩的速度低于技能和需求脱钩的速度才是真正问题。",
    gapText: "缺少 35 岁前后同一批开发者的职位和薪资变化对比数据",
    sourceUrl: "https://www.zhihu.com/question/650456789",
    sourceTitle: "知乎热榜 · 35 岁危机探讨",
  },
  {
    id: "mock-digital-vision",
    question: "空间计算的真正落地场景在哪里？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 3,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "XR 开发者小马",
    excerpt: "工业培训和远程协作是目前最扎实的应用场景，消费级杀手应用还在探索中。",
    discussionCount: 14,
    firstHandCount: 1,
    topic: "数码",
    claims: [
      {
        id: "mock-digital-vision-c1",
        text: "B 端工业培训 ROI 已经可以被量化验证",
        supportCount: 6,
        opposeCount: 0,
        confidence: "HIGH",
      },
      {
        id: "mock-digital-vision-c2",
        text: "消费级空间计算还需要 3-5 年成熟",
        supportCount: 5,
        opposeCount: 1,
        confidence: "MEDIUM",
      },
    ],
    conflictText: "B 端已验证和 C 端待爆发之间的时间窗口在拉长。",
    gapText: "缺少一线部署空间计算方案的实际成本收益分析",
    sourceUrl: "https://www.zhihu.com/question/648765432",
    sourceTitle: "知乎热榜 · 空间计算趋势",
  },
  {
    id: "mock-digital-phone",
    question: "折叠屏手机的短板真的被解决了吗？",
    knowledgeState: "UNRESOLVED",
    missionCount: 1,
    evidenceCount: 2,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "数码博主阿泽",
    excerpt: "屏幕耐用性和软件适配在最新一代有明显改善，但折痕和重量仍是物理限制。",
    discussionCount: 22,
    firstHandCount: 0,
    topic: "数码",
    claims: [
      {
        id: "mock-digital-phone-c1",
        text: "最新 UTG 玻璃的折痕寿命已达 20 万次",
        supportCount: 5,
        opposeCount: 2,
        confidence: "MEDIUM",
      },
      {
        id: "mock-digital-phone-c2",
        text: "折叠屏的软件生态适配覆盖率不足 60%",
        supportCount: 7,
        opposeCount: 1,
        confidence: "HIGH",
      },
    ],
    conflictText: "硬件提升很快，但软件生态的适配速度跟不上硬件迭代。",
    gapText: "缺少长期使用折叠屏用户的实际故障和维修记录",
    sourceUrl: "https://www.zhihu.com/question/651234567",
    sourceTitle: "知乎热榜 · 折叠屏手机讨论",
  },
  {
    id: "mock-digital-watch",
    question: "智能手表的健康监测数据到底有多可靠？",
    knowledgeState: "EARLY_EVIDENCE",
    missionCount: 1,
    evidenceCount: 6,
    createdAt: "2026-09-14T08:00:00.000Z",
    updatedAt: now,
    author: "可穿戴设备研究员 Dr.Wang",
    excerpt: "心率和血氧在运动场景下已经足够可靠，但血压和血糖的传感器精度还存在明显局限。",
    discussionCount: 18,
    firstHandCount: 2,
    topic: "数码",
    claims: [
      {
        id: "mock-digital-watch-c1",
        text: "光学心率传感器在静息状态下误差 < 3%",
        supportCount: 8,
        opposeCount: 0,
        confidence: "HIGH",
      },
      {
        id: "mock-digital-watch-c2",
        text: "无创血糖监测的精度仍无法临床使用",
        supportCount: 10,
        opposeCount: 1,
        confidence: "HIGH",
      },
    ],
    conflictText: "消费级健康数据的法律定位和医疗级之间还有明确界限。",
    gapText: "缺少智能手表数据与临床设备数据的长期同步对比记录",
    sourceUrl: "https://www.zhihu.com/question/652098765",
    sourceTitle: "知乎热榜 · 智能手表健康监测",
  },
];
export const MOCK_CONTRIBUTIONS: Record<string, MockContribution[]> = {
  "mock-ai-coding": [
    {
      id: "mock-c-1",
      investigationId: "mock-ai-coding",
      type: "VIEWPOINT",
      author: "匿名用户",
      summary: "我所在的团队把单元测试交给 AI 起草，但边界用例仍由人工补充。",
      createdAt: "2026-09-13T06:10:00.000Z",
    },
    {
      id: "mock-c-2",
      investigationId: "mock-ai-coding",
      type: "COUNTEREXAMPLE",
      author: "后端老张",
      summary: "在金融合规场景里，AI 生成的测试无法直接使用，仍需人工从零设计。",
      createdAt: "2026-09-13T05:40:00.000Z",
    },
    {
      id: "mock-c-3",
      investigationId: "mock-ai-coding",
      type: "EVIDENCE",
      author: "实习生 A",
      summary: "提交了自己三个月的实习任务记录，说明测试用例的起草方式变化。",
      createdAt: "2026-09-13T05:05:00.000Z",
      grade: "E1_FIRST_HAND",
      impact: "推动状态 UNRESOLVED → EARLY_EVIDENCE",
      accepted: true,
    },
  ],
  "mock-ai-learning": [
    {
      id: "mock-c-4",
      investigationId: "mock-ai-learning",
      type: "EVIDENCE",
      author: "某大学生",
      summary: "记录了一次用 AI 整理教材后自测的学习过程，并说明哪些部分仍需自己重写。",
      createdAt: "2026-09-13T04:50:00.000Z",
      grade: "E1_FIRST_HAND",
      impact: "推动状态 UNRESOLVED → EARLY_EVIDENCE",
      accepted: true,
    },
    {
      id: "mock-c-5",
      investigationId: "mock-ai-learning",
      type: "COUNTEREXAMPLE",
      author: "备考者小林",
      summary: "连续使用 AI 总结后，做题正确率没有提高，反而更依赖提示。",
      createdAt: "2026-09-13T04:20:00.000Z",
    },
  ],
};

export function listMockContributions(investigationId: string): MockContribution[] {
  return MOCK_CONTRIBUTIONS[investigationId] ?? [];
}

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
    claims: emptyClaims,
    conflictText: "公开信息来源不足，当前还没有形成可比较的分歧。",
    gapText: "缺少与该问题直接相关的第一手经历",
    sourceUrl: undefined,
    sourceTitle: undefined,
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

// --- 热榜生成帖子功能 ---

export function generatePostsFromHotList(
  hotItems: Array<{ title: string; url: string; summary: string }>,
  count: number = 2,
): MockFeedItem[] {
  const now = new Date().toISOString();
  // Fisher-Yates shuffle for random selection
  const shuffled = [...hotItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const items = shuffled.slice(0, Math.min(count, shuffled.length));

  const TOPIC_RULES: Array<{ keywords: string[]; topic: string }> = [
    {
      keywords: ["AI", "人工智能", "大模型", "GPT", "ChatGPT", "Claude", "智能", "算法", "数据"],
      topic: "AI",
    },
    {
      keywords: [
        "科技",
        "芯片",
        "半导体",
        "量子",
        "自动驾驶",
        "航天",
        "5G",
        "6G",
        "电池",
        "新能源",
      ],
      topic: "科技",
    },
    {
      keywords: [
        "编程",
        "代码",
        "Rust",
        "TypeScript",
        "Python",
        "Java",
        "前端",
        "后端",
        "开源",
        "Git",
        "框架",
      ],
      topic: "编程",
    },
    {
      keywords: ["教育", "学习", "考试", "大学", "考研", "留学", "培训", "课程", "老师", "学生"],
      topic: "教育",
    },
    {
      keywords: ["职场", "工作", "面试", "薪资", "裁员", "招聘", "35", "晋升", "简历", "offer"],
      topic: "职场",
    },
    {
      keywords: [
        "数码",
        "手机",
        "电脑",
        "耳机",
        "平板",
        "折叠屏",
        "手表",
        "相机",
        "显示器",
        "VR",
        "AR",
      ],
      topic: "数码",
    },
  ];

  function matchTopic(title: string): string {
    for (const rule of TOPIC_RULES) {
      for (const kw of rule.keywords) {
        if (title.includes(kw)) return rule.topic;
      }
    }
    return "推荐";
  }

  return items.map((item, i) => {
    const id = "hotgen-" + Date.now() + "-" + i;
    const topic = matchTopic(item.title);
    const excerpt = item.summary || "来自知乎热榜的精选话题，Agent 正在自动整理公开信息。";

    return {
      id,
      question: item.title,
      knowledgeState: "UNRESOLVED" as const,
      missionCount: 1,
      evidenceCount: 0,
      createdAt: now,
      updatedAt: now,
      author: "知乎热榜",
      excerpt,
      discussionCount: 0,
      firstHandCount: 0,
      topic,
      claims: [],
      conflictText: "暂未形成可比较的分歧，需要更多公开讨论。",
      gapText: "缺少与该问题直接相关的第一手经历",
      sourceUrl: item.url,
      sourceTitle: item.title,
    };
  });
}
