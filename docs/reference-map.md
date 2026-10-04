# PikPok - Legacy Reference Map

This document routes agents through the historical material in `old work/`. It is not a product or architecture source.

`project.md`, `architecture.md`, and `implementation-contract.md` always win when there is a conflict. All remaining useful legacy implementation details have been reconciled into the current contract, so `old work/` is now history only.

---

## How to Use a Legacy Source

1. Read `project.md`, `architecture.md`, `implementation-contract.md`, `milestones.md`, and `tasks.md` first.
2. Find the relevant source and detail in the table below.
3. Compare the old detail with the current implementation contract.
4. Use the old file only for historical context, not as an implementation source.
5. If a historical detail seems to add new behavior, raise it as a product or architecture decision before implementing it.

Do not add new rules, routes, fields, or behavior only because they exist in `old work/`.

---

## Source Map

| Legacy source | Status | Current home | Useful historical detail |
|---|---|---|---|
| [project-overview.md](<../old work/project-overview.md>) | Superseded | `project.md` | Plain-language summary only. No unique implementation contract. |
| [technical-architecture.md](<../old work/technical-architecture.md>) | Consolidated | `implementation-contract.md` | Historical queue design, logical payloads, failure behavior, and module contracts. |
| [technical-stack-and-implementation.md](<../old work/technical-stack-and-implementation.md>) | Consolidated | `implementation-contract.md` | Historical Prisma schema, Redis mechanics, adapter interfaces, verifier registry, answer transaction, idempotency, testing, and local setup. |
| [Age_Difficulty_Generation_Engines_MASTER_Recap.md](<../old work/difficulty module/Age_Difficulty_Generation_Engines_MASTER_Recap.md>) | Consolidated with exclusions | `project.md`, `architecture.md`, `implementation-contract.md` | Historical Glicko-2 and generation-engine design. Neurodivergent behavior remains deferred to M7. |
| [PUZZLE_GENERATION_GUIDELINES_AND_SCHEMA.md](<../old work/puzzle generation/PUZZLE_GENERATION_GUIDELINES_AND_SCHEMA.md>) | Consolidated | `common/types/puzzle.types.ts`, `implementation-contract.md` | Verification schemas, System 1 checks, structural fingerprints, LLM guardrails, and catalog distribution. |
| [puzzle-types-and-generation-guide.md](<../old work/puzzle generation/puzzle-types-and-generation-guide.md>) | Reference only | `common/types/puzzle.types.ts`, `common/types/future/neurodivergent.types.ts` | Product-level guidance for the five active puzzle types, the deferred ADHD type, and validating unique answers. |
| [types.ts](<../old work/puzzle generation/types.ts>) | Duplicate | `common/types/puzzle.types.ts`, `common/types/future/neurodivergent.types.ts` | Use the current shared files. Compare before assuming the copies are identical. |
| [open-decisions.md](<../old work/tasks/open-decisions.md>) | Superseded | `project.md`, `architecture.md` | Historical decision register. Active v1 choices are now recorded in the current docs. |
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
- Difficulty fallback behavior when the adapter fails.
- Server-side answer validation, XP rules, and durable outbox behavior.
- Redis ready, processing, metadata, and recent-ID key responsibilities.
- UI reference locations and mockup limitations.
- Local-only deployment, Docker Compose services, and local endpoints.
- Email/password bcrypt authentication with 7-day JWT access tokens.
- Local filesystem archive behind `ArchiveAdapter`.
- In-process difficulty module with PostgreSQL-backed rating and selection state.
- Configurable 60-minute rotation and manual `npm run rotate`.
- Shared Glicko-compatible rating scale centered at 1500.
- Default recent-puzzle window of 100 and queue-reservation TTL of 600 seconds.
- UTC default application time zone and indefinite local archive retention.
- Versioned JSON seed format and SHA-256 structural fingerprint rules.

---

## Reconciled Legacy Details

The former deliberate-migration list is now resolved in `implementation-contract.md`:

| Detail | Current location |
|---|---|
| Final Prisma schema and migration design | Sections 2.1 and 2.2 |
| Redis Lua reservation script and recovery tests | Sections 3.2 through 3.4 |
| Difficulty-adapter interfaces and error codes | Section 4 |
| Verifier registry, normalization, and per-type rules | Section 5 |
| Attempt, XP, streak, hint, and outbox transaction | Section 6 |
| API payloads and OpenAPI-compatible schemas | Section 1 |
| Puzzle validation, fingerprints, LLM constraints, and 3,000-puzzle ingestion | Section 7 |
| Authentication routes, middleware, and token handling | Section 8 |
| Required implementation tests | Section 9 |

There are no active implementation areas left only in `old work/`.

---

## Resolved Historical Conflicts

### Neurodivergent audience modeling

Deferred to M7. Active v1 uses `CHILDREN | TEENS`; the future contract remains isolated in `common/types/future/neurodivergent.types.ts`. No legacy profile or condition-specific value may enter active schema, signup, feed, generation, or renderer contracts.

### Difficulty outcome scoring

Resolved. v1 uses `correct | incorrect | skipped`; skips are neutral and there is no `outcomeScore` or hint-weighted score.

### UI concepts

Resolved. Use the images for layout and visual direction only. Ignore "ScrollMind", Library, sharing, fast-forward, and multiple-choice elements.

### Suggested database schema

Resolved. The current Prisma-shaped model is in `implementation-contract.md` section 2 with the active tables and migration rules.

### Deployment assumptions

Resolved. v1 runs locally with Docker Compose for PostgreSQL and Redis, local JSON archive files, and no CI/CD pipeline.

---

## Promotion Rule

A legacy detail becomes current only when both conditions are true:

1. It has been reconciled against `project.md` and `architecture.md`.
2. Its durable description has been added to `implementation-contract.md`, another current document, or code with tests.
