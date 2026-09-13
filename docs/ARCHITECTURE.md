# ARCHITECTURE.md

## 架构状态

当前实现是一个已经具备最小 Investigation Aggregate 的 vertical slice，不是完整社区产品。

已存在并必须保留的能力：

```text
KnowledgeStateStatus
EvidenceGrade
EvidenceGap
GapSuitability
EvidenceMission
EvidenceRecord
KnowledgeState
Investigation

evaluateSearchEvidence()
evaluateGapSuitability()
createEvidenceMission()
reevaluateKnowledgeState()

SearchService
OfficialSearchAdapter
LIVE → CACHE → GOLDEN_FIXTURE
```

目标不是推翻这条纵向链路，而是在其上增加社区参与、Evidence 归因和可解释的 Impact Receipt。

---

## 五条架构原则

```text
Agent owns decisions.

Community owns participation.

Evidence owns credibility.

Contracts own shared language.

UI only projects authority.
```

- Agent owns decisions：Agent 维护 Knowledge State、Knowledge Frontier、Evidence Gap、Gap Suitability、Re-evaluation 与 Next Action。
- Community owns participation：Community Authority 维护 Mission Lifecycle、Participation、Evidence Intake 与 Impact Receipt。
- Evidence owns credibility：Evidence Authority 负责 Evidence Validation、Evidence Grade、First-hand 判断、Gap Match 与 Artifact 可信度辅助。
- Contracts own shared language：DTO、Enum、Schema、共享 Status 和 API Projection 只能来自 `packages/contracts`。
- UI only projects authority：UI 不得自行 Grade Evidence、推进 Knowledge State 或重新判断 Gap；API 也不得在 route 中重新实现领域判断。

---

## 当前纵向链路

```text
Question
→ Investigation
→ Candidate Evidence Gap
→ Gap Suitability Gate
→ MISSION_READY | NEEDS_REFRAMING | NOT_SUITABLE_FOR_HUMAN_MISSION
→ OPEN Mission or Stop
→ Human Evidence
→ Evidence Grade / Gap Match
→ Re-evaluation
→ Knowledge State
```

当前语义：

- `MISSION_READY`：允许创建 Mission。
- `NEEDS_REFRAMING`：最多自动 Reframe 一次，然后重新评估。
- `NOT_SUITABLE_FOR_HUMAN_MISSION`：停止，不创建 Mission。
- Mission 创建为 `OPEN`；只有 `OPEN` 接受 Evidence，`CLOSED` 仅保留读取与历史归因。
- E0 不得推进 Knowledge State。
- E1/E2 只代表当前个体的第一手 Observation，不能外推为总体统计。
- `LIVE → CACHE → GOLDEN_FIXTURE` fallback 必须保留，且来源不得伪装。

---

## 当前物理结构

当前真实存在的是：

```text
apps/api
packages/contracts
packages/agent
packages/evidence
```

`packages/community`、`packages/persistence` 和 `apps/web` 是目标逻辑边界，不代表当前已经物理实现。

---

## Target Logical Architecture

```text
apps/
├─ web
└─ api

packages/
├─ contracts
├─ agent
├─ evidence
├─ community       # logical authority，物理 package 可后置
└─ persistence     # logical authority，物理 package 可后置
```

`packages/community` 和 `packages/persistence` 不要求现在立即物理创建。当前优先保持简单目录结构，但 Authority 必须先在文档和 Contract 中明确。

---

## Authority Table

| Capability                           | Authority              |
| ------------------------------------ | ---------------------- |
| DTO / Enum / Schema / API Projection | `packages/contracts`   |
| Investigation Decision               | `packages/agent`       |
| Knowledge State                      | `packages/agent`       |
| Knowledge Frontier                   | `packages/agent`       |
| Evidence Gap                         | `packages/agent`       |
| Gap Suitability                      | `packages/agent`       |
| Re-evaluation                        | `packages/agent`       |
| Evidence Validation                  | `packages/evidence`    |
| Evidence Grade                       | `packages/evidence`    |
| Gap Match                            | `packages/evidence`    |
| Mission Lifecycle                    | Community Authority    |
| Participation                        | Community Authority    |
| Evidence Intake                      | Community Authority    |
| Impact Receipt                       | Community Authority    |
| HTTP / Application Orchestration     | `apps/api`             |
| UI Projection                        | `apps/web`             |
| DB / Cache / Durable Storage         | Persistence Authority  |
| 产品范围 / Non-Goals                 | `docs/PROJECT_LOCK.md` |
| 当前任务 Owner                       | `TASKS.md`             |

Community Authority 是逻辑 Authority，不要求立即创建独立 package。A03 的 Mission Lifecycle 最小实现位于 `apps/api/src/mission-lifecycle.ts`，作为当前 Application 边界；不得在 UI、API route 或 Agent 中复制同样职责。

---

## 目标关系：Evidence → Mission → Gap → Claim

