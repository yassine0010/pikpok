# PikPok — Architecture Overview

> **Living document.** Update this file as the codebase evolves. This is the agent's primary reference for navigating and understanding the system.

---


## Active v1 contract

The shared v1 contract is maintained in docs/contracts.md. Where older sections in this architecture or legacy project documents conflict with it, use that contract.

- The only audience categories are CHILDREN (ages 7–13) and YOUNG_ADULTS (ages 17–25). Ages 14–16 and all ages outside those ranges receive AGE_NOT_SUPPORTED; never reclassify them.
- neurodivergentMode is a private profile setting, default false. The user or an authorized guardian may set it; it is never inferred, makes no diagnostic claims, and changes app presentation only.
- Every v1 puzzle uses presentation IMAGE and locale en. The generated image is the visual puzzle display. Prompt prose and clues remain structured text beside it; accessibilityText describes the image. Retry a failed image once, then skip the card and request another. There is no app-drawn fallback.
- Interactive presentation is reserved and inactive. Backend publication rejects it; Frontend skips it.
- Verification is private and uses generic comparators keyed only by answerType. Canonical and accepted answers are strings.
- Catalog puzzle ratings and selection targets use 800–2000. Recommended Glicko initialization is 1400 / RD 350 / volatility 0.06 / tau 0.5.
- The local live image store holds only current images; the append-only archive stores every replaced image with its complete puzzle JSON. The DB points at the current live key.

## 1. Project Structure

```
pikpok/
├── apps/
│   ├── client/                    # Expo + React Native frontend
│   │   ├── app/                   # Expo Router file-based routes
│   │   │   ├── (tabs)/            # Tab navigator (feed, stats, profile, leaderboard)
│   │   │   ├── auth/              # Login / signup screens
│   │   │   └── _layout.tsx        # Root layout
│   │   ├── components/            # Reusable UI components
│   │   │   ├── puzzle/            # Image card, structured prompt text, answer and hint UI
│   │   │   ├── feed/              # Feed list, batch loader, swipe handler
│   │   │   ├── hints/             # Hint reveal UI
│   │   │   └── common/            # Buttons, inputs, modals, loading states
│   │   ├── services/              # API client, auth token management
│   │   ├── store/                 # Client state (React Context or Zustand)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── assets/                # Images, fonts, icons
│   │   ├── constants/             # Theme colors, config values
│   │   ├── app.json               # Expo config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                       # Node.js + Fastify backend
│       ├── src/
│       │   ├── routes/            # Fastify route handlers (auth, feed, answer, hints, stats, leaderboard)
│       │   ├── services/          # Business logic (QueueService, AnswerService, RotationService, etc.)
│       │   ├── adapters/          # ContentGeneration, Difficulty, and Storage integration boundaries
│       │   ├── generation/        # In-process puzzle builders and image templates/rendering
│       │   ├── difficulty/        # In-process age and difficulty module
│       │   ├── puzzles/           # Generic answer comparators keyed by answerType
│       │   ├── models/            # Prisma-generated types + custom domain models
│       │   ├── middleware/        # Auth middleware, error handler, request validation
│       │   ├── utils/             # Logger, config loader, helpers
│       │   └── server.ts          # Fastify app entry point
│       ├── prisma/
│       │   ├── schema.prisma      # Database schema
│       │   └── migrations/        # Prisma migration history
│       ├── tests/                 # Integration and unit tests
│       ├── .env.example           # Local ports, JWT secret, rotation settings
│       ├── package.json
│       └── tsconfig.json
│
├── common/                        # Shared code between frontend and backend
│   ├── types/                     # Shared TypeScript interfaces & enums
│   │   ├── puzzle.types.ts        # InternalPuzzle, PublicPuzzleCard, PuzzleType, etc.
│   │   ├── api.types.ts           # Request/response shapes and error codes
│   │   ├── user.types.ts          # AudienceCategory and private UserProfile
│   │   └── future/                # Reserved contracts; not imported by v1
│   ├── schemas/                   # Runtime JSON Schemas used by API and modules
│   ├── test-vectors/              # Shared answer and rating contract fixtures
│   ├── mocks/                     # Deterministic module and API mocks
│   └── utils/                     # Shared validation and formatting helpers
│
├── docs/                          # Project documentation
│   ├── agent.md                   # AI agent behavior rules
│   ├── project.md                 # Source of truth (requirements, business logic)
│   ├── architecture.md            # This file
│   ├── implementation-contract.md # Legacy detail; docs/contracts.md is the accepted v1 contract
│   ├── milestones.md              # Development phases
│   ├── tasks.md                   # Per-person task assignments
│   ├── reference-map.md           # Legacy-source routing and reconciliation guide
│   └── ui/                        # UI mockup images
│
├── scripts/                       # Automation (seed data, rotation job, dev helpers)
├── docker-compose.yml             # Local dev: PostgreSQL + Redis
├── .gitignore
├── README.md
└── package.json                   # Monorepo root (npm workspaces)
```

