# PROJECT_LOCK.md

## 主题

# Human Gateway

> Human Gateway 是建立在知乎已有问题、话题、内容和用户网络之上的 AI-native 知识社区：保留知乎式的提问、回答与讨论，但以 Knowledge Object 而不是帖子作为长期知识组织单位。

它不是在知乎之外再建一个独立问答社区，也不是普通 AI 搜索、Chatbot 或内容 Feed。知乎提供已有问题、公开内容和真人网络；Human Gateway 在此基础上增加 Investigation、Knowledge State、Knowledge Frontier、Mission、Evidence 与 Impact Receipt。

Agent 的职责不是生成更多普通答案，而是持续维护问题的 Knowledge Frontier。当公开内容无法解决某个问题时，Agent 判断该缺口是否适合由真人第一手 Observation 补充；合适的 Gap 被转换为 Mission，社区用户提交真实经历，Evidence 经审核后重新进入 Investigation，Agent 据此更新 Knowledge State，并通过 Impact Receipt 告诉贡献者其 Observation 改变了什么、仍然缺什么。

---

## 产品核心形态`r`n`r`n``text`r`nAI Coding Circle`r`n→ Knowledge Object`r`n→ Human Discussion`r`n→ Agent Knowledge Organization`r`n→ Knowledge State / Claims / Conflicts / Open Questions`r`n→ Mission`r`n→ Observation / Evidence`r`n→ Re-evaluation`r`n→ Knowledge Object Update`r`n`` `r`n`r`n人类可以自由提问、回答、讨论、质疑和分享经验；Agent 负责将讨论组织为可追踪的 Claims、Evidence、争议、限制条件和未解决问题。讨论是知识演化的原始输入，Mission 是 Agent 针对明确 Evidence Gap 发起的结构化参与请求。`r`n`r`n## 用户核心行为

用户可以自由讨论，也可以对明确 Evidence Gap 提供真实 Observation。普通讨论不会自动成为事实；Agent 必须保留原始表达，并区分 Opinion、Claim Candidate、Observation、Evidence、Counterexample 与 Limitation。

Observation 可以来自本人近期经历、工作流程、可核对事件或相关 Artifact。社区参与的目标是补足当前知识边界，不是生产更多泛化观点。

---

## Golden Loop`r`n`r`n```text`r`n进入一个 Knowledge Object

↓
看到目前已知什么
↓
看到当前还缺什么
↓
参与一个 Mission
↓
提交自己的真实经历
↓
Agent Re-evaluate
↓
看到 Knowledge State 改变
↓
收到 Impact Receipt
↓
进入 Next Frontier

```

---

## Golden Case

问题固定为：

> AI Coding 实际改变了初级开发者哪些工作？

核心 Gap：

> 最近持续使用 AI Coding 的学生、实习生或 0–3 年开发者，哪些过去主要由自己完成的任务，现在主要交给 AI？人仍在哪一步承担最终判断？

---

## P0

比赛当前 P0 只包括：

- Investigation
- Knowledge State
- Knowledge Frontier
- Gap Suitability
- Mission
- Evidence Submission
- Evidence Grade
- Re-evaluation
- Impact Receipt
- Mission Feed / Community Projection

`Mission Feed` 指在 Investigation 语境中按 Evidence Gap 组织 Mission，不是通用内容流或推荐流。

---

## P1

可以包括：

- Follow Investigation
- Evidence Timeline
- Counterexample Mission
- 简单 Coverage
- 简单 Mission 推荐

P1 只能在 P0 Golden Loop 稳定后进入。

---

## P2 / Future

包括：

- 基于知乎用户行为自动匹配潜在观察者
- Topic Investigation
- Circle Investigation
- Notification
- Creator Research Mode
- 长期 Observer Profile
- Evidence Impact Profile
- 复杂 Mission 推荐
- Evidence Graph

P2 不代表近期承诺。

---

## Explicit Non-Goals

本轮明确不做：

- 独立新问答社区
- 普通发帖系统
- 点赞系统
- 评论系统
- 排行榜
- 积分经济
- 完整用户 Profile
- 完整知乎社交图谱
- 专家市场
- Multi-Agent
- A2A
- Knowledge Graph
- Long-term Memory
- 复杂 Event Sourcing

---

## 已验证能力：保留而不重做

现有 vertical slice 已验证以下能力，产品方向变化不代表推翻这些语义：

- Zhihu Search
- Global Search
- Gap Suitability Gate
- `MISSION_READY`
- `NEEDS_REFRAMING`
- `NOT_SUITABLE_FOR_HUMAN_MISSION`
- `E0_OPINION`
- `E1_FIRST_HAND`
- `E2_ARTIFACT_BACKED`
- `UNRESOLVED`
- `EARLY_EVIDENCE`
- `SUPPORTED_WITH_LIMITATIONS`
- Golden AI Coding Case
- `LIVE → CACHE → GOLDEN_FIXTURE`

不得重新设计这些核心语义，也不得把 Cache 或 Fixture 伪装成实时数据。

---

## 成功标准

1. Agent 找出的 Gap 必须具体、可求证，并能指向受影响的 Claim。
2. 一个合适的 Mission 可以转化为轻量真人任务；30–60 秒是设计原则，不是精确业务字段。
3. Human 提供的是第一手 Observation，而不是泛化意见。
4. Evidence 被正确 Grading，并只影响其有资格影响的 Claim 与 Knowledge State。
5. Knowledge State 的变化可以解释，并体现在 Impact Receipt 中。
6. 新用户可以在 Investigation 中理解“已知什么、还缺什么、自己能做什么”。
7. Golden Demo 稳定，且不会被目标社区能力破坏。

```

## 36 小时后端目标：真实 LLM 驱动的 Knowledge Object

后端最终必须支持真实 LLM 运行，而不是仅依赖 Golden Fixture。Golden Fixture 只作为 LIVE → CACHE → GOLDEN_FIXTURE 的故障回退，不得作为默认产品行为。

目标闭环：

```text
用户问题 / 人类讨论
→ LLM 识别所属 Knowledge Object 与相关 Claim
→ LLM 归纳讨论中的 Opinion / Claim Candidate / Observation / Counterexample / Limitation
→ 更新 Knowledge Object 的候选知识视图
→ 发现 Evidence Gap
→ LLM 判断是否适合发起 Mission
→ 用户提交 Observation
→ Evidence Grade / Gap Match
→ LLM 对相关 Claim 进行 Re-evaluation
→ Knowledge State Update
→ Impact Receipt
→ 返回可追溯的 Knowledge Object projection
```

真实 LLM 的输出必须经过 Contract Schema 校验，并保留：模型、运行时间、输入来源、原始讨论引用、结构化判断、置信度、限制条件和错误状态。LLM 是知识组织与评估的执行者，不是不可追溯的事实权威。

36 小时内只实现一个 AI Coding Circle 和一个 Golden Knowledge Object，但接口设计不得把真实 LLM 逻辑写死为单个页面或固定字符串。应通过 Agent orchestration 接入 LLM adapter，并允许无密钥、超时、限流、无效响应时回退到 CACHE 或 GOLDEN_FIXTURE。
