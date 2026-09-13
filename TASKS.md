# TASKS.md

## 使用规则

每个任务必须有：

- Task ID
- Owner
- Status
- Allowed Paths
- Must Not Modify
- Acceptance Criteria

同一任务只能有一个 Owner。跨模块改动必须经过对应 Owner Review，不得由多人同时实现同一个任务。

---

# 当前优先级

第一个待开发任务：

```text
A02 Evidence → Mission → Gap → Claim attribution
```

原因：如果没有稳定的 Evidence-to-Claim 归因，Impact Receipt 和 Re-evaluation isolation 都会建立在不确定语义上。

A01 是 Community Vertical Slice milestone，由 A02–A07 共同完成，不作为重复实现任务。

---

# A — Agent / Backend Owner

核心目标：

> 把当前 Vertical Slice 升级为可驱动求证子社区的 Agent Backend。

Allowed Paths：

```text
apps/api/**
packages/agent/**
packages/contracts/**
packages/community/**   # logical authority，物理目录可后置
packages/persistence/** # logical authority，物理目录可后置
```

Must Not Modify：

```text
apps/web/**
```

---

## A01 - Community Vertical Slice

Owner: A

Status: TRACKING (Milestone)

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/evidence/**
packages/contracts/**
packages/community/**
packages/persistence/**
```

Must Not Modify:

```text
apps/web/**
```

Acceptance Criteria:

- A02–A07 完成。
- Golden AI Coding Case 仍可演示。
- 社区参与链路不破坏现有搜索、Gap Suitability 和 Evidence Grade 语义。
- 不引入 Multi-Agent、A2A、完整数据库或复杂 Event Sourcing。

---

## A02 - Evidence → Mission → Gap → Claim attribution

Owner: A

Status: READY

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/evidence/**
packages/contracts/**
```

Must Not Modify:

```text
apps/web/**
fixtures/**
```

Acceptance Criteria:

- Contract 明确 `Evidence → Mission → Gap → Claim` 回溯关系。
- `EvidenceGap` 增加稳定的 `affectedClaimId` 目标字段。
- `affectedClaimId` 引用已有 Claim/ClaimAssessment，不创建第二套 Claim Authority。
- Evidence 只被归因到目标 Mission、Gap 和 Claim。
- 现有 `affectedClaim` 文本兼容策略明确。
- 有最小 Contract / Attribution 测试。

---

## A03 - Mission OPEN / CLOSED lifecycle

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/contracts/**
packages/community/**
```

Must Not Modify:

```text
apps/web/**
packages/evidence/**
```

Acceptance Criteria:

- Contract 包含 `MissionStatus = OPEN | CLOSED`。
- 只有 `OPEN` Mission 接受普通 Evidence Submission。
- `CLOSED` Mission 不删除已存在 Evidence。
- Golden Demo 的现有 Mission 创建路径保持兼容。
- `estimatedSeconds` 标记 deprecated / planned removal，不作为长期核心 Contract。

---

## A04 - Evidence Intake orchestration

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/evidence/**
packages/contracts/**
packages/community/**
```

Must Not Modify:

```text
apps/web/**
fixtures/**
```

Acceptance Criteria:

- 写链路遵循：
  `Submit Evidence → Orchestration → Validate / Grade → Re-evaluate → State Transition → Impact Receipt → Persist`。
- route handler 不再长期直接 `push evidence` 或原地修改 Knowledge State。
- Evidence Authority、Community Authority 与 Agent 职责不重叠。
- 错误仍区分 validation、not found、upstream 与 rate limit。

---

## A05 - Re-evaluation isolation

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/contracts/**
```

Must Not Modify:

```text
apps/web/**
packages/evidence/**
```

Acceptance Criteria:

- Re-evaluation 只读取与目标 Mission、Gap 和 Claim 相关的 Evidence。
- 不相关 Evidence 不得影响当前 Claim 的 Knowledge State。
- `stateBefore` / `stateAfter` 可稳定推导。
- 至少覆盖“同一 Investigation 下多个 Claim”与“不匹配 Evidence”测试。
- 现有 Golden Case 状态变化保持可解释。

---

## A06 - Impact Receipt

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/community/**
packages/contracts/**
packages/persistence/**
```

Must Not Modify:

```text
apps/web/**
packages/agent/** 业务判断
packages/evidence/** 业务判断
```

Acceptance Criteria:

- Contract 至少包含：
  `evidenceId`、`missionId`、`investigationId`、`accepted`、`grade`、`affectedClaimId`、`stateBefore`、`stateAfter`、`impactSummary`、`stillMissing`、`createdAt`。
- 不复制完整第二套 Knowledge State。
- E0 或不匹配 Evidence 能产生 `accepted=false` 的可解释 Receipt。
- Golden Demo 可以展示贡献者影响。

---

## A07 - Community Read API

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/community/**
packages/contracts/**
packages/persistence/**
```

Must Not Modify:

```text
apps/web/**
packages/agent/**
packages/evidence/**
```

Acceptance Criteria:

- 提供 Investigation、Mission、Mission Detail、Impact Receipt 的只读投影。
- 读取接口不重新执行 Gap / Evidence 判断。
- 不提前实现 Recommendation、Notification、Ranking 或 User Profile。
- 现有写接口保持 Golden Demo 兼容。

---

# B — Community Frontend / UX Owner

核心目标：

> 把 Agent 决策转化成用户真正能理解和参与的社区体验。

Allowed Paths：

```text
apps/web/**
```

May Read：

```text
packages/contracts/**
docs/API_CONTRACT.md
docs/ARCHITECTURE.md
```

Must Not Modify：

```text
packages/agent/**
packages/evidence/**
packages/contracts/**
apps/api/**
```

---

## B01 - Investigation Page

Owner: B

Status: TODO

Acceptance Criteria:

- 展示 Investigation 的问题与当前状态。
- 展示 Known、Disagreements、Limitations。
- 不自行推断 Knowledge State。
- 使用共享 Contract，不创建并行 DTO。

---

## B02 - Knowledge Frontier View

Owner: B

Status: TODO

Acceptance Criteria:

- 清楚展示当前还缺什么。
- 展示缺失 Observation、目标参与者和预期影响。
- Gap 必须来自 Agent Authority。
- 不使用“需要更多数据”一类模糊文案。

---

## B03 - Mission Feed

Owner: B

Status: TODO

Acceptance Criteria:

- 按 Investigation / Gap 展示可参与 Mission。
- 只展示 `OPEN` Mission 作为可提交入口。
- 不是通用内容流、点赞流或推荐流。
- 空状态可解释为什么暂无可参与 Mission。

---

## B04 - Mission Detail

Owner: B

Status: TODO

Acceptance Criteria:

- 展示 Mission 目的、问题、资格要求与 Evidence 影响链。
- 30–60 秒为体验目标，不展示虚假精确耗时承诺。
- 提交入口遵循 Mission 生命周期。

---

## B05 - Evidence Submission

Owner: B

Status: TODO

Acceptance Criteria:

- 手机优先，表单尽量轻量。
- 收集第一手 Observation，而不是要求完整答案。
- 提交后明确显示 accepted / rejected、Grading 与下一步状态。
- E0 / E1 / E2 不由 UI 自行判断。

---

## B06 - Impact Receipt UI

Owner: B

Status: TODO

Acceptance Criteria:

- 展示贡献者的 Observation 改变了什么。
- 展示 stateBefore / stateAfter、影响 Claim 与 stillMissing。
- Receipt 数据来自 Community Authority。
- 不用乐观 UI 伪造状态变化。

---

## B07 - Knowledge State Update

Owner: B

Status: TODO

Acceptance Criteria:

- 展示状态变化、Evidence Count、Supported、Unsupported、Limitations。
- 区分搜索结果、Evidence 与模型推断。
- 不把 supported 显示为普遍真相。
- 不把 unsupported 显示为 False。

---

# C — Evidence / Eval Owner

核心目标：

> 保证社区收到的 Observation 真实、可测试，不会因为 Demo 需要而伪造结论。

Allowed Paths：

```text
packages/evidence/**
fixtures/**
docs/**
```

Must Not Modify：

```text
apps/web/**
packages/agent/**
```

---

## C01 - Golden Case Evidence Dataset

Owner: C

Status: TODO

Acceptance Criteria:

- 围绕固定 Golden Case：
  `AI Coding 实际改变了初级开发者哪些工作？`
- 覆盖真实第一手 Observation。
- 标记来源、时间和样本局限。
- 不伪造测试参与者或实时数据。

---

## C02 - E0 / E1 / E2 Eval

Owner: C

Status: TODO

Acceptance Criteria:

- E0 不推进 Knowledge State。
- E1 表示第一手 Observation。
- E2 表示第一手 Observation + Artifact。
- Artifact 只增强个体观察可信度，不外推总体结论。
- 有正反例测试。

---

## C03 - Real Test Participant Evidence

Owner: C

Status: TODO

Acceptance Criteria:

- 至少收集真实测试参与者的 Evidence。
- 记录资格、同意范围与样本限制。
- 不用模型生成内容冒充真人 Observation。
- 结果输入 Golden Case 评估。

---

## C04 - Gap / Evidence Negative Cases

Owner: C

Status: TODO

Acceptance Criteria:

- 覆盖 `NEEDS_REFRAMING` 与 `NOT_SUITABLE_FOR_HUMAN_MISSION`。
- 覆盖 Evidence 不匹配 Gap、E0、伪造 Artifact 或不可核对经历。
- 负例不得被用于“证明成功”。

---

## C05 - Review packages/evidence

Owner: C

Status: TODO

Acceptance Criteria:

- 检查 Evidence Validation、Grade、Gap Match、去重与 Limitations Authority。
- 发现与 Agent / Community 的重叠职责并报告。
- 不新建第二套 Evidence System。

---

## C06 - Demo Seed Evidence

Owner: C

Status: TODO

Acceptance Criteria:

- Seed 数据明确标注真实来源或 Fixture。
- Cache / Fixture 不伪装成实时 Evidence。
- Golden Demo 的 HAPPY PATH 与拒绝路径都可复现。

---

# 暂不安排

当前不要安排：

```text
Recommendation
User Profile
Notification
Ranking
积分经济
复杂社交图谱
```
