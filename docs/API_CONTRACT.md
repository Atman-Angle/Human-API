# API_CONTRACT.md

## 状态说明

本文件区分三类内容：

- `CURRENT`：当前代码真实存在，可依赖。
- `TARGET P0`：已确认需要实现的产品 Contract，但当前可能尚未实现。
- `FUTURE`：尚未承诺，不得按已实现接口使用。

可执行唯一事实源仍然是：

```text
packages/contracts
```

前端和后端只能 import 同一份 Contract。如果目标 Contract 需要修改字段、状态或接口，必须先修改 `packages/contracts`，再同步本文件与实现。

---

# CURRENT

## 当前核心状态

```ts
type KnowledgeStateStatus = "UNRESOLVED" | "EARLY_EVIDENCE" | "SUPPORTED_WITH_LIMITATIONS";

type EvidenceGrade = "E0_OPINION" | "E1_FIRST_HAND" | "E2_ARTIFACT_BACKED";

type GapSuitabilityStatus = "MISSION_READY" | "NEEDS_REFRAMING" | "NOT_SUITABLE_FOR_HUMAN_MISSION";

type MissionStatus = "OPEN" | "CLOSED";

type SearchProvenance = "LIVE" | "CACHE" | "GOLDEN_FIXTURE";
```

## 当前 AgentAction

```ts
type AgentAction =
  | "SEARCH_ZHIHU"
  | "SEARCH_WEB"
  | "ASSESS_EVIDENCE"
  | "ASSESS_GAP_SUITABILITY"
  | "REFRAME_GAP"
  | "CREATE_MISSION"
  | "STOP";
```

## ClaimAssessment

```ts
interface ClaimAssessment {
  id: string;
  claim: string;
  rationale: string;
  sourceRefIds: string[];
  evidenceIds: string[];
}
```

`ClaimAssessment` 是当前 Investigation 内的 Claim 身份与解释载体。不得在 Community、UI 或 Persistence 中另造一套 Claim Authority。

## EvidenceGap

```ts
interface EvidenceGap {
  id: string;
  claim: string;
  affectedClaim: string;
  affectedClaimId: string;
  whyUnresolved: string;
  missingObservation: string;
  targetParticipants: string[];
  expectedValue: string;
}
```

说明：

- `affectedClaim` 仅是人类可读文本，负责展示。
- `affectedClaimId` 是稳定关系字段，必须引用同一 Investigation 内已有的 Claim/ClaimAssessment。
- 两者用途不得混用；`affectedClaimId` 不得通过 Claim 文本匹配生成。

## GapSuitabilityResult

```ts
interface GapSuitabilityResult {
  status: GapSuitabilityStatus;
  initialStatus?: GapSuitabilityStatus;
  singleObservation: boolean;
  lowHumanCost: boolean;
  decisionImpact: boolean;
  prevalenceRisk: boolean;
  standardizedMeasurementDependency: boolean;
  reason: string;
  reframedGap?: EvidenceGap;
}
```

约束：

- 只有 `status === "MISSION_READY"` 时才能创建 Mission。
- `prevalenceRisk` Gap 不得直接标记为 `MISSION_READY`。
- `standardizedMeasurementDependency` Gap 默认不可创建 Mission。
- 自动 Reframe 最多一次；`reframedGap` 必须重新通过 Suitability Gate。
- `initialStatus` 保留首次评估结果，便于解释 `NEEDS_REFRAMING` 路径。

## EvidenceMission

```ts
interface EvidenceMission {
  id: string;
  investigationId: string;
  evidenceGapId: string;
  title: string;
  description: string;
  qualification: string[];
  questions: MissionQuestion[];
  status: MissionStatus;
  /** @deprecated Retained only for existing Demo compatibility. */
  estimatedSeconds: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedReason?: string;
}
```

说明：

- `evidenceGapId` 是 Mission 到 Gap 的稳定关系字段，必须引用同一 Investigation 内已有的 `EvidenceGap.id`。
- Mission 通过 Gap 间接确定 Claim，不复制 Claim 状态。
- 新 Mission 创建时必须为 `status = OPEN`，且 `createdAt === updatedAt`。
- 只有 `OPEN` Mission 接受新的 Evidence Submission；`CLOSED` Mission 仍可读取，历史和归因不得删除。
- `closeMission(...)` 是当前内部确定性 transition；关闭时写入 `updatedAt`、`closedAt` 与非空 `closedReason`。当前不开放 `POST /api/missions/:id/close`。
- `estimatedSeconds` 仍因现有 Golden Demo 脚本读取而保留，并标记为 **deprecated / planned removal**。轻量体验是 Mission 设计原则，不是长期核心业务 Contract；不得新增依赖。
- Mission Feed 指按 Investigation 与 Evidence Gap 组织的结构化 Mission 列表，不是通用内容推荐流。