---

## 2. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXPO CLIENT                              │
│  (React Native — Web + Android)                                 │
│                                                                 │
│  Screens: Feed | Stats | Profile | Leaderboard | Auth           │
│  Components: PuzzleCard, HintPanel, AnswerInput, SwipeHandler   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST/JSON (camelCase)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FASTIFY API SERVER                           │
│                                                                 │
│  Routes:                                                        │
│    POST /auth/signup        POST /auth/login                    │
│    GET  /feed               POST /feed/skip                     │
│    POST /answer             GET  /hints/:puzzleId               │
│    GET  /stats              GET  /leaderboard                   │
│    GET  /profile            PATCH /profile                      │
│                                                                 │
│  Services:                                                      │
│    AuthService · QueueService · AnswerService                   │
│    RotationService · HintService · StatsService                 │
│    LeaderboardService                                           │
│                                                                 │
│  Adapters:                                                      │
│    DifficultyAdapter ──→ [Difficulty Module]                    │
│    ArchiveAdapter    ──→ [Local archive]                        │
│    AiHintAdapter     ──→ [AI Service] (future)                  │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐
│ PostgreSQL  │   │    Redis    │   │   Local archive         │
│             │   │             │   │                         │
│ Users       │   │ Per-user    │   │ Archived puzzle         │
│ Puzzles     │   │ feed queues │   │ version snapshots        │
│ Attempts    │   │ Recent IDs  │   │ (append-only JSON)      │
│ XP/Streaks  │   │ Leaderboard │   │ ./.local/archive/       │
│ Outbox      │   │ cache       │   │                         │
└─────────────┘   └─────────────┘   └─────────────────────────┘

         Independent Modules (behind adapters):

