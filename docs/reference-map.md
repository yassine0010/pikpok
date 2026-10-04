# PikPok - Legacy Reference Map

This document routes agents through the historical material in `old work/`. It is not a product or architecture source.

`project.md` and `architecture.md` always win when there is a conflict. `old work/` may contain useful implementation detail, but it must be reconciled before it is copied or applied.

---

## How to Use a Legacy Source

1. Read `project.md`, `architecture.md`, `milestones.md`, and `tasks.md` first.
2. Find the relevant source and detail in the table below.
3. Compare the old detail with the current contract.
4. If the detail is still valid, move the reconciled version into the current docs or code.
5. Update this map and the current document together.

Do not add new rules, routes, fields, or behavior only because they exist in `old work/`.

---

## Source Map

| Legacy source | Status | Current home | Useful historical detail |
|---|---|---|---|
| [project-overview.md](<../old work/project-overview.md>) | Superseded | `project.md` | Plain-language summary only. No unique implementation contract. |
| [technical-architecture.md](<../old work/technical-architecture.md>) | Partially consolidated | `architecture.md` | Detailed queue algorithm, data model, user flows, logical API payloads, failure behavior, and module contracts. |
| [technical-stack-and-implementation.md](<../old work/technical-stack-and-implementation.md>) | Partially consolidated | `architecture.md` | Candidate Prisma schema, Redis reservation mechanics, adapter interfaces, verifier registry, answer transaction, idempotency, testing, and local setup. |
| [Age_Difficulty_Generation_Engines_MASTER_Recap.md](<../old work/difficulty module/Age_Difficulty_Generation_Engines_MASTER_Recap.md>) | Partially consolidated | `project.md`, `architecture.md` | Glicko-2, Thompson Sampling, cold-start calibration, safety limits, age policy, neurodivergent profile behavior, and generation-engine inversion flow. |
| [PUZZLE_GENERATION_GUIDELINES_AND_SCHEMA.md](<../old work/puzzle generation/PUZZLE_GENERATION_GUIDELINES_AND_SCHEMA.md>) | Partially consolidated | `common/types/puzzle.types.ts` | Verification schemas, System 1 checks, structural fingerprints, LLM guardrails, and delivery checklist. |
| [puzzle-types-and-generation-guide.md](<../old work/puzzle generation/puzzle-types-and-generation-guide.md>) | Reference only | `common/types/puzzle.types.ts`, `common/types/future/neurodivergent.types.ts` | Product-level guidance for the five active puzzle types, the deferred ADHD type, and validating unique answers. |
| [types.ts](<../old work/puzzle generation/types.ts>) | Duplicate | `common/types/puzzle.types.ts`, `common/types/future/neurodivergent.types.ts` | Use the current shared files. Compare before assuming the copies are identical. |
| [open-decisions.md](<../old work/tasks/open-decisions.md>) | Partially consolidated | `project.md` | Historical decision register. Some rows are resolved and some remain open. |
| [development-checklist-two-teammates.md](<../old work/tasks/development-checklist-two-teammates.md>) | Superseded | `milestones.md`, `tasks.md` | Older task breakdown only. Do not use it as the active delivery plan. |
| [development-checklist-interactive.html](<../old work/tasks/development-checklist-interactive.html>) | Stale duplicate | `milestones.md`, `tasks.md` | Interactive presentation of the older checklist. |

---

## Details Already Moved Into Current Docs

- Fixed 3,000-row puzzle catalog.
- Stable puzzle IDs and incrementing `contentVersion`.
- Archive-before-update rotation sequence.
- `catalogGeneration` increment after five successful rotations.
- Lazy refresh of only undelivered queue IDs when a user's generation is stale.
- Stale-answer rejection using `PUZZLE_CONTENT_EXPIRED`.
- QueueService as the only caller of the Difficulty Adapter.
- Audience eligibility before difficulty selection.
- Difficulty fallback behavior when the module is unavailable.
- Server-side answer validation, XP rules, and durable outbox behavior.
- Redis ready, processing, metadata, and recent-ID key responsibilities.
- UI reference locations and mockup limitations.

---

## Details Still Requiring Deliberate Migration

These areas exist mainly or only in `old work/`. They are candidates for implementation, not current decisions:

- Final Prisma schema and migration design.
- Exact Redis command or Lua-script implementation for atomic reservation and recovery.
- Exact difficulty-adapter TypeScript interfaces and error codes.
- Verifier registry interfaces and per-type answer normalization.
- Attempt, XP, streak, and outbox transaction implementation.
- Detailed logical API payloads and OpenAPI schemas.
- Puzzle generation validation pipeline, fingerprint algorithm, and LLM constraints.
- Seed-file format and initial 3,000-puzzle ingestion process.
- Authentication provider selection and implementation.

When one of these becomes part of an active milestone, promote the reconciled design into `architecture.md` or the relevant code.

---

## Known Conflicts and Open Gaps

### Neurodivergent audience modeling

This is deliberately deferred to M7, not an M1 blocker. Active v1 uses `CHILDREN | TEENS`; the legacy additive-profile model must not be added to schema, signup, feed, or generated puzzle contracts before the M7 product and safety decision gates are approved. The isolated future contract is `common/types/future/neurodivergent.types.ts`.

### Difficulty outcome scoring

Some historical notes describe a 0.0 to 1.0 outcome score with hint weighting. The current rules use correct or incorrect only, award no XP changes for hints, and keep skips neutral for Glicko-2. Do not implement the old scoring model without a new product decision.

### UI concepts

The mockups use "ScrollMind", show a Library tab, sharing, fast-forward, and multiple-choice answers. These conflict with the current PikPok product scope. Use the images for layout and visual direction only.

### Suggested database schema

The old Prisma model is illustrative. It contains fields such as a single `attempts` table and simplified XP/streak state that have not been reconciled with the current acceptance criteria. Treat it as a design input when M1 begins.

---

## Promotion Rule

A legacy detail becomes current only when both conditions are true:

1. It has been reconciled against `project.md` and `architecture.md`.
2. Its durable description has been added to a current document or implemented with tests.
