# Agent Behavior — PikPok

This document defines how any AI coding agent must behave when working on the PikPok codebase.

---

## 1. Before Writing Any Code

1. **Read `project.md` first.** It is the single source of truth for what the system must do.
2. **Read `architecture.md` second.** It describes how the system is built, where files live, and how components connect.
3. **Read `milestones.md` and `tasks.md`** to understand what phase the project is in and which tasks are assigned to whom.
4. **Read `reference-map.md` before consulting `old work/`.** It explains which historical details still matter and where current decisions supersede them.
5. **For client work, inspect the UI references linked from `architecture.md`.** They describe visual direction, not product requirements.
6. **Never start a feature that is not listed in the current milestone.** If you think something is missing, ask before implementing.

---

## 2. Technology Rules

| Rule | Detail |
|---|---|
| Language | TypeScript everywhere — frontend and backend. No plain JavaScript files. |
| Frontend | Expo + React Native + React Native Web, Expo Router for navigation. |
| Backend | Node.js (Active LTS) + Fastify. |
| Database | PostgreSQL with Prisma ORM. Migrations via `npx prisma migrate dev`. |
| Cache/Queue | Redis for per-user feed queues and recent-puzzle tracking. |
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

- **Never send puzzle solutions to the client.** The `verification` object stays on the server. The client only sees `content` and `staticHints`.
- **The difficulty engine is an independent module** behind an adapter. Do not call Glicko-2 or Thompson Sampling logic directly from route handlers.
- **QueueService is the only component that calls the difficulty adapter.** Route handlers call QueueService, never the difficulty module directly.
- **Age filtering happens at the database layer** before the difficulty engine ever sees candidates. A bug in the difficulty engine must never expose age-inappropriate content.
- **Dynamic hints are behind an integration boundary.** Show an "unavailable" placeholder until the AI integration is built. Do not stub fake AI responses.
- **Deferred neurodivergent work stays deferred.** Do not add `NEURODIVERGENT`, `ADHD_TAP_CHALLENGE`, or `sustained_attention` to active signup, audience, puzzle, domain, feed, or renderer contracts before M7 is approved.

---

## 5. Data Rules

- **3,000 live puzzle slots.** The catalog never grows beyond this. Rotation replaces content, it does not add rows.
- **Stable puzzle IDs.** When content rotates, the ID stays the same — only `contentVersion` increments.
- **Archive before replacing.** Every rotated puzzle version gets an append-only JSON snapshot in object storage before the live row is updated.
- **Expired answers are rejected.** If a user submits an answer for an old `contentVersion`, return an expired-content error — never check it against the new answer.
- **Scoring:** 10 XP for correct, 0 for incorrect or skipped. No multipliers in v1.
- **Skips are neutral for difficulty.** Record them for repeat-avoidance, but do not treat them as correct or incorrect for Glicko-2 updates.

---

## 6. Testing Rules

- **Never submit code that breaks existing tests.**
- **Every new API route must have at least one integration test** covering the success path and one error path.
- **Every new utility function must have a unit test.**
- **Use the project's test framework** (Jest or Vitest — whichever is configured).

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
- **Privacy:** Never expose audience category, authentication identity, or private answer history in public-facing responses (leaderboard, profile).

---

## 10. Documentation Authority

Use this priority order when sources disagree:

1. `project.md` — product behavior, scope, and business rules.
2. `architecture.md` — current technical design, data flow, and integration boundaries.
3. `milestones.md` and `tasks.md` — current delivery phase and assigned work.
4. `common/types/` — current shared contracts.
5. `docs/ui/` — visual references only.
6. `old work/` — historical design notes and implementation candidates.

Rules for historical material:

- Never treat `old work/` as current by default.
- A detail from `old work/` may be used only after checking it against the current documents.
- If a historical detail is still required, move the reconciled version into the current docs or code instead of depending on the old file.
- The concept mockups use the older name "ScrollMind" and show features that are out of scope, including a Library tab, sharing, and multiple-choice answers. Current product rules win.