┌─────────────────────────────────┐   ┌────────────────────────┐
│       DIFFICULTY MODULE         │   │   PUZZLE GENERATION    │
│                                 │   │       ENGINE           │
│ Age Engine (policy filter)      │   │                        │
│ Glicko-2 (per user/domain)      │   │ Invert difficulty      │
│ Thompson Sampling (per puzzle)  │   │ formula → parameters   │
│ Cold-start calibration          │   │ LLM cosmetic skinning  │
│ Safety net / anti-churn         │   │ System 1 verification  │
│ Fallback on adapter failure     │   │ Fingerprint hashing    │
└─────────────────────────────────┘   └────────────────────────┘
```

---

## 3. Core Components

### 3.1. Frontend — Expo Client

**Description:** Cross-platform mobile-first application delivering the puzzle feed, answer submission, hint display, stats, profile, and leaderboard. Users swipe through puzzles in a continuous feed, submit short text answers, and track their progress.

**Technologies:** Expo, React Native, React Native Web, Expo Router, TypeScript

**Key Screens:**
- **Feed:** Vertical swipeable puzzle cards with answer input and hint toggle.
- **Stats:** Accuracy, XP, streak, daily completion, hint usage.
- **Profile:** Display name, private audience category (CHILDREN or YOUNG_ADULTS), neurodivergentMode setting, and account settings.
- **Leaderboard:** Global XP ranking with optional streak display.
- **Auth:** Login and signup with age validation for CHILDREN or YOUNG_ADULTS.

**UI References & Design System:**

Open these references before frontend implementation:

- [UI Design System & Screen Blueprints](<./ui/README.md>) — authoritative textual design system, color tokens, typography scales, and screen blueprints for Feed, Stats, and Auth.
- [Feed concept](<./ui/fedd ui.jpeg>) — vertical puzzle-card feed, answer entry, hint control, progress dots, and bottom navigation.
- [Stats concept](<./ui/stats.jpeg>) — progress summary, weekly trend, insight panel, and bottom navigation.
- [Color and typography palette](<./ui/colors palette.jpeg>) — master palette tokens, button styles, navigation treatment, and Plus Jakarta Sans typography.
- [Login mockup](<./ui/ScrollMind login.svg>) — brand emblem, input card, and typography styling.

These images are visual direction only. They were created before the current product rules and contain contradictions:

- The mockups use the older name "ScrollMind".
- The mockups show a Library tab, sharing, a fast-forward control, and multiple-choice answers.
- v1 requires the name "PikPok", has no Library/share/fast-forward features, and uses short typed answers.
- Stats labels and cognitive domains in the image are illustrative and do not replace the domains defined in `common/types/puzzle.types.ts`.
- Follow `docs/ui/README.md` for exact screen-by-screen blueprints reconciled with accepted v1 decisions.

**Deployment:** Local Expo dev server at `http://localhost:8081`; web and Android are tested locally. No production hosting is configured for v1.

### 3.2. Backend — Fastify API Server

**Description:** Central REST/JSON API handling all business logic: authentication, puzzle feed assembly, answer validation, hint serving, XP/streak calculation, leaderboard computation, and puzzle rotation scheduling.

**Technologies:** Node.js (Active LTS), Fastify, TypeScript, Prisma ORM

**Key Services:**

| Service | Responsibility |
|---|---|
| `AuthService` | Account creation, login, token management |
| `QueueService` | Assembles personalized feed batches via difficulty adapter; manages Redis per-user queues |
| `AnswerService` | Validates answers server-side, records attempts, emits durable outbox events |
| `RotationService` | Scheduled content rotation: archive → update → increment catalogGeneration |
| `HintService` | Serves static hints; future: delegates to AI adapter for dynamic hints |
| `StatsService` | Computes user statistics (accuracy, XP, streaks, hint usage) |
| `LeaderboardService` | Global XP leaderboard with tie-breaking by stable user ID |

**Deployment:** Local Node.js process at `http://localhost:3000`.

**API conventions:** Successful responses return the resource or result directly. Errors use `{ "error": { "code", "message", "details"? } }`. All timestamps are ISO 8601 UTC strings.

Accepted v1 route payloads, schemas, verification rules, and storage behavior are defined in [contracts.md](./contracts.md). The older implementation-contract.md remains a migration reference where it differs. Update contracts.md and this architecture together when an implementation boundary changes.

### 3.3. Adapters (Integration Boundaries)

| Adapter | Connects To | Purpose |
|---|---|---|
| `DifficultyAdapter` | In-process difficulty module | Sends candidate puzzle metadata; receives filtered/ranked IDs. Falls back to a non-personalized batch on adapter failure |
| `PuzzleStorageAdapter` | Local image storage | Keeps the current image in live storage and appends each replaced image plus puzzle JSON to the archive |
| `AiHintAdapter` | AI Hint Service (future) | Will generate contextual dynamic hints. Currently returns "unavailable" |

### 3.4. Puzzle Catalog Lifecycle and Rotation