## EvidenceSubmission

```ts
interface EvidenceSubmission {
  statement: string;
  participantType?: string;
  experience?: string;
  task?: string;
  aiRole?: string;
  humanJudgment?: string;
  artifactUrl?: string;
}
```

## EvidenceRecord

```ts
interface EvidenceRecord {
  id: string;
  missionId: string;
  participantType: string;
  submission: EvidenceSubmission;
  observation: string;
  grade: EvidenceGrade;
  gradeReason: string;
  matchesGap: boolean;
  createdAt: string;
}
```

## Attribution Chain

```text
EvidenceRecord.missionId
  → EvidenceMission.id
  → EvidenceMission.evidenceGapId
  → EvidenceGap.id
  → EvidenceGap.affectedClaimId
  → ClaimAssessment.id
```

约束：

- `EvidenceRecord` 只保存 `missionId`；`investigationId` 来自拥有该 Mission 的 Investigation Aggregate。
- `evidenceGapId` 从 Mission 解析，`affectedClaimId` 从 Gap 解析，不要求在 EvidenceRecord 中重复存储。
- 所有业务关系必须沿上述 ID 链解析；不得通过 `claim`、`affectedClaim` 或其他展示文本匹配建立归属。
- API 必须以服务端已有 Mission → Gap → Claim 链路为准，客户端不能指定 Claim 归属。

## KnowledgeState

```ts
interface KnowledgeState {
  status: KnowledgeStateStatus;
  evidenceCount: number;
  supported: ClaimAssessment[];
  unsupported: ClaimAssessment[];
  limitations: string[];
  nextGap?: EvidenceGap;
  updatedAt: string;
}
```

约定：

- supported 不等于普遍真理。
- unsupported 不等于 False。
- Knowledge State 从当前 Investigation 派生，不得跨 Investigation 复用 Claim、Gap 或 Limitations。

## EvidenceState

```ts
interface EvidenceState {
  known: string[];
  disagreements: string[];
  supported: ClaimAssessment[];
  unsupported: ClaimAssessment[];
  limitations: string[];
  candidateGap?: EvidenceGap;
  gapSuitability?: GapSuitabilityResult;
  nextGap?: EvidenceGap;
}
```

约定：

- `candidateGap` 是搜索后提出的原始 Gap。
- `gapSuitability` 是结构化适配性判断。
- `nextGap` 只在最终 `MISSION_READY` 时存在。
- Reframe 成功时，`nextGap` 指向 `gapSuitability.reframedGap`。

## ReEvaluation

```ts
interface ReEvaluation {
  supportedNow: ClaimAssessment[];
  stillUnsupported: ClaimAssessment[];
  limitations: string[];
  knowledgeState: KnowledgeStateStatus;
  whyStateChanged: string;
  updatedAt: string;
}
```

当前行为：

- 必须显式传入目标 Mission 与 Gap，并验证 `mission.evidenceGapId === gap.id`。
- 通过 `gap.affectedClaimId` 定位目标 Claim，不进行 Claim 文本匹配。
- 先按 `record.missionId === mission.id` 隔离 Mission Evidence，再筛除 `matchesGap !== true` 和 E0。
- 仅返回目标 Claim 的更新；其他 Claim 不因本次 Re-evaluation 被推进或改写。

当前限制：

- 多 Mission 的完整编排仍属于后续任务；当前 Agent 测试已覆盖多 Mission / Gap / Claim 的隔离行为。

## Investigation

```ts
interface Investigation {
  id: string;
  question: string;
  searches: {
    zhihu: SearchResponse;
    global: SearchResponse;
  };
  evidenceState: EvidenceState;
  actions: AgentAction[];
  missions: EvidenceMission[];
  evidence: EvidenceRecord[];
  knowledgeState: KnowledgeState;
  reevaluation?: ReEvaluation;
  createdAt: string;
  updatedAt: string;
}
```

---

## Current API

以下接口是当前真实存在的：

