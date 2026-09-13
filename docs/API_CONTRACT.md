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
  whyUnresolved: string;
  missingObservation: string;
  targetParticipants: string[];
  expectedValue: string;
}
```

说明：

- `affectedClaim` 当前仅是人类可读文本。
- TARGET P0 需要稳定的 `affectedClaimId`；该字段尚未实现。
- `affectedClaimId` 必须引用 Investigation 内已有 Claim/ClaimAssessment，而不是复制第二套 Claim Authority。

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
  estimatedSeconds: number;
  createdAt: string;
}
```

说明：

- `estimatedSeconds` 是当前代码字段，当前限定为 `> 0` 且 `<= 60`。
- `estimatedSeconds` 标记为 **deprecated / planned removal**。轻量体验是 Mission 设计原则，不是长期核心业务 Contract。
- TARGET P0 需要最小生命周期 `OPEN | CLOSED`；当前尚未实现。
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

当前风险：

- Re-evaluation 当前可能读取 Investigation 下全部 Evidence。
- TARGET P0 必须隔离到 Mission、Gap 和受影响 Claim 的相关 Evidence。

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
| `POST` | `/api/investigations`              | `201 Investigation`                                                 |
| `GET`  | `/api/investigations/:id`          | `200 Investigation`                                                 |
| `POST` | `/api/investigations/:id/missions` | `201 Investigation`；同一 Gap 已存在 Mission 时 `200 Investigation` |
| `POST` | `/api/missions/:id/evidence`       | `201 Investigation`                                                 |

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

### `GET /api/investigations/:id`

当前返回完整 `Investigation`。这是当前唯一可用的读取接口。

### `POST /api/investigations/:id/missions`

可选输入：

```ts
{ gapId?: string }
```

当前行为：

- `MISSION_READY`：创建 Mission 或返回已有 Mission。
- `NEEDS_REFRAMING` 或 `NOT_SUITABLE_FOR_HUMAN_MISSION`：返回 `409 VALIDATION_ERROR`。
- 显式 `gapId` 与实际 mission-ready Gap 不一致：返回 `409 VALIDATION_ERROR`。

### `POST /api/missions/:id/evidence`

输入：

```ts
EvidenceSubmission;
```

当前行为：

- 调用 Evidence Grade 与 Gap Match。
- 将 EvidenceRecord 加入 Investigation。
- 对整个 Investigation 执行 Re-evaluation。
- 返回更新后的 `Investigation`。

当前限制：

- 不返回 Impact Receipt。
- 没有 Mission 生命周期检查。
- route handler 直接修改 Evidence 与 Knowledge State，只适合 vertical slice。
- Evidence 到 Claim 的归因仍不稳定。

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

TARGET P0 尚未整体实现。以下接口和 Contract 是已确认目标，不得在文档或 UI 中伪装为当前可用。

## Target P0 API

| Method | Path                         | Target State                             |
| ------ | ---------------------------- | ---------------------------------------- |
| `GET`  | `/api/investigations`        | PLANNED                                  |
| `GET`  | `/api/investigations/:id`    | CURRENT，保留并扩展为社区投影            |
| `GET`  | `/api/missions`              | PLANNED                                  |
| `GET`  | `/api/missions/:id`          | PLANNED                                  |
| `POST` | `/api/missions/:id/evidence` | CURRENT 写接口；目标行为需按下方流程升级 |
| `GET`  | `/api/evidence/:id/impact`   | PLANNED                                  |

保留当前写接口以兼容 Golden Demo，不为 REST 对称性增加无必要接口。

## Target Mission Lifecycle

```ts
type MissionStatus = "OPEN" | "CLOSED";
```

目标语义：

- `OPEN`：Mission 接受符合资格与 Gap 要求的 Evidence。
- `CLOSED`：Mission 不再接受普通 Evidence；只能通过明确的重新打开流程或用新 Mission 继续。
- 已收到 Evidence 不因关闭而删除。
- `estimatedSeconds` 从长期核心 Contract 中计划移除。

## Target ImpactReceipt

以下为目标 Contract，当前未实现：

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

## Target Evidence Intake Flow

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

目标实现完成前，当前写接口仍是唯一真实行为。

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