The live catalog keeps exactly 3,000 stable puzzle IDs. Rotation replaces a published package for an existing ID; it does not add a row.

Each v1 package has presentation IMAGE and locale en. contentVersion versions the complete package, including prompt text, visual image, accessibilityText, hints, and private verification. Any change to those fields or the rendered image increments contentVersion.

Rotation sequence:

1. A background RotationService requests certified puzzle JSON from Content Generation.
2. Content Generation validates the private verification and uniqueness, then renders a deterministic PNG from visualData only.
3. Backend validates the puzzle schema, audience and age bounds, difficulty rating, answerType, image checksum, and accessibilityText. Publication accepts only presentation IMAGE.
4. Backend appends the replaced full private puzzle JSON and image to the local archive:
   - ./.local/images/archive/{puzzleId}/v{contentVersion}/puzzle.json
   - ./.local/images/archive/{puzzleId}/v{contentVersion}/image.png
5. Backend writes the new image at ./.local/images/live/{puzzleId}/v{newContentVersion}.png using a create-exclusive operation.
6. Backend commits the new puzzle data and current image key in the DB. Only after the commit does it remove the prior live image.
7. After every five successful rotations, increment catalogGeneration and reselect undelivered queued IDs for users whose queue generation is stale.

Live holds only the current image for each puzzle. Archive is append-only, stores every replaced image with its corresponding complete puzzle JSON, and is not served to the client. The DB points to the current live image. Never overwrite a version path.

If generation, rendering, checksum validation, archive writing, or the DB commit fails, retain the old current DB pointer and image. Make retries idempotent. Do not delete a valid archive record.

Answers submitted for a non-current contentVersion return PUZZLE_CONTENT_EXPIRED and are never checked against a newer puzzle version.

### 3.5. Answer Verification, XP, and Durable Events

Answer ownership stays in the backend:

1. Load the current puzzle by stable ID.
2. Compare the submitted `contentVersion` with the live version.
3. Reject stale content before running any verifier.
4. Select a generic comparator from a registry keyed only by the private verification.answerType. Do not dispatch answer checks by puzzle type.
5. Persist the accepted attempt and any XP, streak, or user-stat changes in one database transaction whenever possible.
6. Persist a durable outbox event in the same transaction using the interaction ID as the stable `eventId`.
7. After commit, the outbox worker sends the event to the Difficulty Module and retries with the same `eventId` until acknowledged.

Verification and scoring rules:

- The canonical `verification` object never leaves the server.
- Correct answer: award 10 XP.
- Incorrect answer: award 0 XP and do not reveal the solution in v1.
- Skip: persist the interaction, award 0 XP, and keep it neutral for Glicko-2.
- A skip may be used for repeat avoidance, but it must not update skill rating or success/failure evidence.
- A stale or rejected submission must not update XP, streak, statistics, or difficulty state.

### 3.6. Difficulty Selection Boundary

QueueService is the only component allowed to call `DifficultyAdapter`.

The adapter receives candidate metadata from the catalog, never puzzle text, solutions, or hints:

- `userId`
- `audienceCategory`
- `batchSize`
- candidate `puzzleId`, `contentVersion`, `difficultyRating`, `domain`, and `audienceCategories`
- recent puzzle IDs and recent verified outcomes
- `catalogGeneration`

The adapter returns:

- `selectionId`
- `userId`
- ordered `orderedPuzzleIds`
- optional generation or expiry metadata

For v1, the difficulty engine is a TypeScript module under `apps/api/src/difficulty`; QueueService calls it through `DifficultyAdapter`. The adapter remains the extraction boundary if this work becomes a separate service later.

Catalog puzzle difficultyRating and selection targets are limited to 800–2000. Recommended Glicko defaults are initial rating 1400, RD 350, volatility 0.06, and tau 0.5. Raw Glicko state may be unbounded; clamp the selection target to the catalog range.

The difficulty module owns and persists:

