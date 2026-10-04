# PikPok — Tasks

> Organized by person and milestone. Check off tasks as they are completed. See `milestones.md` for full deliverable descriptions and exit criteria.

---

## Yassine (Backend & Data)

### M1 — Project Setup & Database Schema
- [ ] Initialize monorepo with npm workspaces (`apps/api`, `apps/client`, `common/`)
- [ ] Create `docker-compose.yml` with PostgreSQL 16 + Redis 7
- [ ] Scaffold Fastify server with TypeScript (`apps/api/`)
- [ ] Add health check route (`GET /health`)
- [ ] Write Prisma schema: `User`, `Puzzle`, `Attempt`, `UserStats`, `HintUsage`
- [ ] Run first Prisma migration
- [ ] Configure ESLint + Prettier for `apps/api/`
- [ ] Set up path aliases (`@routes/`, `@services/`, `@adapters/`, `@common/`)

### M2 — Authentication & User Profiles
- [ ] Choose and integrate auth approach (JWT recommended)
- [ ] Implement `POST /auth/signup` (displayName, email, password, audienceCategory)
- [ ] Implement `POST /auth/login` (returns JWT)
- [ ] Implement auth middleware (verify token, attach userId to request)
- [ ] Implement `GET /profile`
- [ ] Implement `PATCH /profile` (update displayName)
- [ ] Write integration tests for auth flow, including rejection of unsupported audience categories

### M3 — Puzzle Catalog & Feed Delivery
- [ ] Write puzzle seed script (≥ 50 puzzles per audience category)
- [ ] Implement QueueService: candidate fetch → age filter → difficulty adapter → Redis reserve
- [ ] Implement DifficultyAdapter stub (random selection respecting audience)
- [ ] Implement fallback path for difficulty outage
- [ ] Implement `GET /feed` (returns batch from Redis queue)
- [ ] Implement `POST /feed/skip` (record skip, dequeue)
- [ ] Implement recent-puzzle tracking in Redis
- [ ] Implement RotationService: archive → update → increment contentVersion
- [ ] Implement ArchiveAdapter (write JSON snapshot to local filesystem / S3)
- [ ] Implement catalogGeneration counter + queue reselection trigger
- [ ] Write integration tests: feed returns correct audience, no solutions leaked

### M4 — Answer Handling, XP, Streaks & Leaderboard
- [ ] Implement `POST /answer` (server-side validation, correct/incorrect response)
- [ ] Implement contentVersion expiry check
- [ ] Implement attempt recording with durable outbox event + eventId
- [ ] Implement XP calculation (+10 correct, 0 otherwise)
- [ ] Implement streak logic (configured timezone, calendar day)
- [ ] Implement `GET /stats`
- [ ] Implement `GET /leaderboard` (all-time XP, tie-break by userId)
- [ ] Verify leaderboard response excludes private data
- [ ] Write integration tests for answer + XP + leaderboard flow

### M5 — Difficulty Engine Integration & Hints
- [ ] Connect DifficultyAdapter to real difficulty module (replace stub)
- [ ] Implement outcome event emission via durable outbox
- [ ] Implement `GET /hints/:puzzleId` (static hints, 3 tiers)
- [ ] Implement hint usage tracking
- [ ] Implement dynamic hint placeholder ("unavailable" response)
- [ ] Write integration tests for personalized feed + fallback

### M6 — Testing, Polish & Deployment
- [ ] Verify all acceptance criteria with automated tests
- [ ] Test edge cases (expired content, Redis down, difficulty down, multi-device)
- [ ] Generate or write OpenAPI documentation for all routes
- [ ] Create Dockerfile for production deployment
- [ ] Update README with complete setup instructions

### M7 — Neurodivergent Profile (Post-v1, Deferred)
- [ ] Write the product decision covering additive profile vs accessibility layer vs another model
- [ ] Research age-safe eligibility without expanding the active audience beyond children and teens
- [ ] Define signup/profile and privacy requirements, including guardian considerations
- [ ] Complete privacy, COPPA, legal, and clinical-safety review
- [ ] Prepare separate data, API, puzzle-type, and domain contracts only after approval

---

## Mohamed (Frontend & Feed Pipeline)