| Method | Path                               | Result                                                              |
| ------ | ---------------------------------- | ------------------------------------------------------------------- |
| `GET`  | `/api/investigations`              | `200 InvestigationListItem[]`                                       |
| `POST` | `/api/investigations`              | `201 Investigation`                                                 |
| `GET`  | `/api/investigations/:id`          | `200 Investigation`                                                 |
| `POST` | `/api/investigations/:id/missions` | `201 Investigation`；同一 Gap 已存在 Mission 时 `200 Investigation` |
| `GET`  | `/api/missions`                    | `200 MissionListItem[]`；支持 `?status=OPEN`                        |
| `GET`  | `/api/missions/:id`                | `200 { mission: EvidenceMission, evidence: EvidenceRecord[] }`      |
| `POST` | `/api/missions/:id/evidence`       | `201 { record, receipt, investigation }`                            |
| `GET`  | `/api/evidence/:id/impact`         | `200 ImpactReceipt`                                                 |
| POST   | /api/discussions/organize          | 200 { organization: DiscussionOrganization, run: LLMRun }           |
| GET    | /api/knowledge-objects/:id         | 200 KnowledgeObjectProjection                                       |

### `POST /api/investigations`

输入：

```ts
{
  question: string;
}
```

当前行为：

1. 调用 `zhihu_search`。
2. 调用 `global_search`。
3. 生成 `candidateGap`。
4. 执行 Gap Suitability Gate。
5. 保存并返回 `201 Investigation`。

只有最终 `MISSION_READY` 的 Gap 会进入 `evidenceState.nextGap`。

### `GET /api/investigations`

当前行为：

- 返回所有 Investigation 的摘要列表。
- 每个摘要包含 `id`、`question`、`knowledgeState`（状态枚举）、`missionCount`、`evidenceCount`、`createdAt`、`updatedAt`。
- 不返回 Investigation 完整内容（详情需调用 `GET /api/investigations/:id`）。

### `GET /api/investigations/:id`

当前返回完整 `Investigation`，包含 Claim、Gap、Mission、Evidence 和 Knowledge State。

### `POST /api/investigations/:id/missions`

可选输入：

```ts
{ gapId?: string }
```

当前行为：

- `MISSION_READY`：创建 `OPEN` Mission；同一 `evidenceGapId` 已存在 Mission 时返回现有 Mission，不追加等价 Mission。
- `NEEDS_REFRAMING` 或 `NOT_SUITABLE_FOR_HUMAN_MISSION`：返回 `409 VALIDATION_ERROR`。
- 显式 `gapId` 与实际 mission-ready Gap 不一致：返回 `409 VALIDATION_ERROR`。

### `POST /api/missions/:id/evidence`

输入：

```ts
EvidenceSubmission;
```

当前行为：

- Mission 不存在时返回 `404 NOT_FOUND`；Mission 存在但不是 `OPEN` 时，在 Evidence Grade 之前返回 `409 VALIDATION_ERROR`。
- 服务端按 `missionId → EvidenceMission.evidenceGapId → EvidenceGap → affectedClaimId → ClaimAssessment` 解析归因。
- Mission、Gap 或 Claim 缺失，或 Gap 不属于该 Investigation 时返回 `409 VALIDATION_ERROR`。
- 请求体只接受 `EvidenceSubmission`；客户端提交的 `missionId`、`evidenceGapId` 或 `affectedClaimId` 会被 schema 剥离，不能覆盖服务端归因。
- 调用 Evidence Grade 与 Gap Match，并以服务端 Mission ID 保存 EvidenceRecord。
- Re-evaluation 只读取 `record.missionId === mission.id` 的 Evidence，再使用 `matchesGap` 与 E1/E2 条件筛选。
- 只更新 `gap.affectedClaimId` 指向的 Claim；同一 Investigation 的其他 Claim 保持原状态。
- 返回更新后的 `Investigation`，包含 `record`、`receipt` 与 `investigation`。

当前限制：

- Mission 当前只实现内部 `closeMission(...)` transition；没有关闭 HTTP API、重新打开流程或自动关闭策略。
- `EvidenceRecord` 不重复保存 `investigationId`、`evidenceGapId`、`affectedClaimId`；这些值通过所属 Investigation 和 Mission → Gap → Claim 链稳定推导。### `GET /api/investigations`

当前行为：

- 返回所有 Investigation 的摘要列表。
- 每个摘要包含 `id`、`question`、`knowledgeState`（状态枚举）、`missionCount`、`evidenceCount`、`createdAt`、`updatedAt`。
- 不返回 Investigation 完整内容（详情需调用 `GET /api/investigations/:id`）。

### `GET /api/missions`

当前行为：

