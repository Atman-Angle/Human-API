# Human Gateway AI-native Knowledge Community Specification

**Status:** Development Target
**Date:** 2026-09-13
**Scope:** 36-hour hackathon demo and the minimum backend/frontend behavior required to demonstrate the product direction

## 1. Product Goal

Human Gateway is an AI-native knowledge community built on top of Zhihu-like questions, answers, discussions, and real human experience.

It is not primarily an AI answer generator, a research dashboard, or a Mission marketplace. Its primary unit is the **Knowledge Object**: a long-lived shared object that continuously records what the community currently knows, what remains uncertain, which Claims conflict, and what evidence is still needed.

The core product promise is:

> Humans create rich discussion. Agents organize that discussion into traceable, evolving shared knowledge, discover gaps, and ask humans for the missing evidence.

## 2. Demonstration Thesis

The demo must make one thing obvious within five minutes:

> A discussion does not end as a buried post. The Agent turns it into structured knowledge, identifies uncertainty, asks the community a focused question, and updates the shared Knowledge Object when new evidence arrives.

The demo should use one Circle and one Golden Knowledge Object:

- Circle: **AI Coding Circle**
- Knowledge Object: **AI Coding 对初级开发者工作的影响**

## 3. Core Product Loop

```text
Human asks / discusses
→ Agent organizes discussion
→ Claims, Evidence, conflicts and limitations become visible
→ Knowledge State and Open Questions are updated
→ Agent identifies an Evidence Gap
→ Agent creates a focused Mission
→ Human submits an Observation
→ Evidence is graded and attributed
→ Related Claims are re-evaluated
→ Knowledge Object is updated with an explanation
→ New uncertainty and discussion emerge
```

## 4. Core Concepts

### 4.1 Circle

A community and navigation boundary. The first Circle is AI Coding Circle. Circle does not make factual decisions and does not own Knowledge State.

### 4.2 Knowledge Object

A persistent, topic-bounded shared knowledge object. It contains:

- current Knowledge State;
- Claims;
- supporting and counter Evidence;
- disagreements and minority views;
- Open Questions and Evidence Gaps;
- Discussions;
- Missions;
- Recent Changes;
- provenance and limitations.

A Knowledge Object is not a single post, answer, Question, or Investigation.

### 4.3 Discussion

The human conversation layer. Users may ask, answer, challenge, provide context, share experience, cite sources, and disagree freely.

Discussion is an input to the knowledge system, not automatically a fact. Original discussion must remain traceable after Agent organization.

### 4.4 Claim

A specific knowledge assertion that can be supported, challenged, limited, or revised by Evidence. Claims must retain scope, conditions, time context, and related Evidence where available.

### 4.5 Investigation

A backend knowledge-evolution process used by the Agent to research, organize, discover gaps, and re-evaluate Claims. Investigation is an internal mechanism and should not be the primary user-facing product object.

### 4.6 Mission

A focused request generated from a concrete Evidence Gap. A Mission asks a suitable human for a specific Observation rather than a generic opinion.

### 4.7 Observation / Evidence

A user's concrete experience, event, workflow, artifact, or source that can be evaluated and attributed to a Mission, Gap, and Claim.

## 5. Required User Experience

### 5.1 Browse

A user can enter the AI Coding Circle, open the Knowledge Object, and understand:

- what is currently known;
- which Claims are supported or unresolved;
- where disagreements exist;
- what is still unknown;
- what Missions are active;
- what changed recently.

### 5.2 Ask and Discuss

A user can ask a question or participate in a discussion associated with the Knowledge Object. The Agent can organize discussion into structured interpretations such as:

- Opinion;
- Claim Candidate;
- Observation;
- Counterexample;
- Limitation;
- Evidence Gap.

The system must show which Claims or Open Questions the organization relates to.

### 5.3 Mission Participation

A user can open an active Mission, understand why it exists, and submit a focused Observation. The request should be concrete enough to complete in approximately 30–60 seconds.

