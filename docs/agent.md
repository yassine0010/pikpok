# Agent Behavior — PikPok

This document defines how any AI coding agent must behave when working on the PikPok codebase.

---

## 1. Before Writing Any Code

1. **Read `contracts.md` first for accepted v1 decisions.** `project.md` is product background and may retain superseded assumptions until reconciled.
2. **Read `architecture.md` second.** It describes how the system is built, where files live, and how components connect.
3. **Read `implementation-contract.md` as a legacy migration reference.** If it conflicts with contracts.md, follow contracts.md and record the needed reconciliation.
4. **Read `milestones.md` and `tasks.md`** to understand what phase the project is in and which tasks are assigned to whom.
5. **Read `reference-map.md` before consulting `old work/`.** It explains which historical details still matter and where current decisions supersede them.
6. **For client work, inspect the UI references linked from `architecture.md`.** They describe visual direction, not product requirements.
7. **Never start a feature that is not listed in the current milestone.** If you think something is missing, ask before implementing.

---

## 2. Technology Rules

| Rule | Detail |
|---|---|
| Language | TypeScript everywhere — frontend and backend. No plain JavaScript files. |
| Frontend | Expo + React Native + React Native Web, Expo Router for navigation. |
| Backend | Node.js (Active LTS) + Fastify. |
| Database | PostgreSQL with Prisma ORM. Migrations via `npx prisma migrate dev`. |
| Cache/Queue | Redis 7 on local Docker for per-user feed queues and recent-puzzle tracking. |
| Archive | Local append-only image and puzzle JSON files under `./.local/images/archive/`; current images under `./.local/images/live/`. |
| Deployment | Local workstation only. Do not add cloud or production infrastructure in v1. |
| API style | REST/JSON, `camelCase` field names, OpenAPI-compatible schemas. |
| Shared types | Active shared request/response types live in `common/types/`. Post-v1 contracts live under `common/types/future/` and must not be imported by active v1 code. Never duplicate type definitions. |
| Package manager | Use `npm`. Pin exact versions in lockfiles. |

---

## 3. Coding Standards

- **File naming:** `kebab-case.ts` for files, `PascalCase` for components, `camelCase` for variables/functions.
- **No `any` type.** Use `unknown` and narrow, or define a proper interface.
- **Every public function must have a JSDoc comment** explaining what it does, its parameters, and return value.
- **No console.log in production code.** Use the project's logger (Fastify's built-in `request.log` on the backend).
- **Error handling:** Never swallow errors silently. Every `catch` must either re-throw, log, or return a meaningful error response.
- **Imports:** Use path aliases (`@api/`, `@common/`, `@services/`) instead of deep relative paths (`../../../`).

---

## 4. Architecture Rules

- **Never send puzzle solutions to the client.** The `verification` object stays on the server. The client receives only the public image card fields, structured prompt text, accessibilityText, answer input, and separate hints.
- **The difficulty engine is an independent in-process module** behind an adapter. Do not call Glicko-2 or Thompson Sampling logic directly from route handlers.
- **QueueService is the only component that calls the difficulty adapter.** Route handlers call QueueService, never the difficulty module directly.
- **Age filtering happens at the database layer** before the difficulty engine ever sees candidates. A bug in the difficulty engine must never expose age-inappropriate content.
- **Dynamic hints are behind an integration boundary.** Show an "unavailable" placeholder until the AI integration is built. Do not stub fake AI responses.
- **neurodivergentMode is a private v1 app setting only.** Default false; user or authorized guardian sets it; never infer it or use it for puzzle selection. Do not make diagnostic claims. Interactive puzzle configuration and types remain deferred; keep INTERACTIVE reserved and reject it in v1.

---

## 5. Data Rules

- **3,000 live puzzle slots.** The catalog never grows beyond this. Rotation replaces content, it does not add rows.
- **Stable puzzle IDs.** When content rotates, the ID stays the same — only `contentVersion` increments.
- **Archive before replacing.** Archive each replaced image and its complete puzzle JSON append-only under `./.local/images/archive/` before switching the database pointer; current images are versioned under `./.local/images/live/`.
- **Expired answers are rejected.** If a user submits an answer for an old `contentVersion`, return an expired-content error — never check it against the new answer.
- **Scoring:** 10 XP for correct, 0 for incorrect or skipped. No multipliers in v1.
- **Skips are neutral for difficulty.** Record them for repeat-avoidance, but do not treat them as correct or incorrect for Glicko-2 updates.
- **Use the accepted rating scale.** Catalog puzzle ratings and selection targets are 800–2000; recommended Glicko initialization is rating 1400, RD 350, volatility 0.06, tau 0.5.
- **Keep local defaults configurable.** Use `RECENT_PUZZLE_WINDOW=100`, `QUEUE_RESERVATION_TTL_SECONDS=600`, and `APP_TIME_ZONE=UTC` unless a later decision changes them.

---

## 6. Testing Rules

- **Never submit code that breaks existing tests.**
- **Every new API route must have at least one integration test** covering the success path and one error path.
- **Every new utility function must have a unit test.**
- **Use the configured test framework:** Vitest for the API, Jest + React Native Testing Library for the client, and Playwright for web E2E.

---

## 7. Git & Collaboration

- **Branch naming:** `feature/<milestone>-<short-description>` (e.g., `feature/m2-auth-jwt`).
- **Commit messages:** `<type>(<scope>): <description>` (e.g., `feat(auth): add JWT token generation`).
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- **Never force-push to `main`.**
- **Do not modify another teammate's files without discussion**, unless it's a shared contract in `common/`.

---

## 8. When In Doubt

- **Ask, don't guess.** If a requirement is ambiguous, ask the user before implementing.
- **Prefer simplicity.** This is a prototype. Do not over-engineer.
- **Follow existing patterns.** If there's already a way something is done in the codebase, follow that pattern unless there's a documented reason to change it.

---

## 9. Non-Negotiable Product Rules

- **No medical or diagnostic claims.** PikPok is not a diagnostic or treatment tool. This applies to all code comments, UI copy, API responses, and documentation, including any future cognitive-profile feature.
- **Privacy:** Never expose audience category, neurodivergentMode, authentication identity, or private answer history in public-facing responses. Only the authenticated account's private profile response may contain neurodivergentMode.

---

## 10. Documentation Authority

Use this priority order when sources disagree:

1. " + tick + "contracts.md" + tick + " — accepted v1 decisions and shared schemas.
2. " + tick + "architecture.md" + tick + " — current technical design, data flow, and integration boundaries.
3. " + tick + "project.md" + tick + " — product background; older assumptions may be superseded by " + tick + "contracts.md" + tick + ".
4. " + tick + "implementation-contract.md" + tick + " — legacy implementation reference until reconciled with " + tick + "contracts.md" + tick + ".
5. " + tick + "milestones.md" + tick + " and " + tick + "tasks.md" + tick + " — delivery phase and work tracking.
6. " + tick + "common/types/" + tick + " — shared types to migrate to the accepted contract.
7. " + tick + "docs/ui/" + tick + " — visual references only.
8. " + tick + "old work/" + tick + " — historical design notes only.

Rules for historical material:

- Never treat " + tick + "old work/" + tick + " as current by default.
- A detail from " + tick + "old work/" + tick + " may be used only after checking it against the current documents.
- If a historical detail is still required, move the reconciled version into the current docs or code instead of depending on the old file.
- The concept mockups use the older product name ScrollMind and show features that are out of scope, including a Library tab, sharing, and multiple-choice answers. Current accepted contracts win.
