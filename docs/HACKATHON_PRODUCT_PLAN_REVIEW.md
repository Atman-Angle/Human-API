# 《产品说明计划书》重写评审说明

## 1. 新版整篇主叙事

新版不再从“Human Gateway 是什么”或技术模块开始，而是从一个评委能立即理解的问题开始：

> 一个知乎问题被回答以后，谁负责维护它？

全文沿着这条主线推进：互联网有很多答案，但缺少对问题知识状态的持续维护；Human Gateway 让问题成为持续存在的知识实体；Agent 暴露已知、未知、争议和限制，发现 Evidence Gap，再邀请真人补充可归因的 Observation；Evidence 经过 Grade、Gap Match 和 Claim Re-evaluation 后，知识状态更新或保持，并以 Impact Receipt 解释原因。

对应的核心叙事链为：

```text
Question
→ Knowledge State
→ Evidence Gap
→ Mission
→ New Evidence
→ Claim Re-evaluation
→ Knowledge State Update
→ 下一轮未知
```

## 2. 相比旧版删除了什么

- 删除以“创新一、创新二、项目背景、技术亮点”堆叠的汇报式结构；
- 删除把大量工程细节放在正文开头的写法；
- 删除容易让人误以为产品是“ChatGPT + 知乎”的笼统描述；
- 删除没有仓库证据支撑的 Multi-Agent、A2A、Knowledge Graph、Long-term Memory 等当前能力暗示；
- 删除将热榜、用户网络自动匹配、实时语义访谈等未来方向写成现状的表述；
- 删除重复的 API、DTO、状态和模块说明，只在附录保留必要映射；
- 删除“完整社区”“大规模网络”等无法由当前 Prototype 证明的表述。

## 3. 调整了哪些章节

新版按产品判断和评委阅读路径重新组织为：

1. 一个问题被回答以后，谁负责维护它？
2. 我们缺的不是另一个 AI 回答
3. 当 AI 开始承认“我还不知道”
4. Human Gateway：让一个问题持续生长
5. 一个问题如何真正生长
6. 为什么这件事特别适合发生在知乎
7. 从“邀请回答”到“邀请补一块证据”
8. 用户看到的是一个正在生长的问题
9. 我们如何让真人经历真正进入公共知识
10. 我们想构建怎样的 AI-native 社区
11. 系统如何保证 AI 不会随便修改知识
12. 技术实现方案
13. 我们已经跑通了什么
14. 从 Answers 到 Living Knowledge

这样先建立问题，再解释差异和机制，再进入知乎契合度、用户体验、可信度、技术实现、当前完成度和未来演化。

## 4. AI-native 社区愿景如何从当前实现推导

愿景不是从“智能化社区”这类抽象口号推导，而是从仓库已经存在的闭环推导：

```text
Investigation
→ Knowledge State
→ Evidence Gap
→ Mission
→ Evidence Grade
→ Claim Re-evaluation
→ Impact Receipt
```

当前机制已经证明：讨论或公开资料可以形成结构化知识；知识缺口可以转化为 Mission；真人输入可以经过 Evidence Authority 判断；相关 Claim 可以被重新评估；结果可以解释为状态变化或不变化。由此才自然推导出更长期的方向：更多 Knowledge Object、更多现实场景和更连续的知识维护。

## 5. 哪些属于当前能力

新版明确将以下内容放入当前实现或已有代码/测试支撑范围：

- Investigation 与 Knowledge State；
- ClaimAssessment、EvidenceGap、Gap Suitability；
- Mission `OPEN / CLOSED` 生命周期；
- Observation 对话准备、摘要确认与 Evidence Intake；
- E0 / E1 / E2 Evidence Grade；
- Evidence → Mission → Gap → Claim 归因；
- Claim Re-evaluation 与状态更新/保持；
- Impact Receipt；
- Discovery topics、活动事件和 Knowledge Object projection；
- SQLite 持久化；
- Zhihu Search / Global Search adapter；
- Zhihu OAuth 身份层；
- LIVE / CACHE / GOLDEN_FIXTURE fallback；
- Golden Demo 的 Accepted、Rejected、Unchanged 三类结果。

同时对这些能力加了必要限定：实时 LLM 并非所有路径都保证，规则型对话准备标记为 `EXTRACTIVE_RULES`；实时知乎、真人用户研究和浏览器人工 UAT 没有被写成已完成验证。

## 6. 哪些属于未来愿景

