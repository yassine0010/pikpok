# PikPok — Architecture Overview

> **Living document.** Update this file as the codebase evolves. This is the agent's primary reference for navigating and understanding the system.

---

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
│   │   │   ├── puzzle/            # Puzzle card renderers (per puzzle type)
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
│       │   ├── adapters/          # Integration boundaries (DifficultyAdapter, ArchiveAdapter, future AiHintAdapter)
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
│   │   ├── puzzle.types.ts        # GeneratedPuzzle, PuzzleType, DomainCategory, etc.
│   │   ├── future/                # Isolated post-v1 contracts
│   │   │   └── neurodivergent.types.ts  # Deferred M7 neurodivergent/ADHD contracts
│   │   ├── api.types.ts           # Request/response shapes, error codes
│   │   └── user.types.ts          # AudienceCategory, UserProfile, etc.
│   └── utils/                     # Shared utility functions (validation, formatting)
│
├── docs/                          # Project documentation
│   ├── agent.md                   # AI agent behavior rules
│   ├── project.md                 # Source of truth (requirements, business logic)
│   ├── architecture.md            # This file
│   ├── implementation-contract.md # Exact routes, schema, transactions, and adapters
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
- **Profile:** Display name, active audience category (`CHILDREN` or `TEENS`, private), settings.
- **Leaderboard:** Global XP ranking with optional streak display.
- **Auth:** Login and signup with active audience category selection (`CHILDREN` or `TEENS`).

**UI References:**

Open these references before frontend implementation:

- [Feed concept](<./ui/fedd ui.jpeg>) - vertical puzzle-card feed, answer entry, hint control, progress dots, and bottom navigation.
- [Stats concept](<./ui/stats.jpeg>) - progress summary, weekly trend, insight panel, and bottom navigation.
- [Color and typography palette](<./ui/colors palette.jpeg>) - candidate colors, button styles, navigation treatment, and Plus Jakarta Sans typography.

These images are visual direction only. They were created before the current product rules and contain contradictions:

- The mockups use the older name "ScrollMind".
- The mockups show a Library tab, sharing, a fast-forward control, and multiple-choice answers.
- v1 requires the name "PikPok", has no Library/share/fast-forward features, and uses short typed answers.
- Stats labels and cognitive domains in the image are illustrative and do not replace the domains defined in `common/types/puzzle.types.ts`.

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

Exact route payloads, Prisma models, Redis scripts, adapter interfaces, verification rules, and transaction behavior are defined in [implementation-contract.md](./implementation-contract.md). Update that contract and this architecture together whenever an implementation boundary changes.

### 3.3. Adapters (Integration Boundaries)

| Adapter | Connects To | Purpose |
|---|---|---|
| `DifficultyAdapter` | In-process difficulty module | Sends candidate puzzle metadata; receives filtered/ranked IDs. Falls back to a non-personalized batch on adapter failure |
| `ArchiveAdapter` | Local filesystem archive | Writes append-only JSON snapshots to `./.local/archive/puzzles/{puzzleId}/v{contentVersion}.json` |
| `AiHintAdapter` | AI Hint Service (future) | Will generate contextual dynamic hints. Currently returns "unavailable" |

### 3.4. Puzzle Catalog Lifecycle and Rotation

The live catalog is a fixed set of exactly **3,000 puzzle rows**. Rotation changes the content of an existing row; it never inserts a 3,001st row or deletes a stable puzzle ID.

The following catalog identity and eligibility metadata remain stable across rotation:

- `Puzzle.id`
- `Puzzle.domain`
- `Puzzle.difficultyRating`
- `Puzzle.audienceCategories`
- Age eligibility fields such as `ageFloor` and `ageCeiling`

The following content fields are replaced:

- `content`
- `verification`
- `staticHints`
- `difficultyMetadata` when the replacement explicitly changes structural parameters without changing the stable difficulty rating

Rotation sequence:

1. The scheduled `RotationService` requests one certified replacement from the Puzzle Generation Engine.
2. The replacement is validated before it can touch the live catalog.
3. The selected stable puzzle ID is loaded with its current `contentVersion`.
4. The current live version is written to the archive as an immutable JSON snapshot:
   `./.local/archive/puzzles/{puzzleId}/v{contentVersion}.json`
5. The live row is updated in one database transaction:
   - replace `content`, `verification`, and `staticHints`
   - preserve `id`, `domain`, `difficultyRating`, and audience eligibility
   - increment `contentVersion`
   - update the rotation timestamp
   - increment the pending successful-rotation count
6. After five successful rotations, increment `catalogGeneration` and reset the pending count. The threshold remains configurable.
7. If the database update fails after the archive write, retain the archive snapshot and retry the rotation idempotently. Never delete a valid archive snapshot.

