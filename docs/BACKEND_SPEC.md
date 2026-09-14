# Human Gateway Backend Specification

**Status:** Development Target — current implementation is partial
**Date:** 2026-09-13
**Scope:** Backend only
**Related project spec:** `docs/SPEC.md`

## 1. Purpose

This document defines the backend behavior required to support Human Gateway as an AI-native knowledge community. It does not define frontend layout, visual design, or client-side implementation.

The backend must expose a stable, explainable, traceable Knowledge Object experience while preserving the existing Investigation, Evidence, Mission, and Re-evaluation capabilities.

## 1.1 Current Implementation Baseline

当前仓库已经具备一个可运行的 Investigation-centered Knowledge Evolution vertical slice：

- Investigation 与 Knowledge State；
- ClaimAssessment、EvidenceGap 与 `affectedClaimId`；
- Mission `OPEN | CLOSED` 生命周期；
- Evidence Submission、Evidence Grade 与 Gap Match；
- 相关 Claim 的 Re-evaluation isolation；
- Impact Receipt；
- Zhihu / Global Search 以及 `LIVE → CACHE → GOLDEN_FIXTURE` 搜索回退；
- In-memory Investigation Repository；
- Golden Flow、Community Flow 与 52 个自动化测试。

以下能力目前仍属于本 Spec 的目标缺口，不能假设已经存在：

- 真实 LLM adapter 与真实 LLM orchestration；
- Human Discussion 的接收、读取与组织 API；
- Knowledge Object read projection；
- Discussion → Claim / Evidence Gap 的结构化归档；
- Question 到已有 Knowledge Object 的路由；
- LLM run provenance 与运行记录；
- 可跨进程重启保留的 Knowledge Object、Discussion 和 LLM 运行持久化。

本 Spec 是后端目标规格，不是当前完成状态声明。后端只有在第 12 节 Definition of Done 全部满足后，才能认为达到目标。

## 2. Backend Mission

The backend turns human questions, discussions, and observations into structured, evolving knowledge.

It must support this loop:

```text
Human question / discussion
→ Real LLM organization
→ Knowledge Object routing
→ Claim / Observation / Counterexample / Limitation extraction
→ Evidence Gap discovery
→ Mission planning
→ Human Observation submission
→ Evidence validation and grading
→ Mission → Gap → Claim attribution
→ Related Claim re-evaluation
→ Knowledge State transition
→ Impact Receipt
→ Updated Knowledge Object projection
```

## 3. Scope Boundary

The backend owns:

- HTTP API and request validation;
- application orchestration;
- real LLM adapter integration;
- Knowledge Object read projection;
- discussion organization orchestration;
- Evidence validation and grading integration;
- Gap suitability and Mission planning integration;
- Claim attribution and isolated re-evaluation;
- Knowledge State transitions;
- Impact Receipt generation;
- persistence and provenance;
- error mapping and fallback behavior.

The backend does not own:

- frontend layout or visual behavior;
- client-side state management;
- UI ranking or presentation decisions;
- generic social features such as likes, follows, reputation, or feeds;
- independent duplicate implementations of contracts, Claims, Evidence Grade, or Knowledge State.

## 4. Backend Domain Positioning

The current backend may continue to use `Investigation` as the internal Aggregate. The public backend behavior must expose a Knowledge Object projection.

```text
Investigation Aggregate
├── Knowledge State
├── Claim Assessments
├── Evidence State / Gaps
├── Missions
├── Evidence Records
└── Re-evaluation history
        ↓
Knowledge Object Projection
```

`Knowledge Object` is the product-facing projection. `Investigation` is the existing evolution process and backend aggregate. They must not be treated as interchangeable concepts in new contracts or documentation.

## 5. Required Backend Capabilities

### 5.1 Knowledge Object Read Projection

The backend must provide a stable read model containing, where available:

- Object identity, title, description, and Circle association;
- current Knowledge State and human-readable explanation;
- Claims and their assessments;
- supporting, challenging, and limiting Evidence references;
- Discussions and Agent interpretations;
- Open Questions and Evidence Gaps;
- active and closed Missions;
- Recent Changes;
- provenance and limitations.

