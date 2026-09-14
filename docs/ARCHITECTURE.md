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

## 产品架构：AI-native 知识社区

Human Gateway 的前台主语是 `Knowledge Object`，不是 `Investigation`。它是一个长期存在、持续演化的共享认知对象，承载当前知识状态、Claims、Evidence、争议、少数观点、Open Questions、Missions 与 Recent Changes。

```text
Circle
└── Knowledge Object
    ├── Human Discussion
    ├── Claims / Evidence / Conflicts
    ├── Knowledge State
    ├── Open Questions / Evidence Gaps
    ├── Missions
    ├── Recent Changes
    └── Investigations（后台演化过程）
```

### 对象边界

- `Circle`：社区与导航边界，不拥有知识状态。
- `Topic`：分类标签，不是知识容器。
- `Knowledge Object`：长期维护的共享知识容器。
- `Question`：一次问题输入，可归属 Object、形成 Open Question 或触发 Investigation。
- `Discussion`：人类自由表达、回答、质疑和补充的原始交流层。
- `Claim`：可被 Evidence 支持、反驳、限定或更新的知识断言。
- `Investigation`：一次 Agent 研究、归纳或重新评估过程，不是前台长期对象。

### Discussion → Knowledge State

Agent 可以从讨论中提取候选 Claim、Observation、Counterexample、Limitation 和 Evidence Gap，但不得将讨论数量、热度或多数意见直接等同于事实或共识。原始讨论必须可追溯；结构化归档必须说明其影响的 Claim、证据依据、适用条件与不确定性。冲突和少数观点不得被摘要吞掉。

### Agent 权限边界

Agent 可以组织知识、发现缺口、提出 Mission、评估 Evidence、建议 Claim 影响并生成可解释的 Knowledge State 更新；Agent 不得单独删除反例、宣布争议结束、把多数观点当作事实、抹除历史状态或替用户改变原意。`Knowledge State` 的更新必须保留来源、限制与状态变化解释。

### 36 小时 Golden Demo

比赛 Demo 只需证明一个 AI Coding Knowledge Object 的闭环：人类讨论 → Agent 组织 → Knowledge State / Claims / Gap → Mission → Observation → Re-evaluation → Knowledge Object 更新。现有 Investigation、Evidence Grade、Gap Suitability、Mission 与 Impact Receipt 作为后台 Knowledge Evolution Engine 保留，不在短期内重写为新的领域链路。

## 真实 LLM 运行目标

后端不是静态 Demo 数据服务。最终效果是：输入新的用户问题或讨论后，真实 LLM 参与知识组织；输入新的 Observation 后，真实 LLM 参与 Claim 归因和重新评估。

### LLM 负责的能力

- Knowledge Object routing：判断问题/讨论属于哪个已有 Object，或标记需要人工确认；
- Discussion extraction：提取 Opinion、Claim Candidate、Observation、Counterexample、Limitation；
- Claim linking：将结构化内容链接到已有 Claim，不通过展示文本匹配；
- Gap discovery：发现已有知识仍无法回答的具体缺口；
- Mission planning：把适合真人参与的 Gap 转换为清晰、可执行的 Mission；
- Re-evaluation：只评估目标 Mission、Gap 和 Claim 相关 Evidence，并输出状态变化理由。

### LLM 不得绕过的边界

LLM 输出必须经过 schema validation、来源追踪和业务边界检查。LLM 不得直接写入任意 Knowledge State，不得绕过 Evidence Grade、Gap Match、Mission 状态和 Re-evaluation isolation。无效 JSON、超时、限流、上游不可用必须转为明确错误并按 `LIVE → CACHE → GOLDEN_FIXTURE` 回退。

### 推荐后端流水线

```text
HTTP route
→ Application orchestration
→ LLM adapter / Agent action
→ Contract schema validation
→ Evidence / Agent / Community rules
→ Persistence
→ Knowledge Object projection
```

LLM adapter 负责供应商协议、超时、限流和响应解析；Agent package 负责领域决策；Evidence package 负责可信度；Community 负责参与与 Mission；Persistence 负责保存运行结果，不负责事实判断。

### LLM 运行记录

每次 LLM 运行至少应记录：`runId`、`agentAction`、`inputRefs`、`model`、`provenance`、`status`、`structuredOutput`、`limitations`、`createdAt`。记录应支持从 Knowledge State 变化回溯到讨论、Evidence 和具体 LLM 运行。

### 真实 LLM 与 Demo Fixture

默认路径为真实 LLM；测试必须使用 deterministic fake adapter，不调用真实模型。现场无可用 LLM 时才使用 CACHE 或 GOLDEN_FIXTURE，并在响应中返回 `provenance` 和 `limitations`。