`CatalogState` is the durable singleton row that stores `catalogGeneration` and the pending successful-rotation count. The scheduler runs in the API process at `ROTATION_INTERVAL_MINUTES` (default `60`) when `ROTATION_ENABLED=true`. `npm run rotate` performs one rotation through the same service for testing.

Content-version behavior:

- A feed response includes both `puzzleId` and `contentVersion`.
- An answer is verified only when the submitted `contentVersion` matches the current live version.
- A mismatched answer returns `PUZZLE_CONTENT_EXPIRED`; the server does not check the old answer against the new solution and does not award XP or update difficulty.
- The archive is for history and auditing, not for live answer verification.

Catalog-generation behavior:

- A single rotation does not immediately rewrite every user queue.
- After five rotations, `catalogGeneration` changes.
- On the next batch request, QueueService compares the queue's saved generation with the durable catalog generation.
- When stale, QueueService discards and reselects only IDs still waiting in the ready queue.
- IDs reserved in request-specific processing lists remain unchanged so an in-flight response stays consistent.
- Cards already returned to a client remain unchanged and are still protected by `contentVersion` checks.
- The live catalog remains at exactly 3,000 rows after every refresh.

### 3.5. Answer Verification, XP, and Durable Events

Answer ownership stays in the backend:

1. Load the current puzzle by stable ID.
2. Compare the submitted `contentVersion` with the live version.
3. Reject stale content before running any verifier.
4. Select the puzzle-type verifier from a verifier registry. Route handlers and service code must not use one large type-specific conditional block.
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

User ratings and puzzle `difficultyRating` values use a Glicko-compatible scale centered at `1500`, with valid puzzle ratings from `400` through `2800`. Exact tuning formulas and priors remain post-prototype work.

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

### 4.3. Local Archive

**Type:** Local filesystem behind `ArchiveAdapter`

**Purpose:** Immutable archive of every rotated puzzle content version.

**Key Structure:**
- Path: `./.local/archive/puzzles/{puzzleId}/v{contentVersion}.json`
- Content: Full puzzle JSON snapshot (content + verification + metadata)
- Access: Backend and maintainers only. Keep snapshots for the life of the local v1 workspace; there is no pruning job. This directory is gitignored and is not a production backup.

---

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

### Deferred Post-v1: M7 Neurodivergent Profile

This work is not part of v1 and must not affect active audience values, puzzle types, domains, signup, generation, or feed rendering before the M7 decision gates are approved.

- Decide whether neurodivergent support is an additive profile, a general accessibility layer, or another model.
- Keep active eligibility compatible with `CHILDREN` and `TEENS`.
- Define the ADHD tap challenge interaction, verification, scoring, and safety requirements.
- Assess dyslexia and other condition-specific puzzle content, including whether a verified linguist-reviewed lexicon is required.
- Complete accessibility research, privacy/COPPA review, legal review, and clinical-safety review.

---

## 10. Project Identification

**Project Name:** PikPok

**Repository URL:** Not configured; this is a local workspace only.

**Primary Team:** Yassine (Backend & Data), Mohamed (Frontend & Feed)

**Date of Last Update:** 2026-10-04

---

## 11. Glossary / Acronyms

| Term | Definition |
|---|---|
| `AudienceCategory` | Active v1 age category: `CHILDREN` or `TEENS` — determines content eligibility. Neurodivergent profiles are deferred to M7 |
| `catalogGeneration` | Counter incremented every 5 successful puzzle rotations — triggers feed queue reselection |
| `contentVersion` | Integer version of a puzzle's content within its stable ID — increments on rotation |
| `DomainCategory` | Active v1 cognitive skill domain: `math`, `logic`, `spatial`, `pattern`, or `deduction` |
| `PuzzleType` | Active v1 puzzle type: `NUMBER_SEQUENCE`, `MISSING_OPERATOR`, `SCHEDULING_ORDER`, `ONE_TRUE_STATEMENT`, or `CONSTRAINED_ROUTE`. `ADHD_TAP_CHALLENGE` is deferred to M7 |
| `Glicko-2` | Rating system tracking user skill as a triple: rating, rating deviation, volatility |
| `Thompson Sampling` | Exploration/exploitation algorithm for selecting which puzzle to serve next |
| `QueueService` | The only backend component that calls the difficulty adapter |
| `System 1` | The deterministic puzzle verification layer — recomputes answers, verifies uniqueness, computes fingerprints |
| `Stable ID` | A puzzle's permanent identifier — content rotates but the ID never changes |
| `XP` | Experience points — 10 per correct answer, 0 otherwise |
| `COPPA` | Children's Online Privacy Protection Act — US law for users under 13 |
