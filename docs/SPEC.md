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

# 12. Product Direction v3 — Agent-Grown Community and Conversational Contribution

**Adopted:** 2026-09-14
**Release target:** Zhihu hackathon Golden Demo, not production release

## 12.1 Product thesis

Human Gateway does not begin with an empty Circle waiting for users to create posts. The Agent first uses available Zhihu/public knowledge inputs to discover a topic, organize existing questions, answers, comments, and related sources, create an initial Knowledge Object, and identify what public knowledge cannot answer. Users enter an already-formed knowledge scene and are invited to contribute first-hand experience only where it can advance the current frontier.

```text
Zhihu/public knowledge
→ Agent topic research and organization
→ Initial Knowledge Object
→ plain-language consensus / disagreement / unknown
→ Evidence Gap
→ conversational invitation
→ user-confirmed Observation
→ Evidence evaluation and re-evaluation
→ contribution receipt and updated Knowledge Object
```

The product must feel like a human community with an Agent editorial layer, not a research dashboard or an empty task marketplace.

## 12.2 User-facing information hierarchy

The UI shall prioritize, in this order:

1. the question and human discussion;
2. what the community currently understands;
3. disagreement and uncertainty;
4. why a first-hand experience is useful;
5. one primary action;
6. technical research details on demand.

The following are secondary implementation details and must not dominate the first viewport: IDs, raw enum values, Claim/Evidence Gap IDs, internal projection labels, request metadata, and re-evaluation internals. When shown, technical states must have a plain-language explanation.

## 12.3 Product surfaces

### Community discovery

The home page is an Agent discovery surface. It presents Knowledge Objects that have already formed from public discussion, their source counts and provenance mode (LIVE, CACHE, or GOLDEN_FIXTURE), a concise Agent summary, consensus, disagreement, unknowns, and one clear entry action. Creating a new research topic is secondary and must explain that the Agent will research existing public discussion first.

### Knowledge Object / discussion view

The primary detail view presents the question, source context, human discussions, and participant context before Agent organization. The Agent layer is expressed as “大家比较一致 / 仍有分歧 / 还不知道” and may include a short, auditable activity summary. Claims, grades, IDs, and raw provenance belong in a collapsible technical details section.

### Conversational contribution

A Mission is user-facing as an invitation, not a task record. The entry asks one open but bounded question generated from the active Evidence Gap. The user answers in a dialogue box, not a multi-field form. The Agent may ask at most one or two targeted follow-ups, must not repeat known information, must not presuppose that the experience supports the current Claim, and must allow “不记得 / 不方便说”.

Before submission, the Agent produces a factual summary for user confirmation. The user can edit or reject the summary. Conversation整理 is not Evidence acceptance and cannot independently assign grade, attribution, or Knowledge State.

### Contribution receipt

After confirmation, the existing Evidence Authority and Re-evaluation Authority evaluate the Observation. The UI presents a plain-language result first: what the experience added, whether the overall judgment changed, and what remains unknown. Technical values such as grade, gap match, affected Claim, and state transition are expandable. Accepted, rejected, and accepted-without-state-change outcomes must all be explainable.

## 12.4 Backend capabilities

The hackathon implementation shall provide or preserve these capabilities without creating a second domain authority:

- public-source discovery and source-mode provenance;
- Agent-generated community/discovery projection;
- human discussion plus Agent organization projection;
- Evidence Gap-specific invitation text;
- conversation draft state and bounded follow-up;
- user-confirmed Observation handoff to existing Evidence intake;
- existing grading, attribution, Mission lifecycle, and re-evaluation;
- contribution-impact projection;
- LIVE → CACHE → GOLDEN_FIXTURE fallback with explicit labeling.

Conversation endpoints, if needed, are application orchestration interfaces. They must not move Evidence Grade, Claim Attribution, or Knowledge State decisions into the conversation layer or frontend.

## 12.5 Hackathon non-goals

Do not expand this release into a full social network, complete Zhihu replacement, multi-agent system, authentication system, recommendation/ranking system, long-term memory, knowledge graph, production-scale persistence, or arbitrary topic marketplace.

## 12.6 Acceptance criteria

A first-time user, without explanation, can answer within 30 seconds: what Human Gateway is, where the content comes from, what the Agent did, what is still missing, and how to participate.

The Golden Demo must visibly complete:

```text
Agent-grown topic
→ public human discussion
→ plain-language Agent organization
→ explicit knowledge boundary
→ open conversational invitation
→ one or two follow-ups
→ user confirmation
→ server-side Evidence evaluation
→ explainable impact receipt
→ updated or intentionally unchanged Knowledge Object
```

The demo must not claim that a single experience proves a universal conclusion, must preserve original human text, and must label cache/fixture content honestly.

## 12.7 Implementation order

1. Rework discovery and Knowledge Object information hierarchy.
2. Replace the Mission form entry with conversational contribution and confirmation.
3. Return and render contribution impact in plain language.
4. Add deterministic Golden Demo seed, failure cases, and LIVE/CACHE/GOLDEN_FIXTURE labels.
5. Run `npm run verify` and exercise the complete path in a browser.