### 5.4 Knowledge Update

After submission, the user can see:

- Evidence Grade;
- the affected Claim(s);
- whether the Knowledge State changed;
- what was strengthened, challenged, or limited;
- what remains unknown;
- an Impact Receipt explaining the contribution.

The system must be able to explain why an Evidence item did not change a Claim or overall Knowledge State.

## 6. Required Agent Behavior

The Agent must be able to:

- route a question or discussion to an existing Knowledge Object or mark routing uncertain;
- organize human discussion without erasing the original content;
- extract candidate Claims, Observations, Counterexamples, Limitations, and Evidence Gaps;
- connect structured interpretations to existing Claims;
- identify concrete gaps in current knowledge;
- decide whether a Gap is suitable for a Mission;
- generate a focused Mission;
- evaluate how new Evidence affects only eligible Claims;
- produce an explainable Knowledge State update;
- identify the next unresolved question or frontier.

The Agent must not:

- treat popularity or majority opinion as truth;
- silently erase minority views or counterexamples;
- convert one opinion into a confirmed fact;
- claim that one Observation proves a universal conclusion;
- bypass Evidence Grade, Gap Match, Mission status, or Re-evaluation isolation;
- delete historical conclusions without preserving their history and reason for change.

## 7. Real LLM Requirement

The product must support real LLM execution for:

- Knowledge Object routing;
- discussion organization;
- Claim and Evidence linking;
- Evidence Gap discovery;
- Mission planning;
- Claim re-evaluation.

LLM output must be structured, schema-validated, traceable to its input, and associated with a model, run status, timestamp, provenance, and limitations.

The LLM is an organizer and evaluator within the product rules, not an unreviewable source of truth.

The system must support the following operational fallback:

```text
LIVE LLM
↓
CACHE
↓
GOLDEN FIXTURE
```

Fallback data must be clearly identified and must not be presented as live model output.

## 8. Required Demo Outcome

The completed demo must show the following visible sequence:

1. The user opens the AI Coding Knowledge Object.
2. The user sees human discussion with disagreement and concrete experience.
3. The Agent organizes the discussion into Claims, relationships, limitations, and an unresolved gap.
4. The Agent creates or exposes a focused Mission.
5. The user submits a realistic Observation.
6. The system grades and attributes the Evidence.
7. The Agent re-evaluates only the related Claim(s).
8. The Knowledge Object displays a changed or intentionally unchanged Knowledge State.
9. The user receives an Impact Receipt.
10. The updated Object shows what changed and what remains unknown.

## 9. Technical Scope Boundary

The current implementation may continue to use Investigation as the backend Aggregate and expose a Knowledge Object projection for the demo.

The demo does not require:

- a complete general-purpose social network;
- multiple Circles;
- automatic creation of arbitrary Knowledge Objects;
- a full Post/Comment/Like system;
- complete user profiles or authentication;
- multi-agent orchestration;
- a knowledge graph;
- complex ranking or recommendation;
- long-term memory;
- large-scale event sourcing.

## 10. Definition of Done

The target is complete when:

- one AI Coding Knowledge Object can be browsed;
- human discussion is visible and remains traceable;
- a real LLM can organize discussion and identify a concrete gap;
- a Mission can be opened and completed;
- an Observation is validated, graded, and attributed;
- only eligible Claims are re-evaluated;
- the Knowledge State changes or remains unchanged for an explainable reason;
- an Impact Receipt is generated;
- provenance and limitations are visible for live, cached, or fixture data;
- the Golden Demo is repeatable;
- `npm run verify` passes;
- no second Contract, Claim Authority, Evidence Grade, or Knowledge State implementation is introduced.

## 11. Out of Scope for This Spec

This specification fixes the product behavior and development target. It does not prescribe the exact database schema, LLM vendor, prompt format, UI framework, or internal file layout. Those implementation decisions must preserve the contracts, module boundaries, traceability, and behavior defined above.
