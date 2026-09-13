# ARCHITECTURE.md

## 核心纵向链路

```text
Question
→ Investigation
→ Evidence Gap
→ Human Evidence
→ Re-evaluation
```

## 模块

```text
apps/web
  UI / Mission / State
        ↓
packages/contracts
        ↓
apps/api
  HTTP orchestration
   ↙            ↘
packages/agent  packages/evidence
        ↓
 persistence + cache
```

---

## Authority 表

| 业务概念 | 唯一 Authority |
|---|---|
| DTO / Enum / Schema | `packages/contracts` |
| Agent 下一步行动 | `packages/agent` |
| Knowledge State 评估 | `packages/agent` |
| Evidence Grade | `packages/evidence` |
| Evidence Validation | `packages/evidence` |
| HTTP API | `apps/api` |
| UI 展示 | `apps/web` |
| 产品范围 | `docs/PROJECT_LOCK.md` |
| 当前任务 | `TASKS.md` |

---

## 依赖规则

允许：

```text
apps/web → contracts
apps/api → contracts
apps/api → agent
apps/api → evidence
agent → contracts
evidence → contracts
```

避免：

```text
agent → web
evidence → web
web → agent internals
web → evidence internals
```

---

## Agent

只做单 Agent。

Action：

```text
SEARCH_ZHIHU
SEARCH_WEB
ASSESS_EVIDENCE
CREATE_MISSION
READ_HUMAN_EVIDENCE
REASSESS
FINISH
```

---

## Demo Fallback

```text
LIVE
↓
CACHE
↓
GOLDEN FIXTURE
```

不得把 Cache / Fixture 伪装成实时数据。