- Glicko-2 state per user and domain in the `UserRating` PostgreSQL table: rating, rating deviation, and volatility
- Thompson Sampling statistics keyed by `puzzleId` plus `contentVersion` in the `PuzzleSelectionStats` PostgreSQL table
- cold-start priors and calibration state
- target difficulty, exploration, safety limits, and domain-diversity rules

Age and audience eligibility are filtered before candidates reach the Difficulty Module. If the adapter fails, QueueService records the fallback and serves current, eligible puzzles while avoiding recent IDs where possible.

### 3.7 Puzzle Generation Input

Seed and replacement content use a versioned JSON array of `GeneratedPuzzle` objects. The ingestion command validates every item, computes its structural fingerprint, rejects duplicates, and upserts by stable puzzle ID. M3 may use a smaller validated fixture; M6 requires the full 3,000-slot catalog.

`fingerprintHash` is SHA-256 over canonical JSON of normalized structural fields. Cosmetic theme, character names, and wording are excluded so reskinning a puzzle does not bypass duplicate detection.

---

## 4. Data Stores

### 4.1. PostgreSQL (Primary Database)

**Type:** Relational (PostgreSQL) via Prisma ORM

**Purpose:** All durable application data.

**Key Tables:**
- `User` — id, displayName, email, passwordHash, audienceCategory, createdAt
- `Puzzle` — id (stable), contentVersion, type, domain, difficultyRating, ageFloor, ageCeiling, audienceCategories, content (JSONB), verification (JSONB), staticHints (JSONB), fingerprintHash, createdAt, updatedAt
- `Attempt` — id, userId, puzzleId, contentVersion, submittedAnswer, isCorrect, isSkip, eventId, createdAt
- `UserStats` — userId, totalXp, currentStreak, longestStreak, totalAttempts, correctAttempts, lastActiveDate
- `HintUsage` — id, userId, puzzleId, hintTier, usedAt
- `OutboxEvent` — eventId (unique), aggregateType, aggregateId, eventType, payload (JSONB), status, attemptCount, availableAt, processedAt, lastError, createdAt
- `CatalogState` — singleton id, catalogGeneration, pendingRotationCount, updatedAt
- `UserRating` — userId, domain, rating, ratingDeviation, volatility, updatedAt; unique on `(userId, domain)`
- `PuzzleSelectionStats` — puzzleId, contentVersion, alpha, beta, impressions, updatedAt; unique on `(puzzleId, contentVersion)`

### 4.2. Redis (Cache & Queue)

**Type:** In-memory key-value store

**Purpose:** Fast per-user feed operations and caching.

**Key Structures:**
- `queue:{userId}:ready` - Ordered puzzle IDs waiting to be delivered.
- `queue:{userId}:processing:{requestId}` - IDs temporarily reserved for an in-flight response. This prevents two devices from consuming the same puzzle.
- `queue:{userId}:meta` - Queue generation, last-seen catalog generation, and last refill time.
- `recent:{userId}` - The most recent delivered IDs for repeat avoidance, limited to `RECENT_PUZZLE_WINDOW` (default `100`).
- `leaderboard:global` - Optional derived leaderboard cache.

Queue operations must be atomic. A feed request uses one Redis Lua script to move IDs from `ready` to a request-specific `processing` list, loads the live puzzle records, and deletes the processing list after success. On a recoverable failure, reserved IDs return to `ready`. Abandoned processing lists expire after `QUEUE_RESERVATION_TTL_SECONDS` (default `600`).

### 4.3. Local Image Stores

The prototype uses two durable local folders:

- Live current images: ./.local/images/live/{puzzleId}/v{contentVersion}.png
- Append-only replaced versions: ./.local/images/archive/{puzzleId}/v{contentVersion}/image.png and puzzle.json

Each live image path includes puzzle ID and contentVersion and is never overwritten. The DB stores the current live key. Archive records include the replaced image and its complete private puzzle JSON. Staging output is temporary and is not a third durable store.

