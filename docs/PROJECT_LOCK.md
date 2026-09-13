# PROJECT_LOCK.md

## 主题

# Human Gateway

> Human Gateway 是建立在知乎已有问题、话题、内容和用户网络之上的 Agent 驱动求证子社区。

它不是在知乎之外再建一个独立问答社区，也不是普通 AI 搜索、Chatbot 或内容 Feed。知乎提供已有问题、公开内容和真人网络；Human Gateway 在此基础上增加 Investigation、Knowledge State、Knowledge Frontier、Mission、Evidence 与 Impact Receipt。

Agent 的职责不是生成更多普通答案，而是持续维护问题的 Knowledge Frontier。当公开内容无法解决某个问题时，Agent 判断该缺口是否适合由真人第一手 Observation 补充；合适的 Gap 被转换为 Mission，社区用户提交真实经历，Evidence 经审核后重新进入 Investigation，Agent 据此更新 Knowledge State，并通过 Impact Receipt 告诉贡献者其 Observation 改变了什么、仍然缺什么。

---

## 用户核心行为

用户不是：

> 写一篇完整答案。

而是：

> 对一个明确 Evidence Gap 提供一条真实 Observation。

Observation 可以来自本人近期经历、工作流程、可核对事件或相关 Artifact。社区参与的目标是补足当前知识边界，不是生产更多泛化观点。

---

## Golden Loop

```text
进入一个 Investigation
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
