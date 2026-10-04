# PikPok — Milestones

> Each milestone is a shippable increment. Complete one before starting the next. Tasks within a milestone can run in parallel between Yassine and Mohamed.
>
> Implementation-level contracts referenced by these milestones are defined in `implementation-contract.md`.

---

## M1 — Project Setup & Database Schema

**Goal:** Repository scaffolded, local dev environment running, database schema defined.

**Deliverables:**
- [ ] Monorepo initialized (npm workspaces: `apps/client`, `apps/api`, `common/`)
- [ ] Docker Compose running PostgreSQL 16 + Redis 7
- [ ] Expo client bootstrapped with Expo Router and TypeScript
- [ ] Fastify server bootstrapped with TypeScript and basic health check route
- [ ] Prisma schema defined: `User`, `Puzzle`, `Attempt`, `UserStats`, `HintUsage`, `OutboxEvent`, `CatalogState`, `UserRating`, `PuzzleSelectionStats`
- [ ] First Prisma migration applied successfully
- [ ] Shared types moved to `common/types/` and importable from both apps
- [ ] ESLint + Prettier configured for both apps
- [ ] Root npm scripts configured for local dev, migrations, seeding, rotation, lint, typecheck, and tests
- [ ] `.env.example` created with local ports, JWT, rotation, queue, and time-zone defaults
- [ ] `.gitignore`, `README.md`, and `docs/` committed
- [ ] Git repository initialized with agreed branch strategy

**Exit Criteria:** Both developers can clone, run `npm install` and `docker compose up -d`, run migrations, and start both the API and the Expo client locally.

---

## M2 — Authentication & User Profiles

**Goal:** Users can sign up, log in, select an audience category, and see their profile.

**Deliverables:**
- [ ] Email/password authentication integrated with bcrypt and 7-day `@fastify/jwt` access tokens
- [ ] `POST /auth/signup` — creates account with display name + audience category
- [ ] `POST /auth/login` — returns token
- [ ] Auth middleware protecting all routes except signup/login
- [ ] `GET /profile` — returns user profile (display name, category, join date)
- [ ] `PATCH /profile` — update display name
- [ ] Client: signup screen with audience category picker (`CHILDREN` / `TEENS`)
- [ ] Client: login screen
- [ ] Client: profile screen (read-only + edit display name)
- [ ] Client: token storage and auto-attach to API requests
- [ ] Integration test: signup → login → access protected route

**Exit Criteria:** A user can sign up as "CHILDREN", log in, and see their profile. Unauthenticated requests are rejected.

---

## M3 — Puzzle Catalog & Feed Delivery

**Goal:** Puzzles exist in the database. Users receive a personalized (or fallback) feed of puzzles suited to their audience category.

**Deliverables:**
- [ ] Puzzle seed script to insert sample puzzles (at least 50 per audience category)
- [ ] `GET /feed` — returns a batch of puzzles (default 5) from the user's Redis queue
- [ ] QueueService: fetches candidates from catalog → filters by audience → calls DifficultyAdapter → reserves in Redis
- [ ] DifficultyAdapter stub: returns candidates in random order (real Glicko-2 integration in M5)
- [ ] Fallback path: if the difficulty adapter fails, serve a non-personalized batch respecting audience eligibility
- [ ] Recent-puzzle tracking in Redis to avoid repeats
- [ ] Feed refill: client requests new batch when local queue ≤ 2
- [ ] `POST /feed/skip` — records skip, removes puzzle from queue
- [ ] Client: vertical swipeable feed of puzzle cards
- [ ] Client: puzzle card renderer for at least 2 puzzle types (NUMBER_SEQUENCE and MISSING_OPERATOR)
- [ ] Client: answer input field with submit button
- [ ] Client: batch prefetch and loading states
- [ ] Content rotation infrastructure:
  - [ ] RotationService: archive old version → update live row → increment contentVersion
  - [ ] ArchiveAdapter: write JSON snapshot to `./.local/archive/puzzles/{puzzleId}/v{contentVersion}.json`
  - [ ] catalogGeneration counter in `CatalogState`: increment every 5 rotations, trigger queue reselection
  - [ ] Scheduler config: `ROTATION_ENABLED=true`, `ROTATION_INTERVAL_MINUTES=60`, plus `npm run rotate`
- [ ] Integration test: signup → get feed → verify audience filtering → verify no solutions in response

**Exit Criteria:** A logged-in CHILDREN user sees only children-appropriate puzzles in a swipeable feed. Puzzle solutions are absent from API responses.

---

## M4 — Answer Handling, XP, Streaks & Leaderboard

**Goal:** Users can submit answers, earn XP, build streaks, and see the global leaderboard.