- 返回所有 Mission 的摘要列表。
- 支持 `?status=OPEN` 过滤，只返回状态为 `OPEN` 的 Mission。
- 每个摘要包含 `id`、`investigationId`、`evidenceGapId`、`title`、`status`、`evidenceCount`、`createdAt`。
- 不返回 Evidence 列表（详情需调用 `GET /api/missions/:id`）。

### `GET /api/missions/:id`

当前行为：

- 返回 `{ mission: EvidenceMission, evidence: EvidenceRecord[], investigationId: string }`。
- `evidence` 仅包含属于该 Mission 的 Evidence，按 `createdAt` 升序排列。
- Mission 不存在时返回 `404 NOT_FOUND`。

### `GET /api/evidence/:id/impact`

当前行为：

- 从 Investigation 状态重建单条 Evidence 的 Impact Receipt。
- 返回 `ImpactReceipt`，包含 `evidenceId`、`missionId`、`investigationId`、`accepted`、`grade`、`affectedClaimId`、`stateBefore`、`stateAfter`、`impactSummary`、`stillMissing`、`createdAt`。
- Evidence 不存在时返回 `404 NOT_FOUND`。
- 注意：`stateBefore` 为重建估算值，POST 提交时返回的 receipt 是权威版本。

## Current Error Contract

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryable: boolean;
  };
}
```

```text
VALIDATION_ERROR
NOT_FOUND
UPSTREAM_TIMEOUT
UPSTREAM_RATE_LIMIT
UPSTREAM_INVALID_RESPONSE
UPSTREAM_UNAVAILABLE
UPSTREAM_ERROR
AUTH_REQUIRED
INTERNAL_ERROR
```

---

# TARGET P0

以下接口和 Contract 为主要目标。大部分已实现为 CURRENT，部分扩展仍为后续目标：

## Target P0 API

所有 CURRENT 接口已在上方 `## Current API` 节完整列出。以下仅保留仍属 TARGET P0 的扩展说明。

保留当前写接口以兼容 Golden Demo，不为 REST 对称性增加无必要接口。

## Mission Lifecycle Extensions

`MissionStatus = "OPEN" | "CLOSED"`、创建为 `OPEN`、`CLOSED` 拒绝普通 Evidence，以及历史归因保留均属于 `CURRENT`。

仍属于后续目标、当前未实现：

- 明确业务条件触发的自动关闭。
- HTTP 关闭/重新打开工作流；只有 Golden Demo 明确需要时才增加接口。
- `estimatedSeconds` 从长期核心 Contract 中移除。

## ImpactReceipt

以下为 CURRENT，在 Evidence Intake 时生成：

```ts
interface ImpactReceipt {
  evidenceId: string;
  missionId: string;
  investigationId: string;
  accepted: boolean;
  grade: EvidenceGrade;
  affectedClaimId: string;
  stateBefore: KnowledgeStateStatus;
  stateAfter: KnowledgeStateStatus;
  impactSummary: string;
  stillMissing: string[];
  createdAt: string;
}
```

说明：

- `stateBefore` 与 `stateAfter` 是状态枚举，不是复制第二套完整 Knowledge State。
- `accepted` 表达 Evidence 是否进入有效影响链；E0 或不匹配 Evidence 可以为 false。
- `stillMissing` 说明下一 Knowledge Frontier，而不是泛泛的“需要更多数据”。
- Impact Receipt 的 Authority 属于 Community；不能由 UI 自行推断。

## Evidence Intake Flow

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

目标行为：

1. API 校验请求与 Mission 是否 `OPEN`。
2. Evidence Authority 校验并 Grade Evidence，判断 Gap Match。
3. Agent 只针对目标 Mission、Gap 和 Claim 的相关 Evidence 做 Re-evaluation。
4. 状态转移形成明确 before / after。
5. Community Authority 生成 Impact Receipt。
6. Persistence Authority 保存 Evidence、Re-evaluation、Knowledge State 与 Impact Receipt。

---

# FUTURE

本轮不承诺新增以下 API：

- Follow / Unfollow Investigation
- Evidence Timeline
- Counterexample Mission
- Coverage
- Mission Recommendation
- Notification
- Observer Profile
- Ranking 或积分接口

这些能力需要分别完成产品锁定、Contract First 与 Authority Review，不得提前写入当前 API 或前端 DTO。

DiscussionOrganization additionally accepts optional routing (knowledgeObjectId, confidence 0–1, uncertain, rationale), summary, and missionRecommended. relations defaults to an empty array and contains claimId, relation (SUPPORTS / CHALLENGES / LIMITS / OPENS_QUESTION), and rationale. These are candidate interpretations, not Evidence Grade or Knowledge State decisions.