### M1 — Project Setup & Database Schema
- [ ] Scaffold Expo client with Expo Router and TypeScript (`apps/client/`)
- [ ] Set up tab navigation structure (Feed, Stats, Profile, Leaderboard)
- [ ] Configure ESLint + Prettier for `apps/client/`
- [ ] Move shared types to `common/types/` and verify imports work from both apps
- [ ] Set up design system: color palette, typography, spacing constants

### M2 — Authentication & User Profiles
- [ ] Build signup screen with audience category picker (CHILDREN / TEENS)
- [ ] Build login screen
- [ ] Implement API client service with token storage
- [ ] Auto-attach auth token to all API requests
- [ ] Build profile screen (read display name, audience category; edit display name)
- [ ] Handle auth errors (expired token, unauthorized)

### M3 — Puzzle Catalog & Feed Delivery
- [ ] Build vertical swipeable feed component
- [ ] Build puzzle card renderer for NUMBER_SEQUENCE type
- [ ] Build puzzle card renderer for MISSING_OPERATOR type
- [ ] Build answer input field with submit button
- [ ] Implement batch prefetch: request new batch when local queue ≤ 2
- [ ] Build loading state and empty feed state
- [ ] Build skip/swipe handler (calls `POST /feed/skip`)
- [ ] Wire up feed to `GET /feed` API

### M4 — Answer Handling, XP, Streaks & Leaderboard
- [ ] Build answer feedback UI (correct/incorrect animation)
- [ ] Handle expired-content error (discard card, show message, continue)
- [ ] Build stats screen with data visualizations (accuracy, XP, streak chart)
- [ ] Build leaderboard screen with user's own rank highlighted
- [ ] Wire stats and leaderboard to their API endpoints

### M5 — Difficulty Engine Integration & Hints
- [ ] Build hint reveal UI (progressive: tap to show tier 1 → 2 → 3)
- [ ] Build dynamic hint placeholder ("Coming soon" state)
- [ ] Build puzzle card renderers for remaining types (SCHEDULING_ORDER, ONE_TRUE_STATEMENT, CONSTRAINED_ROUTE)

### M6 — Testing, Polish & Deployment
- [ ] Polish UI: loading states, error states, empty states, transitions, animations
- [ ] Verify responsive layout on web (desktop + mobile) and Android
- [ ] Write frontend unit tests for key components
- [ ] Perform accessibility pass (font sizes, contrast, touch targets)
- [ ] Prepare demo walkthrough

### M7 — Neurodivergent Profile (Post-v1, Deferred)
- [ ] Research accessibility needs with intended users and qualified reviewers
- [ ] Design a signup/profile concept that avoids diagnostic labeling
- [ ] Specify the ADHD tap challenge interaction, verification, scoring, and failure states
- [ ] Assess whether dyslexia and other condition-specific content should remain in scope
- [ ] Build no production renderer or navigation path before the M7 decision gates are approved

---

## Integration (Both)

### Shared Setup (Before M1)
- [ ] Agree on repository layout and branch/merge strategy
- [ ] Assign Yassine = Backend, Mohamed = Frontend
- [ ] Agree on first auth approach

### API Contract (Before M2)
- [ ] Define common error shape and authentication convention (Yassine leads, Mohamed reviews)
- [ ] Define feed batch request/response shapes (Mohamed leads, Yassine reviews)
- [ ] Define answer submission/result payloads (Yassine leads, Mohamed reviews)
- [ ] Define expired-content response code/message
- [ ] Define profile, hints, stats, and leaderboard response shapes
- [ ] Write shared OpenAPI document with exact routes, payloads, errors, timestamps

### Integration Points
- [ ] Connect frontend auth to backend auth (end of M2)
- [ ] Connect frontend feed to backend feed endpoint (end of M3)
- [ ] Connect answer submission to backend answer endpoint (end of M4)
- [ ] Connect stats and leaderboard screens to backend (end of M4)
- [ ] Connect hint UI to backend hint endpoint (end of M5)
- [ ] Full end-to-end smoke test: signup → feed → solve → XP → leaderboard (M6)

### M7 Decision Gate (Post-v1, Deferred)
- [ ] Review the M7 product, accessibility, privacy, clinical, and legal decisions together
- [ ] Confirm the active `AudienceCategory` remains `CHILDREN | TEENS` until an explicit scope change
- [ ] Keep deferred neurodivergent and ADHD contracts isolated from active imports
- [ ] Open a separate implementation milestone only after the decision gate is approved