**Deliverables:**
- [ ] `POST /answer` — validates answer server-side, returns correct/incorrect
- [ ] Version check: reject answers for expired contentVersion with clear error
- [ ] Attempt recording with durable outbox event (eventId for idempotency)
- [ ] XP calculation: +10 for correct, 0 for incorrect/skip
- [ ] Streak logic: increment on first correct answer of a new calendar day (configured timezone)
- [ ] `GET /stats` — returns accuracy, XP, current/longest streak, total attempts, hint usage
- [ ] `GET /leaderboard` — global, all-time, ordered by XP (ties by stable user ID)
- [ ] Leaderboard response: display name, XP, rank, optional streak — **no** audience category or auth identity
- [ ] Client: answer feedback (correct/incorrect animation)
- [ ] Client: stats screen with visualizations
- [ ] Client: leaderboard screen with user's own rank highlighted
- [ ] Integration test: submit correct answer → verify XP increase → verify leaderboard update
- [ ] Integration test: submit answer for expired contentVersion → verify rejection

**Exit Criteria:** Full solve loop works: user opens feed → answers puzzle → sees result → XP updates → leaderboard reflects new score.

---

## M5 — Difficulty Engine Integration & Static Hints

**Goal:** The feed is truly personalized via Glicko-2 and Thompson Sampling. Static hints are available per puzzle.

**Deliverables:**
- [ ] DifficultyAdapter connected to the in-process TypeScript difficulty module (replaces M3 stub)
- [ ] Glicko-2 rating updates persisted in `UserRating` after each answer (per user, per domain)
- [ ] Thompson Sampling persisted in `PuzzleSelectionStats` (exploration vs exploitation)
- [ ] Cold-start calibration: new users start with age-band median ratings
- [ ] Age Engine hard filter at database query level (age_floor/age_ceiling)
- [ ] Safety net / anti-churn rules in difficulty selection
- [ ] Outcome events: AnswerService emits events to difficulty module via durable outbox
- [ ] `GET /hints/:puzzleId` — returns static hints (3 tiers: guiding question → strategic clue → step walkthrough)
- [ ] Hint usage tracking in database
- [ ] Dynamic hint placeholder: returns "unavailable" with explanatory message
- [ ] Client: hint reveal UI (progressive — tap to reveal next tier)
- [ ] Integration test: verify personalized feed differs from random feed
- [ ] Integration test: verify difficulty fallback on adapter failure

**Exit Criteria:** Two users with different skill levels and audience categories receive meaningfully different puzzle feeds. Hints work.

---

## M6 — Testing, Polish & Local Demo

**Goal:** The local prototype is tested, polished, reproducible, and demo-ready.

**Deliverables:**
- [ ] All acceptance criteria from `project.md` verified with automated tests
- [ ] Edge cases tested: expired content, Redis unavailable, difficulty adapter failure, multi-device access
- [ ] API documentation: OpenAPI spec generated or manually written for all routes
- [ ] Client polish: loading states, error states, empty states, animations
- [ ] Responsive layout verified on web and Android
- [ ] Performance check: feed batch delivery < 500ms
- [ ] Security review: verify solutions never leak, private data never in public responses
- [ ] README updated with full setup instructions
- [ ] Full validated 3,000-puzzle seed loaded and verified against the fixed live-catalog rule
- [ ] Fresh local setup verified from README using Docker Compose, migrations, and seed data
- [ ] Demo-ready: walkthrough of signup → feed → solve → stats → leaderboard
- [ ] Confirm no production hosting, cloud deployment, or CI/CD work was added to v1

**Exit Criteria:** The app can be demonstrated end-to-end on a local workstation. All automated tests pass. A new developer can clone, set up, and run the project using only the README.

---

## M7 — Neurodivergent Profile (Post-v1, Deferred)

**Status:** Not part of v1 delivery. Do not start until M6 ships and the M7 decision gates are approved.

**Goal:** Decide whether and how PikPok should support neurodivergent users, then prepare a separately approved implementation phase.

**Deliverables:**
- [ ] Product decision: additive profile, accessibility layer, or another model
- [ ] Audience and age-policy decision that remains compatible with the active `CHILDREN` and `TEENS` categories
- [ ] Signup/profile experience concept that avoids diagnostic labeling
- [ ] Neurodivergent accessibility research with intended users and qualified reviewers
- [ ] ADHD tap challenge content, verification, scoring, and safety specification
- [ ] Dyslexia and other condition-specific content assessment, if still in scope
- [ ] Privacy, COPPA, legal, and clinical-safety review
- [ ] Updated data, API, puzzle-type, domain, and renderer contracts
- [ ] A separate implementation milestone created only after these decisions are approved

**Exit Criteria:** The product and safety decisions are documented and approved. No deferred type or audience value is enabled in production before a new implementation milestone is explicitly opened.