A future cloud adapter can retain these logical keys, copy and checksum-verify objects, switch DB pointers, and serve live images through an authorized media endpoint or CDN. Archive objects must remain immutable.

## 5. External Integrations / APIs

| Service | Purpose | Integration Method | Status |
|---|---|---|---|
| Difficulty Module | Personalized puzzle selection (Glicko-2 + Thompson Sampling) | In-process TypeScript module called through `DifficultyAdapter` | Selected for v1 |
| Puzzle Generation Engine | Produces certified puzzle content for the 3,000-slot catalog | Scheduled job ingests generated JSON | Independent workstream |
| AI Hint Service | Dynamic contextual hints | REST API via `AiHintAdapter` | Future — placeholder in v1 |
| Auth | Email/password account management | Fastify routes + `@fastify/jwt` | Selected; no external provider in v1 |

---

## 6. Deployment & Infrastructure

**Deployment Target:** Local workstation only. v1 has no cloud provider or production deployment target.

**Local Development Stack:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: pikpok
      POSTGRES_USER: pikpok
      POSTGRES_PASSWORD: pikpok
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

**Local Endpoints:**
- API: `http://localhost:3000`
- Expo web/dev server: `http://localhost:8081`

**CI/CD Pipeline:** None in v1.

**Monitoring & Logging:** Fastify/Pino console logs only. No external observability service.

---

## 7. Security Considerations

**Authentication:** Email/password with bcrypt hashing and a 7-day JWT access token issued by `@fastify/jwt`. The API accepts `Authorization: Bearer <token>`. OAuth, refresh tokens, and external identity providers are not included in v1.

**Authorization:** Role-based — users can only access their own data. No admin role in v1.

**Data Protection:**
- Puzzle `verification` objects (canonical answers) never leave the server.
- Audience category, auth identity, and answer history are private — excluded from all public API responses.
- Age filtering is enforced at the PostgreSQL query level, not in application code.

**Compliance:**
- COPPA considerations for users under 13.
- No medical or diagnostic claims. PikPok is not a diagnostic or treatment tool, including for any deferred cognitive-profile feature.

---

## Current checkout and main-codebase integration

This architecture describes the target layout. The current checkout has planning documents and shared legacy types, but it does not yet have the root package manifest, apps/api, apps/client, or a database schema. The runnable setup steps below apply after the repository scaffold described in docs/milestones.md M1 has been merged.

Use common/ as the single shared contract workspace for runtime schemas, TypeScript exports, answer vectors, and mocks. Merge in dependency order: workspace scaffold; common schemas and vectors; adapters and mocks; Content Generation; Difficulty Module; Backend services and routes; Frontend; then local end-to-end wiring. Keep module internals behind adapters so teams can merge against mocks without waiting for one another. The detailed PR sequence, scenarios, error behavior, and recovery plan are in docs/contracts.md and docs/teams/.

## 8. Development & Testing Environment

**Local Setup:**
1. Clone the repository.
2. Run `npm install` at the repository root.
3. Run `docker compose up -d` (starts PostgreSQL 16 + Redis 7).
4. Run `npm run db:migrate` and `npm run rotate` from the repository root when needed.
5. Run `npm run dev --workspace apps/api` and `npm run start --workspace apps/client`.

Local `.env` defaults include `API_PORT=3000`, `APP_TIME_ZONE=UTC`, `JWT_EXPIRES_IN=7d`, `ROTATION_ENABLED=true`, `ROTATION_INTERVAL_MINUTES=60`, `RECENT_PUZZLE_WINDOW=100`, and `QUEUE_RESERVATION_TTL_SECONDS=600`.

**Testing Frameworks:**
- Backend: Vitest for unit + integration tests
- Frontend: Jest + React Native Testing Library
- E2E: Playwright for web. Android is manually verified in v1.