```text
Evidence
→ Mission
→ Gap
→ Claim
```

每个 Evidence 必须能够回溯到其 Mission、所属 Evidence Gap，以及该 Gap 影响的 Claim。目标是让新增 Evidence 只影响相关 Claim 和有资格影响的 Knowledge State。

当前 Contract 已使用稳定 ID 建立该链路：`EvidenceGap.affectedClaim` 仅负责展示，`affectedClaimId` 引用 Investigation 内已有的 Claim/ClaimAssessment；Mission 通过 `evidenceGapId` 指向 Gap；EvidenceRecord 通过 `missionId` 指向 Mission。`investigationId` 由所属 Investigation Aggregate 提供，归因不得通过展示文本匹配生成。

---

## 当前语义风险

以下风险必须作为后续架构约束处理：

1. Mission 当前只实现创建 `OPEN` 与内部 `closeMission(...)` transition；没有公开关闭/重新打开流程，也没有自动关闭策略。
2. ✅ RESOLVED: ImpactReceipt 已在 Evidence Intake 时生成（`apps/api/src/evidence-intake.ts`），包含 `stateBefore`/`stateAfter`/`stillMissing`，`GET /api/evidence/:id/impact` 可从 Investigation 状态重建。
3. ✅ RESOLVED: `submitMissionEvidence()` Application Action（`apps/api/src/evidence-intake.ts`）已将 Evidence Intake 收束为完整编排流；route 只做 parse → invoke → map response，不再直接改 Knowledge State。

Evidence 归因与单次 Re-evaluation 隔离已由 A02 收敛；Mission 的 OPEN / CLOSED 接受边界由 A03 建立；多 Mission 的完整生命周期编排仍属于后续任务。

这些风险不能通过在 UI 中补文案解决，必须由 Contract、Agent、Evidence、Community 和 Application 层共同收敛。

---

## Target Application Flow

```text
Community User
↓
Submit Evidence
↓
Application Orchestration
↓
Evidence Validate / Grade
↓
Agent Re-evaluate
↓
Knowledge State Transition
↓
Impact Receipt
↓
Persist
```

API 负责 orchestration。长期结构中，route handler 不应直接 `push evidence` 或原地修改 `knowledgeState`；它应调用明确的 Application / Package 能力，并持久化一次完整、可解释的状态转移。

---

## 模块边界

### apps/web

负责：

- Investigation Page
- Knowledge Frontier View
- Mission Feed / Mission Detail
- Evidence Submission
- Impact Receipt UI
- Knowledge State Update

禁止：

- 自行判断 Evidence Grade
- 自行推进 Knowledge State
- 重新定义 API DTO
- 直接调用知乎 API

### apps/api

负责：

- HTTP 接口与参数校验
- Application Orchestration
- 调用 Agent / Evidence / Community Authority
- 外部 Search Adapter
- 错误映射

禁止：

- 复制领域规则
- 在 route 中长期原地修改领域 Aggregate
- 重新定义 shared types

### packages/contracts

负责：

- DTO
- Enum
- Schema
- 状态与 API Projection
- Investigation / Claim / Mission / Evidence / Impact Receipt 的共享语言

### packages/agent

负责：

- Investigation Decision
- Knowledge State
- Knowledge Frontier
- Evidence Gap
- Gap Suitability
- Mission Planning
- Re-evaluation
- Next Action / Stop / Continue

### packages/evidence

负责：

- Evidence Validation
- Evidence Grade
- First-hand 判断
- Gap Match
- Artifact 可信度辅助
- Limitations、去重与聚合

### Community Authority

负责：

- Mission Lifecycle
- Participation
- Evidence Intake
- Impact Receipt

Community 不得重新实现 Evidence Grade 或 Agent Re-evaluation。

### Persistence Authority

负责：

- DB / Cache / Durable Storage
- Aggregate 读写与持久化一致性

Persistence 不得决定 Knowledge State、Evidence Grade 或 Gap Suitability。

---

## 依赖方向

目标允许：

```text
apps/web → contracts
apps/api → contracts
apps/api → agent
apps/api → evidence
apps/api → community
apps/api → persistence
agent → contracts
evidence → contracts
community → contracts
persistence → contracts
```

避免：

```text
agent → web
evidence → web
community → agent internals
community → evidence internals
web → agent internals
web → evidence internals
persistence → business decisions
```

---

## Agent Actions

当前只做单 Agent，Action 保留：

```text
SEARCH_ZHIHU
SEARCH_WEB
ASSESS_EVIDENCE
ASSESS_GAP_SUITABILITY
REFRAME_GAP
CREATE_MISSION
STOP
```

不得为社区目标引入 Multi-Agent 或 A2A。

---

## Demo Fallback

```text
LIVE
↓
CACHE
↓
GOLDEN FIXTURE
```

Cache 和 Fixture 必须保留来源标识与 limitations，不得伪装成实时数据。
