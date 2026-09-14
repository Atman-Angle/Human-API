# Community Participation + Chat Gateway Spec

**Date:** 2026-09-14
**Owner:** A (Backend / Agent / Contracts)
**Scope:** Backend-only vertical slice; frontend is explicitly out of scope.

## Goal

Support the complete loop: user question → direct answer or existing Investigation match or creation proposal → Discovery → Investigation participation → Agent organization → Evidence/Re-evaluation/Mission updates.

## Invariants

- Investigation/Knowledge Object remains the sole long-lived community authority.
- Evidence Grade, Gap Suitability, Knowledge State and Re-evaluation remain in existing packages.
- Discussion is not Evidence; only confirmed Evidence Intake can change Knowledge State.
- LIVE/CACHE/GOLDEN_FIXTURE provenance is never conflated.
- Proposal confirmation is the only operation that creates a new Investigation.

## Backend API

- `POST /api/chat/route`: `{message, investigationId?}` → `DIRECT_ANSWER | MATCHED_INVESTIGATION | CREATE_PROPOSAL | CLARIFICATION`.
- `POST /api/investigations/proposals`: creates a durable proposal.
- `POST /api/investigations/proposals/:id/confirm`: idempotently creates Investigation.
- `POST /api/investigations/:id/participation`: routes input as question, context, evidence or mission interest.
- `GET /api/investigations/:id/activity`: returns derived activity events in stable chronological order.
- `GET /api/investigations/:id/maintenance-runs`: returns durable maintenance runs.
- Maintenance refreshes search evidence state and creates at most one open Mission per current Gap.
- Existing evidence and discussion APIs remain compatible.

## Maintenance contract

`POST /api/investigations/:id/maintenance` is a synchronous, idempotent refresh. It preserves existing Evidence and Discussion records, re-evaluates search-derived Evidence State through `packages/agent`, reconciles the current open Mission with the current `nextGap`, and records a `MaintenanceRun`. Upstream failures are handled by the existing LIVE → CACHE → GOLDEN_FIXTURE SearchService fallback and remain visible through provenance and limitations.

`GET /api/investigations/:id/maintenance-runs` returns persisted runs after process restart. Activity is derived from the Investigation aggregate and sorted by `createdAt`, then `eventId`.

## Acceptance

A backend test can execute the full route from chat through proposal confirmation, discovery/activity, participation, and existing Evidence Intake/Re-evaluation. Existing Golden Demo and `npm run verify` remain green. Discussion remains non-evidence until Mission confirmation, and all persisted records survive repository restart.

## Non-goals

No frontend changes, ordinary social posts, ranking/recommendations, auth, multi-agent, or queue infrastructure.