**Code Quality:**
- ESLint + Prettier (TypeScript config)
- Prisma format for schema files
- Strict TypeScript (`strict: true`)
- Local required checks: `npm run lint`, `npm run typecheck`, and `npm test`

---

## 9. Future Considerations / Roadmap

- **AI Dynamic Hints:** Connect AiHintAdapter to an LLM service for contextual, personalized hints.
- **iOS Build:** Expo supports iOS — add when ready.
- **Admin Dashboard:** Manage puzzle catalog, view analytics, monitor rotation health.
- **Event-Driven Architecture:** Replace durable outbox with a proper message queue (Kafka/NATS) for difficulty module events at scale.
- **Microservice Extraction:** Split QueueService, RotationService, and DifficultyAdapter into independent services if needed.

### Active v1: neurodivergentMode

The neurodivergentMode profile flag is a private app setting, not an audience category or puzzle-selection signal.

- Default to false; set only by the user or an authorized guardian, never infer it.
- Apply larger hint text and answer box, reduced motion, calmer styling, and no timers.
- Do not change puzzle eligibility, types, feed ranking, or recommendation.
- Do not make diagnostic or treatment claims.
- Keep the flag out of feed cards, public profiles, leaderboard output, analytics payloads, and other users' responses.
- Complete privacy and guardian-authorization review before enabling a guardian control flow for minors.

## Deferred: interactive puzzles

Interactive presentation is reserved in the contract but is not active in v1. Do not publish or serve interactive puzzle cards. Backend publication rejects the value; Frontend skips it.

When this work is approved later, the architecture will need:

- An approved product scope, audience and age eligibility, accessibility, privacy, and safety review.
- Puzzle-specific interaction requirements and a content/configuration contract.
- Client controls, event capture, submission, resume, timeout, and failure behavior.
- Server-side verification and scoring rules, plus an outcome contract for the Difficulty Module.
- Content Generation certification, hints, accessibility behavior, versioning, telemetry, mocks, and contract vectors.
- API, storage, migration, and end-to-end test updates.

ADHD tap tasks, syllable ordering, and spelling correction are examples of deferred work only. This section does not define their configuration or answer schemas.

---

## 10. Project Identification

**Project Name:** PikPok

**Repository URL:** Not configured; this is a local workspace only.

**Teams:** Software Team (Backend and Frontend), Content Generation, Difficulty Module

**Date of Last Update:** 2026-10-04

---

## 11. Glossary / Acronyms

| Term | Definition |
|---|---|
| `AudienceCategory` | Active v1 age category: CHILDREN (7–13) or YOUNG_ADULTS (17–25) — determines content eligibility |
| `catalogGeneration` | Counter incremented every 5 successful puzzle rotations — triggers feed queue reselection |
| `contentVersion` | Integer version of a puzzle's content within its stable ID — increments on rotation |
| `DomainCategory` | Active v1 cognitive skill domain: `math`, `logic`, `spatial`, `pattern`, or `deduction` |
| `Presentation` | `IMAGE` is active; `INTERACTIVE` is reserved and deferred |
| `PuzzleType` | Active v1 puzzle type: `NUMBER_SEQUENCE`, `MISSING_OPERATOR`, `SCHEDULING_ORDER`, `ONE_TRUE_STATEMENT`, or `CONSTRAINED_ROUTE` |
| `Glicko-2` | Rating system tracking user skill as a triple: rating, rating deviation, volatility |
| `Thompson Sampling` | Exploration/exploitation algorithm for selecting which puzzle to serve next |
| `QueueService` | The only backend component that calls the difficulty adapter |
| `System 1` | The deterministic puzzle verification layer — recomputes answers, verifies uniqueness, computes fingerprints |
| `Stable ID` | A puzzle's permanent identifier — content rotates but the ID never changes |
| `XP` | Experience points — 10 per correct answer, 0 otherwise |
| `COPPA` | Children's Online Privacy Protection Act — US law for users under 13 |