## A09 Discovery and community read projections

- `GET /api/discovery/topics` → `DiscoveryTopic[]` (shared `DiscoveryTopicsResponseSchema`).
- `GET /api/investigations/:id/community-view` → `KnowledgeObjectProjection`.
- `GET /api/knowledge-objects/:id` retains its existing fields and returns the same shared projection.
- These reads never trigger search, LLM calls, Mission creation, or Evidence evaluation.
- `summary.consensus` projects the Agent's existing public-evidence `known` output; it is not a population consensus claim. `disagreements` projects the existing disagreements; `unknowns` projects current unsupported Claims and the current Knowledge State Gap. Limitations remain visible.
- `sources` contains actual retrieved source records. `sourceCount` counts unique provider/content IDs; `discussionCount` counts stored discussions only. No invented participant, answer, or comment totals.
- Search provenance is retained per provider; mixed LIVE/CACHE/FIXTURE is never flattened into LIVE. LLM provenance remains in `llmRuns`.
- `activeInvitation` is an OPEN Mission for the current next Gap only; absent when that Gap has no open Mission. Historical Missions remain readable.
- Missing objects return 404; an empty repository returns an empty discovery array. Discovery is a read of existing investigations, not an automatic topic-generation system.

## A06 Immutable submission receipts

`Investigation.impactReceipts?: ImpactReceipt[]` stores submission-time snapshots. Optional only for compatibility with old fixtures. New submissions persist the exact returned receipt within the existing aggregate. `GET /api/evidence/:id/impact` reads that snapshot and never reconstructs stateBefore/stateAfter from current state. Legacy Evidence without a stored receipt returns 404 rather than fabricating history. Storage remains in-memory and is lost on server restart.

## Product Direction v3 — conversational Golden Demo (2026-09-14)

- `POST /api/demo/prepare`: idempotently researches the fixed AI Coding topic through the existing SearchService and creates its initial Investigation and OPEN invitation. Concurrent requests share one preparation. No synthetic participant content is added.
- `POST /api/missions/:id/conversation`: accepts `ConversationDraftRequest` (`answers`, 0–3 user turns), returns `ConversationDraft`. An initial question comes from the Mission; follow-ups request only missing context, at most two. `preparation=EXTRACTIVE_RULES` is an honest deterministic orchestration mode, not a live LLM claim. Summary is the user's original text, not invented facts. This endpoint never writes Evidence.
- `POST /api/missions/:id/conversation/confirm`: accepts `ConfirmObservationRequest` (`confirmed: true`, editable `summary`, `demoSample`). Re-extracts only the final confirmed text on the server and calls the existing Evidence intake; returns `EvidenceIntakeResponse`. Missing facts remain absent; client-supplied grade/state/attribution cannot override Authority.
- `EvidenceSubmission.demoSample` is optional and labels an explicitly selected synthetic demo contribution. It does not bypass grading or affect acceptance. Public content provenance is independent from contribution provenance.
- Browser refresh reads authoritative Investigation/receipts. The repository remains in-memory; API process restart intentionally resets demo state. No production persistence is claimed.

### 回执的可读贡献说明

ImpactReceipt 新增向后兼容的可选 contribution：observation（仅 accepted 时保存该条确认原文）、explanation（解释采纳/拒绝及状态变化）、boundary（个体观察不等于总体结论）。这些字段在已有 intake 中由实际 grading 和 re-evaluation 结果生成，随原回执保存；projection 原样返回，不在读取时重算。它不表示语义新颖性或已独立核验，也不创建第二套知识状态。旧回执没有该字段时 UI 保留原有展示。

## Community Chat Vertical Slice (2026-09-14)

- `POST /api/chat/route` routes a question to `MATCHED_INVESTIGATION`, `DIRECT_ANSWER`, or `CREATE_PROPOSAL`.
- `POST /api/investigations/proposals` creates an in-memory proposal; it does not create an Investigation.
- `POST /api/investigations/proposals/:id/confirm` confirms an existing proposal and creates the Investigation.
- `POST /api/investigations/:id/participation` routes a message to question, evidence-intake, or mission-interest.
- `GET /api/investigations/:id/activity` returns derived activity events.

The current implementation is a backend demo slice. Proposals and domain aggregates are not yet durable across process restart.

## Community Chat Vertical Slice

See docs/COMMUNITY_CHAT_SPEC.md for Chat Gateway, Proposal, Participation, Activity, and MaintenanceRun contracts.
