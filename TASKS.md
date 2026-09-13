# TASKS.md

## 使用规则

每个任务必须有：

- Task ID
- Owner
- Status
- Allowed Paths
- Must Not Modify
- Acceptance Criteria

同一任务只能有一个 Owner。

如果一个需求跨 3 个模块，应拆成 3 个子任务，而不是 3 个人一起实现同一任务。

---

# 当前任务

## T01 - Zhihu Search Adapter

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

- 可调用 Zhihu Search
- 有 timeout
- 有 rate-limit handling
- 有 cache
- 返回统一 SourceRef
- 有最小测试

---

## T02 - Global Search Adapter

Owner: A

Status: TODO

Allowed Paths:

```text
apps/api/**
packages/agent/**
packages/contracts/**
```

Acceptance Criteria:

- 统一 SourceRef
- cache
- timeout
- 失败可识别

---

## T03 - Evidence State Evaluator

Owner: A

Status: TODO

Allowed Paths:

```text
packages/agent/**
packages/contracts/**
```

Acceptance Criteria:

- 输出 Known
- 输出 Disagreements
- 输出 Evidence Gap
- 输出 KnowledgeState
- 不把“更多数据”当成 Evidence Gap
- 通过 Golden Case

---

## T04 - Investigation UI

Owner: B

Status: TODO

Allowed Paths:

```text
apps/web/**
```

May Read:

```text
packages/contracts/**
```

Must Not Modify:

```text
packages/agent/**
packages/evidence/**
```

Acceptance Criteria:

- 展示搜索动作
- 展示 Known
- 展示 Disagreement
- 展示 Evidence Gap
- 支持 Mock 数据开发

---

## T05 - Evidence Mission Mobile Page

Owner: B

Status: TODO

Allowed Paths:

```text
apps/web/**
```

Acceptance Criteria:

- Mobile-first
- 30–60 秒内可完成
- 使用共享 Contract
- 提交成功后有明确反馈

---

## T06 - Evidence Grading

Owner: C

Status: TODO

Allowed Paths:

```text
packages/evidence/**
packages/contracts/**
```

Acceptance Criteria:

- E0 / E1 / E2
- 不把观点升级成 Evidence
- Artifact-backed 可识别
- 有测试

---

## T07 - Golden Case Dataset

Owner: C

Status: TODO

Allowed Paths:

```text
fixtures/**
docs/**
```

Acceptance Criteria:

- AI Coding Golden Case
- 至少 10 条真实测试 Evidence
- 标记 sample limitations
- 不伪造数据

---

## T08 - Knowledge State View

Owner: B

Status: TODO

Allowed Paths:

```text
apps/web/**
```

Acceptance Criteria:

- 显示 Evidence Count
- 显示 UNRESOLVED → EARLY_EVIDENCE
- 显示 Supported
- 显示 Unsupported
- 显示 Limitations
