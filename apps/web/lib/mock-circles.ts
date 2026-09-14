// 圈子（Circle）与 Agent 聚合帖的演示数据。
// 圈子不是求证：Agent 先对该圈子在知乎的讨论做一轮检索，再把分散的提问与回答
// 聚类整合，重新生成标题清晰的帖子。求证是另一条产品线（针对具体问题收集真人证据）。

const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export interface MockCircle {
  slug: string;
  name: string;
  tagline: string;
  memberLabel: string;
  /** Agent 已检索的知乎讨论条数 */
  discussionCount: number;
  /** 覆盖的话题数 */
  topicCount: number;
  updatedAt: string;
}

export interface MockPostQuote {
  author: string;
  excerpt: string;
  voteUpCount: number;
}

export interface MockPost {
  id: string;
  circleSlug: string;
  circleName: string;
  /** Agent 重新生成的清晰标题 */
  title: string;
  summary: string;
  keyPoints: string[];
  /** 被整合进来的原始提问（标题零散、重复） */
  mergedQuestions: string[];
  sourceTopics: string[];
  quotes: MockPostQuote[];
  /** 引用的知乎讨论数 */
  sourceCount: number;
  /** 引用的回答数 */
  answerCount: number;
  heat: number;
  /** Agent 指出的知识边界：帖子无法确认的部分 */
  frontier: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_CIRCLES: MockCircle[] = [
  {
    slug: "ai",
    name: "AI",
    tagline: "模型、工具与工作方式的变化",
    memberLabel: "38.6 万人关注",
    discussionCount: 412,
    topicCount: 37,
    updatedAt: hoursAgo(2),
  },
  {
    slug: "code",
    name: "编程",
    tagline: "工程实践、语言与职业路径",
    memberLabel: "47.3 万人关注",
    discussionCount: 298,
    topicCount: 26,
    updatedAt: hoursAgo(4),
  },
  {
    slug: "tech",
    name: "科技",
    tagline: "硬件、芯片与产业进展",
    memberLabel: "52.1 万人关注",
    discussionCount: 356,
    topicCount: 29,
    updatedAt: hoursAgo(5),
  },
  {
    slug: "edu",
    name: "教育",
    tagline: "学习方式、考试与 AI 辅助",
    memberLabel: "29.4 万人关注",
    discussionCount: 187,
    topicCount: 21,
    updatedAt: hoursAgo(7),
  },
  {
    slug: "work",
    name: "职场",
    tagline: "组织、薪酬与职业选择",
    memberLabel: "33.8 万人关注",
    discussionCount: 243,
    topicCount: 24,
    updatedAt: hoursAgo(6),
  },
  {
    slug: "digital",
    name: "数码",
    tagline: "手机、电脑与消费电子",
    memberLabel: "41.2 万人关注",
    discussionCount: 264,
    topicCount: 22,
    updatedAt: hoursAgo(9),
  },
];

export const MOCK_POSTS: MockPost[] = [
  {
    id: "post-ai-coding-usage",
    circleSlug: "ai",
    circleName: "AI",
    title: "AI 编码工具在真实项目里的三种用法：补全、生成测试、重构遗留代码",
    summary:
      "把知乎上相关讨论按「实际怎么用」聚类之后，能稳定复现的收益集中在重复度高、验证成本低的环节；一旦涉及业务语义判断，人工成本并没有消失，只是从写代码前移到了验收。",
    keyPoints: [
      "补全与样板代码：收益最稳定，几乎没有分歧",
      "生成测试：取决于是否已有明确的验收标准，否则只是把返工提前",
      "重构遗留代码：需要人先补齐上下文，AI 只能局部加速",
    ],
    mergedQuestions: [
      "Cursor 到底好不好用？",
      "AI 写代码靠谱吗？",
      "用 AI 重构老项目的一点感受",
    ],
    sourceTopics: ["AI 编程", "Cursor", "代码审查"],
    quotes: [
      {
        author: "某后端工程师",
        excerpt:
          "接口层的样板代码交给 AI 之后确实省时间，省下来的时间基本又花在 review 上，但整体还是赚的。",
        voteUpCount: 1263,
      },
      {
        author: "独立开发者",
        excerpt: "真正卡住我的从来不是敲代码，而是先想清楚要写成什么样。",
        voteUpCount: 842,
      },
    ],
    sourceCount: 18,
    answerCount: 46,
    heat: 1280,
    frontier: "缺少同一个项目在使用前后的人天对照数据，所以「省了多少」只能靠个人体感。",
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(2),
  },
  {
    id: "post-ai-search-vs-partner",
    circleSlug: "ai",
    circleName: "AI",
    title: "把 AI 当搜索引擎和把 AI 当同事用，长期结果差在哪",
    summary:
      "两类用法在知乎讨论里被反复区分：前者要求答案直接可用，因此最容易遇到幻觉；后者把 AI 放在草稿、对照、反复追问的位置上，收益更慢但更稳。",
    keyPoints: [
      "当搜索用：对事实类问题的容错最低，需要人工核对来源",
      "当同事用：先要过程再要结论，明显减少被带偏的概率",
      "共同前提：自己得能判断结果对不对，否则只是换了个出错方式",
    ],
    mergedQuestions: [
      "为什么 AI 总是胡说八道？",
      "怎么提问才能让 AI 更有用？",
      "AI 能不能替代搜索",
    ],
    sourceTopics: ["提示词", "AI 幻觉", "人机协作"],
    quotes: [
      {
        author: "产品经理",
        excerpt: "我把 AI 的答案当成「一份待核对的草稿」之后，返工反而少了。",
        voteUpCount: 674,
      },
      {
        author: "高校教师",
        excerpt: "学生最大的问题不是用 AI，而是没有能力判断 AI 给的对不对。",
        voteUpCount: 921,
      },
    ],
    sourceCount: 15,
    answerCount: 38,
    heat: 940,
    frontier: "公开讨论缺少可对比的任务清单，无法量化两类用法的时间差。",
    createdAt: hoursAgo(46),
    updatedAt: hoursAgo(6),
  },
  {
    id: "post-code-api-design",
    circleSlug: "code",
    circleName: "编程",
    title: "后端接口设计的真实取舍：REST、GraphQL 与 RPC 在不同规模团队里的边界",
    summary:
      "讨论里最常见的分歧不在技术优劣，而在团队规模与协作方式：接口给外部还是内部用、调用方能不能改、谁来承担版本成本，决定了选型结果。",
    keyPoints: [
      "对外接口：显式版本与稳定契约优先，REST 通信成本最低",
      "内部高频联调：GraphQL 减少来回改接口，但对可观测性要求更高",
      "服务间调用：RPC 更贴近性能与类型约束，代价是跨团队理解成本",
    ],
    mergedQuestions: [
      "GraphQL 到底解决了什么问题？",
      "为什么大厂还在用 REST？",
      "微服务之间该用什么协议",
    ],
    sourceTopics: ["接口设计", "GraphQL", "微服务"],
    quotes: [
      {
        author: "某电商后端",
        excerpt: "我们换 GraphQL 的动机是前端不想每次加字段都排期，不是因为它更快。",
        voteUpCount: 1130,
      },
      {
        author: "基础架构工程师",
        excerpt: "跨团队调用最后拼的是契约是否稳定，不是协议本身好不好看。",
        voteUpCount: 588,
      },
    ],
    sourceCount: 21,
    answerCount: 52,
    heat: 1180,
    frontier: "缺少同一业务在两种协议下的维护成本对照，多数结论依赖团队自述。",
    createdAt: hoursAgo(52),
    updatedAt: hoursAgo(4),
  },
  {
    id: "post-code-career-35",
    circleSlug: "code",
    circleName: "编程",
    title: "35 岁之后的技术路线：管理、专家与独立开发三条路的分岔点",
    summary:
      "把相关讨论按「分岔点」归类后可以看到，真正的差异不是年龄，而是从某个时间点开始，产出是以个人为单位计算，还是以团队和业务结果为单位计算。",
    keyPoints: [
      "管理路线：越早为他人结果负责，越依赖沟通与资源协调能力",
      "专家路线：需要可被外部识别的技术纵深，而不是年限累积",
      "独立开发：收入波动最大，最考验选题与获客能力",
    ],
    mergedQuestions: [
      "35 岁程序员是不是没救了？",
      "技术专家路线怎么走？",
      "独立开发能养活自己吗？",
    ],
    sourceTopics: ["职业发展", "技术管理", "独立开发"],
    quotes: [
      {
        author: "某公司技术负责人",
        excerpt: "我开始带人之后写代码的时间少了，但能影响的结果变多了，这是两条不同的账。",
        voteUpCount: 1502,
      },
      {
        author: "独立开发者",
        excerpt: "独立开发最难的是没人告诉你做什么，也没人逼你今天做完。",
        voteUpCount: 763,
      },
    ],
    sourceCount: 17,
    answerCount: 41,
    heat: 1620,
    frontier: "缺少可核实的收入与岗位分布数据，讨论基本是个人经历汇总。",
    createdAt: hoursAgo(60),
    updatedAt: hoursAgo(8),
  },
  {
    id: "post-tech-foldable",
    circleSlug: "tech",
    circleName: "科技",
    title: "折叠屏三年使用报告：铰链、折痕与维修成本的真实数据",
    summary:
      "长期使用者的记录显示，铰链故障与内屏维修是成本大头，折痕属于可接受的自然老化；讨论里的争议集中在保修范围而不是硬件本身。",
    keyPoints: [
      "铰链：前 18 个月内故障反馈集中，多与磕碰和使用环境相关",
      "折痕：几乎必然出现，但多数用户表示不影响使用",
      "维修成本：内屏更换价格普遍接近整机三成以上",
    ],
    mergedQuestions: ["折叠屏值不值得买？", "折叠屏用久了会坏吗？", "折叠屏修一次多少钱"],
    sourceTopics: ["折叠屏", "手机维修", "消费决策"],
    quotes: [
      {
        author: "数码博主",
        excerpt: "折痕是必然的，真正要算的是两年后那一天你愿不愿意付这笔维修费。",
        voteUpCount: 934,
      },
      {
        author: "普通用户",
        excerpt: "用了一年半没出问题，但我买了官方延保，心理上才踏实。",
        voteUpCount: 412,
      },
    ],
    sourceCount: 14,
    answerCount: 33,
    heat: 860,
    frontier: "缺少厂商维保数据的公开披露，故障率只能由用户样本推测。",
    createdAt: hoursAgo(64),
    updatedAt: hoursAgo(5),
  },
  {
    id: "post-tech-chip",
    circleSlug: "tech",
    circleName: "科技",
    title: "国产芯片制造的公开进展：能确认的事实与不能确认的推论",
    summary:
      "把公开信息按来源可信度分层之后，能确认的是产线、设备采购与专利方向；工艺节点的具体良率与产能仍缺少可验证来源，很多结论属于外推。",
    keyPoints: [
      "可确认：公开招标、设备进口与专利申请记录",
      "不可确认：具体制程良率、产能利用率",
      "常见误读：把单点技术突破等同于整条产业链成熟",
    ],
    mergedQuestions: ["国产芯片现在什么水平？", "光刻机到底卡在哪？", "为什么芯片制造这么难"],
    sourceTopics: ["半导体", "芯片制造", "产业观察"],
    quotes: [
      {
        author: "产业分析师",
        excerpt: "能查到的采购和专利是硬信息，良率那些数字基本没有可核实的来源。",
        voteUpCount: 806,
      },
      {
        author: "半导体从业者",
        excerpt: "一条产线跑通和稳定量产之间，通常隔着好几年。",
        voteUpCount: 645,
      },
    ],
    sourceCount: 19,
    answerCount: 44,
    heat: 1090,
    frontier: "关键工艺数据缺少官方或第三方可核查来源，公开讨论只能停留在方向判断。",
    createdAt: hoursAgo(70),
    updatedAt: hoursAgo(11),
  },
  {
    id: "post-edu-ai-learning",
    circleSlug: "edu",
    circleName: "教育",
    title: "AI 辅助学习的两种用法：资料整理有效，主动复盘无法替代",
    summary:
      "按学习者自述归类可以看到，AI 明显缩短了查资料和搭框架的时间；但长期记忆的差异仍然来自是否做了主动复述和自测，这部分目前没有可靠替代方案。",
    keyPoints: [
      "资料整理与概念解释：几乎所有讨论都认可效率提升",
      "主动复盘与自测：AI 只能生成题目，做不到替你回忆",
      "风险：把「看懂」当成「学会」，导致复习时间不足",
    ],
    mergedQuestions: ["用 AI 学习到底有没有用？", "AI 能帮我记住知识吗？", "AI 学习法是不是智商税"],
    sourceTopics: ["学习方法", "AI 学习", "记忆力"],
    quotes: [
      {
        author: "备考学生",
        excerpt: "AI 把资料整理的时间砍掉一半，但背不下来的东西还是背不下来。",
        voteUpCount: 1024,
      },
      {
        author: "高中教师",
        excerpt: "最怕的是学生以为看懂了，其实是 AI 替他把思路讲顺了。",
        voteUpCount: 733,
      },
    ],
    sourceCount: 16,
    answerCount: 37,
    heat: 978,
    frontier: "缺少同一学习者使用前后的对照实验数据，效率提升幅度无法量化。",
    createdAt: hoursAgo(40),
    updatedAt: hoursAgo(7),
  },
  {
    id: "post-edu-mistake-book",
    circleSlug: "edu",
    circleName: "教育",
    title: "错题本为什么对一部分人无效：题目类型与复盘频率的影响",
    summary:
      "讨论里的共识是错题本本身不产生效果，起作用的是「什么时候重做」和「是否按错因归类」。对计算类题目有效，对概念混淆类题目经常无效。",
    keyPoints: [
      "计算类：错因稳定，重复训练收益明确",
      "概念类：需要先补齐理解，抄题并不能解决问题",
      "复盘频率：间隔重做比一次性整理更关键",
    ],
    mergedQuestions: ["错题本有用吗？", "为什么我整理错题成绩还是没提高", "错题本应该怎么做"],
    sourceTopics: ["错题本", "复习方法", "考试"],
    quotes: [
      {
        author: "考研数学上岸者",
        excerpt: "我最后只留下三类错题，其他全扔了，错题本要能重做才有意义。",
        voteUpCount: 862,
      },
      {
        author: "中学教师",
        excerpt: "很多学生的错题本是抄写作业，不是复习工具。",
        voteUpCount: 519,
      },
    ],
    sourceCount: 12,
    answerCount: 28,
    heat: 690,
    frontier: "缺少按错因分类的成绩对照数据，效果基本靠个人经验描述。",
    createdAt: hoursAgo(58),
    updatedAt: hoursAgo(14),
  },
  {
    id: "post-work-remote",
    circleSlug: "work",
    circleName: "职场",
    title: "远程办公的真实效率差异：哪些岗位变好，哪些岗位变差",
    summary:
      "按岗位类型拆分讨论后，结论并不一致：产出可独立衡量的岗位效率普遍上升，依赖即时沟通与突发协调的岗位反馈明显变差，管理层的感受通常最差。",
    keyPoints: [
      "开发、设计、写作：产出可衡量，远程收益明显",
      "运维、客服、项目管理：上下文切换成本上升",
      "管理者：过程不可见，容易把不确定性当成效率下降",
    ],
    mergedQuestions: ["远程办公效率真的更高吗？", "为什么老板不愿意远程？", "居家办公会影响晋升吗"],
    sourceTopics: ["远程办公", "团队管理", "效率"],
    quotes: [
      {
        author: "某互联网团队负责人",
        excerpt: "远程之后我看不到过程，只能看结果，这让很多人不适应，包括我自己。",
        voteUpCount: 1188,
      },
      {
        author: "远程三年的设计师",
        excerpt: "我的产出没变，但确实更少被临时拉进会议室了。",
        voteUpCount: 596,
      },
    ],
    sourceCount: 20,
    answerCount: 47,
    heat: 1340,
    frontier: "缺少统一口径的产出指标，效率结论多依赖自评，无法横向比较。",
    createdAt: hoursAgo(44),
    updatedAt: hoursAgo(6),
  },
  {
    id: "post-work-salary-window",
    circleSlug: "work",
    circleName: "职场",
    title: "跳槽涨薪的窗口期：公开薪酬报告能覆盖到什么程度",
    summary:
      "公开薪酬报告主要反映招聘报价而非在岗薪酬，因此更适合判断区间而不是个人涨幅；讨论里真正可复用的是对行业景气度的判断方式。",
    keyPoints: [
      "招聘报价：能反映岗位供需，但普遍高于同岗在职工资",
      "样本偏差：参与调研的人群偏特定城市与岗位",
      "使用方式：看趋势和区间，不要当个人谈判依据",
    ],
    mergedQuestions: ["今年跳槽还能涨薪吗？", "薪酬报告可信吗？", "什么时候换工作最合适"],
    sourceTopics: ["跳槽", "薪酬", "行业趋势"],
    quotes: [
      {
        author: "HR",
        excerpt: "报告里的是预算上限，不是你的报价，两者经常差 20%。",
        voteUpCount: 947,
      },
      {
        author: "资深工程师",
        excerpt: "我更关心这个方向三年后还需要多少人，而不是今年多给几千。",
        voteUpCount: 684,
      },
    ],
    sourceCount: 18,
    answerCount: 39,
    heat: 1120,
    frontier: "报告样本结构不公开，无法验证统计口径是否覆盖目标岗位。",
    createdAt: hoursAgo(36),
    updatedAt: hoursAgo(13),
  },
  {
    id: "post-digital-camera",
    circleSlug: "digital",
    circleName: "数码",
    title: "2026 年手机影像的边际提升：传感器、算法与用户感知之间的落差",
    summary:
      "对比近三年的实拍样本可以看到，硬件参数增长明显，但普通用户的感知提升集中在弱光与视频稳定性；长焦与人像的提升更适合被参数表格放大。",
    keyPoints: [
      "弱光与视频防抖：感知提升最明显",
      "高像素与长焦：参数差异大于成片差异",
      "算法介入：风格一致性比极限素质更影响日常体验",
    ],
    mergedQuestions: [
      "手机拍照还有提升空间吗？",
      "参数重要还是成片重要？",
      "换新手机影像会明显变好吗",
    ],
    sourceTopics: ["手机影像", "算法摄影", "消费电子"],
    quotes: [
      {
        author: "摄影器材博主",
        excerpt: "这两年最大的变化是算法把下限抬高了，上限其实没怎么动。",
        voteUpCount: 771,
      },
      {
        author: "普通用户",
        excerpt: "我从老旗舰换到新旗舰，最大的感受是晚上拍孩子终于能看了。",
        voteUpCount: 458,
      },
    ],
    sourceCount: 13,
    answerCount: 31,
    heat: 720,
    frontier: "缺少统一场景的盲测样本，感知提升幅度难以直接比较。",
    createdAt: hoursAgo(50),
    updatedAt: hoursAgo(9),
  },
  {
    id: "post-digital-keyboard",
    circleSlug: "digital",
    circleName: "数码",
    title: "机械键盘的长期使用成本：轴体衰减、手感变化与维修",
    summary:
      "长期用户反馈显示，真正的成本不在购买，而在两年后的维护与更换；轴体手感衰减与键帽磨损是可预期的，热插拔设计明显降低了更换门槛。",
    keyPoints: [
      "轴体衰减：高频按键最先出现手感不一致",
      "热插拔：把维修从焊接变成可自行更换",
      "隐性成本：键帽、消音棉与反复试错的开销",
    ],
    mergedQuestions: ["机械键盘能用多久？", "轴体会不会越用越涩？", "客制化键盘值得投入吗"],
    sourceTopics: ["机械键盘", "客制化", "外设"],
    quotes: [
      {
        author: "客制化玩家",
        excerpt: "热插拔普及之后，键盘从买一件耐用品变成了买一个平台。",
        voteUpCount: 663,
      },
      {
        author: "程序员",
        excerpt: "三年换了两次轴，算下来比买两把便宜键盘贵多了。",
        voteUpCount: 389,
      },
    ],
    sourceCount: 11,
    answerCount: 26,
    heat: 610,
    frontier: "缺少标准化寿命测试数据，衰减结论来自个人使用记录。",
    createdAt: hoursAgo(56),
    updatedAt: hoursAgo(16),
  },
];

export function listMockCircles(): MockCircle[] {
  return MOCK_CIRCLES;
}

export function getMockCircle(slug: string): MockCircle | undefined {
  return MOCK_CIRCLES.find((circle) => circle.slug === slug);
}

export function listMockPosts(circleSlug?: string): MockPost[] {
  const items = circleSlug
    ? MOCK_POSTS.filter((post) => post.circleSlug === circleSlug)
    : MOCK_POSTS;
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getMockPost(id: string): MockPost | undefined {
  return MOCK_POSTS.find((post) => post.id === id);
}