以下内容明确放入“未来愿景”而不是当前完成状态：

- 大规模 Knowledge Object 网络；
- 自动发现并匹配潜在观察者；
- 复杂 Mission 推荐和通知；
- Topic/Circle 扩展；
- Observer Profile、Evidence Graph；
- 完整用户画像和跨对象知识演化；
- Multi-Agent、A2A、Knowledge Graph、Long-term Memory；
- 积分经济、排行榜和完整社交图谱。

## 7. 评委最值得阅读的 5 个段落

1. **第 01 节末段：**“我们真正缺的，也许不是更多答案，而是一个持续维护问题的人。”——建立根本问题。
2. **第 02 节末段：**“知乎让问题被提出、被讨论；Human Gateway 让问题的知识状态被持续维护。”——回应“是不是 ChatGPT + 知乎”。
3. **第 03 节：**“还不知道”不是失败，而是下一步行动的入口。——表达核心产品判断。
4. **第 07 节对比表：**普通回答邀请与 Mission 的差异。——解释社区参与为什么不是普通评论或问答。
5. **第 13 节：**Accepted、Rejected、Unchanged 三种结果。——证明系统不会因为用户提交就擅自改变结论。

## 8. 当前项目最强的 3 个卖点

### 卖点一：维护问题，而不是生成答案

产品把知识状态设为长期对象，目标不是一次性输出，而是持续维护已知、未知和下一步验证方向。

### 卖点二：把“缺什么”变成可参与的 Mission

Agent 不只是说“不确定”，而是把具体 Evidence Gap 转化为低成本、边界清晰的真人参与邀请。

### 卖点三：每次贡献都有边界、有归因、有回执

Evidence 不是提交即采纳。系统可以说明其 Grade、影响的 Claim、状态变化或不变化的原因，以及它没有证明什么。

## 9. 当前最大的 3 个质疑点

### 质疑一：它是否仍然只是 ChatGPT + 知乎？

新版在前半部分主动区分：搜索回答“信息在哪里”，ChatGPT回答“如何基于已有资料作答”，Human Gateway回答“当前知识状态和下一步最值得验证什么”。产品差异在于持续状态、Evidence Gap、Mission 和可解释 Re-evaluation，而不是简单叠加入口。

### 质疑二：一条个人经历真的能改变公共知识吗？

产品不声称单条经历证明总体规律。E0 不推进状态；E1/E2 只影响有资格的具体 Claim；不相关 Evidence 被隔离；系统可能返回 accepted-but-unchanged，并明确说明剩余未知。

### 质疑三：当前是真实产品还是固定 Demo？

新版同时展示真实实现链路和限制：已有 API、Contracts、Agent/Evidence packages、SQLite、测试和 Golden Demo；公开资料与 LLM 使用 LIVE/CACHE/GOLDEN_FIXTURE 降级；合成样例明确是 Fixture；实时知乎调用、真人研究和浏览器人工 UAT 没有被夸大为已完成。

## 10. 因为仓库没有证据而没有写入的内容

以下内容没有作为当前能力写入：

- 已完成的大规模真人社区运营；
- 已验证的全量知乎官方 API 能力；
- 已完成的用户行为自动匹配；
- 已完成的自由语义、多轮长期访谈；
- 已完成的完整版本链和生产级事件溯源；
- 已完成的跨对象 Knowledge Graph；
- 已完成的真实用户规模、留存、准确率或社会影响数据；
- 已完成的桌面/移动端人工 UAT；
- 已完成的实时 LLM 全路径稳定性；
- Multi-Agent、A2A、Long-term Memory、积分和完整社交图谱。

## 11. 文档证据范围

重写依据包括仓库中的 `docs/PROJECT_LOCK.md`、`docs/ARCHITECTURE.md`、`docs/SPEC.md`、`docs/API_CONTRACT.md`、`docs/DEMO_V3.md`、`docs/DEMO_CORE_SPEC.md`、`docs/BACKEND_SPEC.md`、`docs/BACKEND_CORE_COCREATION_DEMO_SPEC.md`、`docs/COMMUNITY_CHAT_SPEC.md`、`docs/FRONTEND_SPEC.md`、`docs/ZHIHU_API_CAPABILITY_MATRIX.md`、`TASKS.md`，以及 `apps/api`、`apps/web`、`packages/contracts`、`packages/agent`、`packages/evidence`、`fixtures` 和测试代码。