The projection must be assembled from existing Authorities and must not introduce a second Investigation, Claim, Evidence, or Knowledge State model.

### 5.2 Question and Discussion Organization

The backend must accept a user question or discussion associated with a Knowledge Object or candidate Object.

A real LLM must be able to:

- route the input to an existing Knowledge Object;
- identify related Claims;
- mark routing as uncertain when confidence is insufficient;
- classify content as Opinion, Claim Candidate, Observation, Counterexample, Limitation, or Evidence Gap;
- identify support, challenge, limitation, or open-question relationships;
- propose a concrete Evidence Gap;
- preserve the original input and its provenance.

A discussion must not directly mutate Knowledge State merely because it exists. Structured interpretation must pass through the applicable Agent, Evidence, and attribution rules.

### 5.3 Evidence Gap and Mission Planning

The backend must transform a concrete, suitable Evidence Gap into a Mission with:

- stable Mission identity;
- related Investigation identity;
- related Evidence Gap identity;
- affected Claim identity where applicable;
- clear human participation request;
- Mission status using the existing `OPEN | CLOSED` semantics.

A Mission must request a focused Observation, not a generic opinion.

### 5.4 Observation Intake

The backend must support:

```text
Submit Observation
→ Validate
→ Grade
→ Match Gap
→ Attribute Mission / Gap / Claim
→ Re-evaluate related Claim(s)
→ Build State Transition
→ Build Impact Receipt
→ Persist
```

Evidence must remain linked through stable identifiers. Textual display fields must not be used as the source of attribution.

### 5.5 Isolated Claim Re-evaluation

New Evidence may only affect Claims that are eligible through the target Mission, Evidence Gap, and Claim relationship.

The backend must ensure:

- unrelated Evidence does not affect the target Claim;
- a single Observation does not automatically establish a universal conclusion;
- conflicts, counterexamples, and limitations remain visible;
- state changes include a reason;
- state non-changes also include a reason.

### 5.6 Impact Receipt

Every processed Observation must produce an explainable result containing, at minimum:

- Evidence identity;
- Mission identity;
- Investigation identity;
- acceptance result;
- Evidence Grade;
- affected Claim identity;
- state before;
- state after;
- impact summary;
- remaining gaps or limitations;
- creation time;
- provenance.

## 6. Real LLM Requirements

### 6.1 Minimum Structured LLM Output

每次用于组织问题或讨论的 LLM 输出，至少必须能够回答以下问题：

1. 输入应归属哪个 Knowledge Object，或是否无法确定；
2. 涉及哪些已有 Claim；
3. 内容属于 Opinion、Claim Candidate、Observation、Counterexample、Limitation 还是 Evidence Gap；
4. 对相关 Claim 是 SUPPORTS、CHALLENGES、LIMITS 还是 OPENS_QUESTION；
5. 是否产生新的 Evidence Gap；
6. 是否建议发起 Mission；
7. 当前判断的依据、置信度和限制是什么。

LLM 只能输出候选结构化判断。最终写入 Knowledge State 前，必须经过 Contract 校验以及现有 Agent、Evidence、Community 编排规则。

The default production/demo path must support a real LLM adapter for:

- Knowledge Object routing;
- discussion organization;
- Claim and Evidence linking;
- Evidence Gap discovery;
- Mission planning;
- Claim re-evaluation.

The LLM adapter must be separated from domain rules. It is responsible for provider communication, request construction, timeout handling, rate-limit handling, response parsing, and provider-specific errors.

LLM output must be:

- schema validated;
- associated with an Agent Action;
- traceable to input references;
- associated with model and timestamp;
- explicit about confidence and limitations where applicable;
- rejected or quarantined when invalid.

The LLM must not bypass:

- Contract validation;
- Evidence Grade;
- Gap Match;
- Mission status;
- Claim attribution;
- Re-evaluation isolation;
- persistence consistency.

## 7. LLM Run Provenance

Each LLM run must be traceable through a run record containing, at minimum:

```text
runId
agentAction
inputRefs
model
provenance
status
structuredOutput
limitations
createdAt
```

Knowledge State changes must be explainable by tracing them to relevant discussions, Evidence, Claims, and LLM runs.

## 8. Reliability and Fallback

