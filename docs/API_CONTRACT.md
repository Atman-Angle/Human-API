# API_CONTRACT.md

## 原则

可执行唯一事实源：

```text
packages/contracts
```

前端和后端只能 import 同一份 Contract。

---

## KnowledgeStateStatus

```ts
type KnowledgeStateStatus =
  | "UNRESOLVED"
  | "EARLY_EVIDENCE"
  | "SUPPORTED_WITH_LIMITATIONS";
```

## EvidenceGrade

```ts
type EvidenceGrade =
  | "E0_OPINION"
  | "E1_FIRST_HAND"
  | "E2_ARTIFACT_BACKED";
```

---

## EvidenceGap

```ts
interface EvidenceGap {
  id: string;
  claim: string;
  whyUnresolved: string;
  missingObservation: string;
  targetParticipants: string[];
  expectedValue: string;
}
```

---

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
}
```

Golden Demo：

```text
estimatedSeconds <= 60
```

---

## EvidenceRecord

```ts
interface EvidenceRecord {
  id: string;
  missionId: string;
  participantType: string;
  observation: string;
  example?: string;
  artifactUrl?: string;
  grade: EvidenceGrade;
  createdAt: string;
}
```

---

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

注意：

- supported ≠ 普遍真理
- unsupported ≠ False

---

## Error

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

建议 code：

```text
VALIDATION_ERROR
NOT_FOUND
UPSTREAM_TIMEOUT
UPSTREAM_RATE_LIMIT
UPSTREAM_INVALID_RESPONSE
MODEL_ERROR
INTERNAL_ERROR
```