The backend must distinguish at least:

- timeout;
- rate limit;
- invalid response;
- upstream unavailable;
- validation failure;
- not found;
- Mission closed;
- Evidence not accepted or not matched.

External and LLM-backed reads must support:

```text
LIVE
↓
CACHE
↓
GOLDEN_FIXTURE
```

The response must identify the actual provenance. Cache and fixture data must not be presented as live LLM output.

## 9. API Behavior Target

The exact endpoint names remain governed by `docs/API_CONTRACT.md`. Regardless of route naming, the backend must provide these capabilities:

1. Read a Knowledge Object projection.
2. Read Discussions and Agent organization results.
3. Read Open Questions, Evidence Gaps, and Missions.
4. Accept a question or discussion for organization.
5. Create or expose a suitable Mission.
6. Accept an Observation submission.
7. Return Evidence Grade and attribution.
8. Return Claim re-evaluation and Knowledge State transition.
9. Return an Impact Receipt.
10. Read the updated Knowledge Object projection.

## 10. Required Golden Demo Behavior

The backend is considered demo-ready when it can execute:

```text
GET Knowledge Object
→ GET human discussion and Agent organization
→ GET Evidence Gap / Mission
→ POST Observation
→ Evidence Grade
→ Mission → Gap → Claim attribution
→ Isolated Claim re-evaluation
→ Knowledge State update or explained non-update
→ Impact Receipt
→ GET updated Knowledge Object
```

The demo must use one AI Coding Circle and one Golden Knowledge Object, but the backend contract must remain general enough to support additional objects later.

## 11. Testing Requirements

The backend must cover:

- Contract schema validation;
- deterministic fake LLM adapter behavior;
- real orchestration without requiring network access in tests;
- valid and invalid LLM responses;
- timeout, rate-limit, and upstream failure mapping;
- Knowledge Object projection;
- Discussion organization;
- Evidence Grade;
- Gap suitability;
- Mission OPEN/CLOSED boundaries;
- Evidence → Mission → Gap → Claim attribution;
- unrelated Evidence isolation;
- state transition and non-transition explanations;
- Impact Receipt;
- LIVE / CACHE / GOLDEN_FIXTURE provenance.

Real LLM calls may be used for manual demo verification, but automated tests must remain deterministic.

## 12. Backend Definition of Done

The backend target is complete when:

- a real LLM can organize a new question or discussion;
- the result is schema-valid and traceable;
- the result can be linked to an existing Knowledge Object and Claim, or marked uncertain;
- a concrete Evidence Gap can produce a Mission;
- a human Observation can be validated, graded, and attributed;
- only eligible Claims are re-evaluated;
- conflicts and limitations are preserved;
- Knowledge State changes or remains unchanged for an explainable reason;
- an Impact Receipt is generated;
- the updated Knowledge Object projection is readable by the frontend;
- live, cached, and fixture provenance is explicit;
- failure modes are not silently swallowed;
- `npm run verify` passes;
- existing Golden Demo behavior remains intact;
- no duplicate Contract, Claim Authority, Evidence Grade, or Knowledge State is introduced.

## 13. Implementation Freedom

This document defines the required backend behavior, not a mandatory implementation plan. The backend owner may choose the LLM provider, adapter structure, persistence strategy, prompt design, and exact endpoint names, provided that the existing project Authorities, Contracts, module boundaries, traceability, and Definition of Done are preserved.

## 14. v3 Golden Demo continuation status (2026-09-14)

The currently wired demo uses the existing deterministic Agent research/evidence semantics, SearchService fallback, shared KnowledgeObject projection and immutable intake receipts. Conversation preparation is explicitly `EXTRACTIVE_RULES`: it extracts verbatim clauses, requests missing context at most twice, and never assigns grades, attribution, or Knowledge State. Only the edited, explicitly confirmed summary is re-extracted and passed to existing intake.

This is not a claim that every real-LLM target above has been completed. No new generic conversation platform, second Evidence authority, or production persistence was introduced. In-memory state survives browser refresh but not API process restart. Exact routes remain authoritative in `docs/API_CONTRACT.md`; demo verification and limits are in `docs/DEMO_V3.md`.
