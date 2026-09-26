# PikPok — Technology Recommendations and Technical Implementation

## 1. Purpose

This document complements [technical-architecture.md](technical-architecture.md).

The architecture document explains the logical components and their connections. This document proposes concrete technologies and describes how to implement the prototype.

The recommendations are optimized for:

- A mobile-first experience.
- A website that can later be packaged as an Android application.
- A small prototype with a simple implementation.
- One central backend.
- Batch puzzle delivery.
- A separate queue for each user.
- Flexible puzzle content.
- Redis for fast queue operations.
- An independent difficulty module.
- AI modules whose internals remain outside this document.

The exact dependency versions and hosting providers should be selected when development starts and then pinned in lockfiles.

## 2. Recommended stack

| Layer | Recommendation | Reason | Status |
|---|---|---|---|
| Client | Expo + React Native + React Native Web | One TypeScript client can target Android and web. | Recommended |
| Navigation | Expo Router | Shared file-based navigation for native and web. | Recommended |
| Client language | TypeScript | Shared contracts and safer state handling. | Recommended |
| Backend runtime | Node.js Active LTS or Maintenance LTS | Matches the team’s Node.js direction. | Recommended |
| Backend framework | Fastify | Lightweight typed HTTP API with schema support. | Recommended |
| API style | REST/JSON | Simple to debug and sufficient for the prototype. | Recommended |
| API contract | OpenAPI-compatible schemas | Documents and validates client/backend payloads. | Recommended |
| Persistent database | PostgreSQL | Relational data plus flexible JSONB puzzle content. | Recommended |
| Database access | Prisma ORM | TypeScript schema, migrations, relations, and JSON support. | Recommended |
| Queue/cache | Redis | Fast per-user lists and recent-puzzle tracking. | Required |
| Authentication | Simple account flow; provider TBD | Keeps the prototype understandable. | Open decision |
| Difficulty integration | Backend adapter to an independent module/service | Keeps Glicko and selection logic separate. | Required boundary |
| Puzzle archive | Separate append-only dataset or object-storage-backed archive | Preserves every puzzle snapshot without expanding the 3,000-record live catalog. | Required boundary; provider TBD |
| Dynamic hints | Backend adapter to an AI boundary | Allows AI work to be added later. | Intentionally blank |
| Local development | Docker Compose or equivalent | Reproducible database and Redis setup. | Recommended |

Expo documents first-class web support through React Native Web, and its Android build workflow supports Android artifacts. Expo Router is designed for React Native and web applications. This makes the stack suitable for PikPok’s web-plus-Android goal. ([Expo web](https://docs.expo.dev/workflow/web/), [Expo Router](https://docs.expo.dev/router/introduction/), [Expo Android builds](https://docs.expo.dev/build-reference/android-builds/))

## 3. Recommended system shape

~~~text
Expo client
    ↓ REST/JSON
Fastify API running on Node.js
    ├── Authentication and profile
    ├── Feed and batch coordinator
    ├── Per-user queue manager
    ├── Puzzle catalog
    ├── Answer verification and attempts
    ├── Static/dynamic hint coordinator
    └── XP, streak, statistics, and leaderboard

PostgreSQL
    ├── Users and profiles
    ├── Puzzle records and flexible puzzle content
    ├── Attempts and hint usage
    ├── XP and streak records
    └── Leaderboard source data

Puzzle archive dataset
    └── Immutable snapshots for every puzzle content version

Redis
    ├── Per-user puzzle queues
    ├── Recently shown puzzle IDs
    └── Optional leaderboard cache

Independent integrations
    ├── Difficulty module / Glicko-2 + Thompson Sampling selection
    └── AI modules / dynamic hints
~~~

Use one central backend with clear internal modules. Do not create a separate microservice for every feature during the prototype. The difficulty module and AI modules can be independent behind adapters, while the feed, attempts, gamification, and storage operations remain in one backend.

## 4. Client recommendation

### 4.1 Expo, React Native, and React Native Web

Use:

- Expo.
- React Native.
- React Native Web.
- TypeScript.
- Expo Router.

This gives the team one client project that can run in a browser and can later produce an Android build. Expo Router provides file-based routing and shared navigation across Android, iOS, and web. ([Expo universal apps](https://docs.expo.dev/tutorial/introduction/), [Expo Router introduction](https://docs.expo.dev/router/introduction/))

The main trade-off is that some browser-specific or native-specific libraries may require platform-specific code. Keep the first UI close to cross-platform React Native primitives and avoid libraries that support only one target.

### 4.2 Client screens

~~~text
Feed
Stats
Leaderboard
Profile
~~~

The current scope does not include:

- Library screen.
- Social sharing.
- Fast-forward button.

Suggested route structure:

~~~text
src/app/
├── _layout.tsx
├── (auth)/
│   ├── sign-in.tsx
│   ├── create-account.tsx
│   └── audience.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── feed.tsx
    ├── stats.tsx
    ├── leaderboard.tsx
    └── profile.tsx
~~~

Expo Router has a tabs layout suitable for the four bottom-navigation sections. ([Expo Router tabs](https://docs.expo.dev/router/advanced/tabs/))

### 4.3 Client folder structure

~~~text
apps/client/
├── src/
│   ├── app/                     # Routes and screen composition
│   ├── components/              # Reusable visual components
│   ├── features/
│   │   ├── auth/
│   │   ├── feed/
│   │   ├── attempts/
│   │   ├── hints/
│   │   ├── stats/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth-storage.ts
│   │   └── errors.ts
│   ├── state/
│   │   ├── session-store.ts
│   │   └── feed-store.ts
│   ├── types/
│   │   └── api.ts
│   └── theme/
│       ├── colors.ts
│       └── spacing.ts
└── app.json
~~~

Keep route components thin. Feed behavior, API requests, answer submission, and queue-related client state should live in feature modules rather than directly in screen files.

### 4.4 Feed state

The client needs three kinds of state:

~~~text
Visible UI state
    current card
    selected answer
    result feedback
    hint panel
    loading/error state

Local batch state
    ordered puzzle cards
    current index
    consumed IDs
    remaining count
    next-batch request status

Server state
    authenticated user
    XP and streak
    statistics
    leaderboard data
~~~

Recommended initial configuration:

~~~text
batch size:       5 puzzles
refill threshold: 2 remaining puzzles
~~~

These are configuration values, not permanent product rules.

### 4.5 Feed behavior

~~~text
Open feed
    ↓
Request initial batch
    ↓
Render first puzzle
    ↓
User answers or swipes
    ↓
When remaining cards <= refill threshold:
    request another batch in the background
    append it to the local feed
~~~

The client should not request one puzzle per swipe. It should request batches and use background prefetching to keep the next puzzle ready.

### 4.6 Client feed pseudocode

~~~ts
type FeedState = {
  cards: PuzzleCard[];
  currentIndex: number;
  isLoading: boolean;
  isLoadingNextBatch: boolean;
  error?: string;
};

async function loadInitialFeed() {
  setState({ isLoading: true });

  const response = await api.getFeedBatch({ batchSize: 5 });

  setState({
    cards: response.puzzles,
    currentIndex: 0,
    isLoading: false,
  });
}

async function onCardChanged(nextIndex: number) {
  setState({ currentIndex: nextIndex });

  const remaining = state.cards.length - nextIndex - 1;

  if (remaining <= 2 && !state.isLoadingNextBatch) {
    await prefetchNextBatch();
  }
}

async function prefetchNextBatch() {
  setState({ isLoadingNextBatch: true });

  try {
    const response = await api.getFeedBatch({ batchSize: 5 });

    setState({
      cards: [...state.cards, ...response.puzzles],
      isLoadingNextBatch: false,
    });
  } catch {
    setState({ isLoadingNextBatch: false });
  }
}
~~~

### 4.7 Client answer behavior

~~~text
User selects an answer
    ↓
Client creates an attempt ID and records local timing
    ↓
Client submits puzzle ID, version, answer, and timing
    ↓
Client shows a submitting state
    ↓
Backend verifies the answer
    ↓
Client receives correct or incorrect
    ↓
Client displays the result
    ↓
User swipes to the next card
~~~

The client must not decide correctness or award XP. It can show a loading state, but the backend result is authoritative.

### 4.8 Scrolling mechanism

The feed should behave as a vertical, full-screen, one-puzzle-per-page experience:

~~~text
The user sees puzzle N
    ↓ swipe upward
Puzzle N leaves the viewport
    ↓
Puzzle N+1 snaps into the viewport
    ↓
Client marks N+1 as the active card
    ↓
Client records N as skipped only if N had no submitted answer
    ↓
Client prefetches another batch when the local buffer is low
~~~

The scroll gesture itself is a client interaction. The backend is responsible for recording its consequences:

- If the user submitted an answer, the answer attempt already exists.
- If the user swipes without submitting, the client sends one skipped interaction.
- Swiping after an answer must not create a second skip for the same puzzle.
- A retry of the same answer or skip must use the same attempt/interaction identifier.

#### Recommended client implementation

For the first Expo implementation:

- Render one full-height puzzle card per list item.
- Use vertical paging or snap behavior.
- Keep the active card index in local feed state.
- Use stable puzzle IDs as list keys.
- Render only a small window of cards around the active card.
- Keep the current batch in memory.
- Use a platform-specific scroll configuration only when web and native behavior differ.

The first implementation should prefer the built-in list and paging capabilities of the selected client stack. A specialized feed library is not necessary until performance testing shows that the basic list is insufficient.

Suggested conceptual settings:

~~~text
one card = one viewport
vertical direction
paging/snap enabled
scroll indicator hidden
stable item key = puzzle ID + version
initial rendered items = small number
prefetch when remaining local cards <= 2
~~~

#### Scroll state machine

~~~mermaid
stateDiagram-v2
    [*] --> Ready
    Ready --> Solving: card becomes visible
    Solving --> HintShown: user requests static hint
    HintShown --> Solving: hint displayed
    Solving --> Submitting: user submits answer
    Submitting --> Correct: backend returns correct
    Submitting --> Incorrect: backend returns incorrect
    Solving --> Skipped: user swipes without answer
    Correct --> Leaving: user swipes
    Incorrect --> Leaving: user swipes
    Skipped --> Leaving: next card snaps in
    Leaving --> Solving: next card becomes visible
    Leaving --> Prefetching: local queue reaches threshold
    Prefetching --> Solving: next batch appended
    Prefetching --> Solving: already-loaded cards remain usable
~~~

Dynamic hints should be represented as an optional state from Solving. Their internal behavior is intentionally blank:

~~~text
Solving → DynamicHintLoading → DynamicHintShown
                         ↘ DynamicHintUnavailable
~~~

#### Scroll and batch flow

~~~mermaid
flowchart TD
    A[Client opens feed] --> B[Request batch]
    B --> C[Backend checks user Redis queue]
    C -->|enough IDs| D[Load puzzle records]
    C -->|queue is low| E[Request ordered IDs from difficulty module]
    E --> F[Append IDs to user queue]
    F --> D
    D --> G[Return batch without protected solutions]
    G --> H[Render one full-screen card]
    H --> I{User action}
    I -->|Submit answer| J[Backend verifies and records attempt]
    I -->|Swipe without answer| K[Backend records skip]
    J --> L[Show correct or incorrect]
    K --> M[Show next card]
    L --> M
    M --> N{Remaining local cards <= threshold?}
    N -->|No| H
    N -->|Yes| B
~~~

#### Swipe event sequence

~~~mermaid
sequenceDiagram
    participant U as User
    participant C as Client feed
    participant A as Backend API
    participant Q as User queue
    participant G as Difficulty module
    participant D as Database

    U->>C: Swipe to next card
    C->>C: Check whether current card has an answer

    alt Card was answered
        C->>C: Move to next card without skip event
    else Card was not answered
        C->>A: Record skip with interaction ID
        A->>D: Persist skipped attempt
        A->>G: Send verified skip outcome
        A-->>C: Skip accepted
        C->>C: Move to next card
    end

    C->>C: Check remaining local cards
    opt Local buffer is low
        C->>A: Request next batch
        A->>Q: Read or refill user queue
        Q->>G: Request IDs if needed
        G-->>Q: Return ordered IDs
        Q-->>A: Return reserved IDs
        A->>D: Load puzzle records
        A-->>C: Append next batch
    end
~~~

#### Avoiding duplicate skip events

Each local card should have a small client state:

~~~text
not_seen
active
answered
skip_pending
skipped
~~~

When the user swipes away:

1. If the state is answered, do nothing.
2. If the state is not_seen or active, create one skip interaction.
3. Change the state to skip_pending.
4. Retry the same interaction ID if the network fails.
5. Mark it skipped after the backend confirms it.

For a small online-first prototype, the client may allow the next card to appear immediately while the skip request is sent in the background. The backend must still make the request idempotent.

#### Scroll failure behavior

If the next batch request fails:

- Keep already-loaded cards usable.
- Do not erase the local feed.
- Display a small retry state when the user reaches the end.
- Retry the batch request.
- Do not create duplicate queue reservations on a retry.

If there are no local cards left, show a loading/retry state rather than an empty permanent feed.

## 5. Backend recommendation

### 5.1 Node.js

Use Node.js with TypeScript. Select an Active LTS or Maintenance LTS release and avoid End-of-Life releases. The Node.js project explicitly recommends Active LTS or Maintenance LTS for production applications. ([Node.js releases](https://nodejs.org/en/about/previous-releases), [Node.js EOL](https://nodejs.org/en/about/eol))

Pin the selected version using the team’s preferred version-management method and the package manager lockfile.

### 5.2 Fastify

Fastify is the recommended backend framework.

Reasons:

- Lightweight for a small central API.
- Good TypeScript support.
- Plugin-based organization.
- Request and response schema support.
- Straightforward local server.
- Suitable for REST/JSON.

Fastify’s official documentation includes TypeScript support and type providers for schema-driven request typing. ([Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/), [Fastify type providers](https://fastify.dev/docs/latest/Reference/Type-Providers/))

### 5.3 Backend alternatives

| Option | Choose it when | Trade-off |
|---|---|---|
| Fastify | The team wants a compact typed API. | The team must define its own module conventions. |
| NestJS | The team strongly prefers an opinionated enterprise structure. | More concepts and framework structure for a small prototype. |
| Express | The team already has strong Express experience. | More manual decisions for schemas and organization. |
| Serverless functions | Deployment simplicity is more important than a stable queue coordinator. | Queue reservations and long-running coordination become less direct. |

Fastify remains the recommended choice unless the team already has a strong preference.

### 5.4 Backend folder structure

~~~text
apps/api/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── feed/
│   │   ├── queue/
│   │   ├── puzzles/
│   │   ├── attempts/
│   │   ├── hints/
│   │   ├── gamification/
│   │   └── integrations/
│   │       ├── difficulty.client.ts
│   │       ├── difficulty.types.ts
│   │       ├── ai.client.ts
│   │       └── ai.types.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── redis/
│   │   └── logging/
│   └── shared/
│       ├── errors/
│       ├── idempotency/
│       └── pagination/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── unit/
    ├── integration/
    └── contract/
~~~

Route handlers should call services. They should not contain database queries, Redis scripts, answer verification, or XP calculations directly.

## 6. API recommendation

### 6.1 REST/JSON

Use REST/JSON for the prototype because it is:

- Easy to inspect from a browser or command line.
- Simple for the client.
- A natural fit for feed, attempts, stats, and profile.
- Easy to document with OpenAPI.
- Less complex than GraphQL for the current screen count.

### 6.2 Suggested operations

~~~text
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/logout
GET    /v1/me
PATCH  /v1/me

GET    /v1/feed/batch?size=5

POST   /v1/attempts
POST   /v1/puzzles/:puzzleId/skip
POST   /v1/puzzles/:puzzleId/hints/static
POST   /v1/puzzles/:puzzleId/hints/dynamic

GET    /v1/me/stats
GET    /v1/me/streak
GET    /v1/daily-puzzle
GET    /v1/leaderboard?scope=global
~~~

These route names are recommendations, not a required API convention.

### 6.3 Feed request responsibilities

GET /v1/feed/batch should:

1. Validate authentication.
2. Check the user’s Redis queue.
3. Ask the difficulty adapter for IDs if the queue is below the threshold.
4. Reserve the next IDs safely.
5. Load puzzle records from PostgreSQL.
6. Remove missing records and load the latest content version.
7. Return puzzle cards without protected solutions.

### 6.4 Attempt request responsibilities

POST /v1/attempts should:

1. Validate the request body.
2. Check the authenticated user.
3. Check the puzzle ID and version.
4. Load the canonical verification data.
5. Verify the answer on the backend.
6. Record the attempt.
7. Award XP in the same database transaction if correct.
8. Update streak/statistics if needed.
9. Notify the difficulty module after commit.
10. Return correct or incorrect.

### 6.5 Hint request responsibilities

Static hint:

1. Validate user and puzzle.
2. Load the stored static hint.
3. Record usage.
4. Return the hint.

Dynamic hint:

1. Validate user and puzzle.
2. Record the request.
3. Call the blank AI adapter.
4. Record success or failure metadata.
5. Return the result or an unavailable state.

## 7. Database recommendation

### 7.1 PostgreSQL plus JSONB

Use PostgreSQL for the prototype.

Keep frequently queried values in normal columns:

- User ID.
- Puzzle ID.
- Content version.
- Rotation timestamp.
- Puzzle type when finalized.
- Audience categories when finalized.
- Created/updated timestamps.
- Attempt result.
- User XP.
- Streak dates.

Keep variable puzzle-specific content in JSONB:

- Question layout.
- Answer controls.
- Options.
- Grid data.
- Image references.
- Puzzle-specific configuration.

PostgreSQL supports JSON and JSONB, and Prisma maps its Json field to PostgreSQL jsonb by default. ([PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html), [Prisma PostgreSQL connector](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql))

### 7.2 Why not two databases initially

A separate NoSQL database for puzzles plus SQL for user traffic is possible, but it adds:

- Two connections to operate.
- Two backup strategies.
- Two migration processes.
- Cross-database consistency problems.
- More complicated local development.
- More complicated integration tests.

For exactly 3,000 current puzzle records and a small prototype, one PostgreSQL database with JSONB is simpler for live traffic. The required puzzle archive is a separate append-only history dataset, not a second live puzzle database or feed source.

### 7.3 Prisma

Prisma is a reasonable database access layer because it provides:

- A schema file.
- Migrations.
- Relations.
- A generated TypeScript client.
- PostgreSQL JSON/JSONB mapping.

Do not put every field inside JSONB. Keep fields needed for filtering, sorting, and joins as regular columns. Prisma documents that deep JSON filtering has limitations, which reinforces this separation. ([Prisma JSON fields](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types/working-with-json-fields))

### 7.4 Suggested schema

This is an implementation starting point. Puzzle-specific content remains flexible.

~~~prisma
enum AttemptResult {
  CORRECT
  INCORRECT
  SKIPPED
}

enum AudienceCategory {
  CHILDREN
  TEENS
  ADHD
}

enum HintType {
  STATIC
  DYNAMIC
}

model User {
  id            String        @id @default(uuid())
  audienceCategory AudienceCategory
  displayName   String?
  authSubject   String        @unique
  totalXp       Int           @default(0)
  currentStreak Int           @default(0)
  longestStreak Int           @default(0)
  lastDailyDate DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  attempts      Attempt[]
  xpEvents      XpEvent[]
  hintRequests  HintRequest[]
}

model Puzzle {
  id             String       @id
  contentVersion Int          @default(1)
  type           String?
  domain         String?
  difficulty     Json?
  audienceCategories AudienceCategory[] @default([])
  content        Json
  verification   Json
  staticHints    Json?
  updatedAt      DateTime     @updatedAt
  nextRotationAt DateTime?
  attempts       Attempt[]

  @@index([type])
  @@index([domain])
  @@index([nextRotationAt])
  @@index([updatedAt])
}

model Attempt {
  id               String        @id
  userId           String
  puzzleId         String
  contentVersionAtAttempt Int
  result           AttemptResult
  submittedAnswer  Json?
  elapsedTimeMs    Int?
  staticHintsUsed  Int           @default(0)
  dynamicHintsUsed Int           @default(0)
  xpAwarded        Int           @default(0)
  createdAt        DateTime      @default(now())
  user             User          @relation(fields: [userId], references: [id])
  puzzle           Puzzle        @relation(fields: [puzzleId], references: [id])

  @@unique([id])
  @@index([userId, createdAt])
  @@index([userId, puzzleId])
  @@index([puzzleId, createdAt])
}

model HintRequest {
  id        String   @id @default(uuid())
  userId    String
  puzzleId  String
  attemptId String?
  type      HintType
  status    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([puzzleId, createdAt])
}

model XpEvent {
  id          String   @id @default(uuid())
  userId      String
  source      String
  referenceId String?
  amount      Int
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}

model DailyPuzzleCompletion {
  userId      String
  day         DateTime
  puzzleId    String
  completedAt DateTime?
  xpAwarded   Int      @default(0)

  @@id([userId, day])
  @@index([day])
}
~~~

The schema is illustrative and should be adjusted after the puzzle format and authentication method are finalized.

### 7.4.1 Puzzle archive dataset

The live PostgreSQL catalog contains exactly 3,000 current puzzle rows. It must not grow when content rotates. Before changing a live row, the rotation process writes an immutable archive snapshot to the separate archive dataset.

Each archive record should contain:

- stable puzzle ID;
- content_version;
- content, answer options, canonical solution, and static hints;
- domain, configured difficulty, and audience categories;
- created_at, archived_at, and rotation metadata;
- a source or operation identifier for traceability.

The archive may be implemented as an append-only dataset or object-storage-backed files; the provider and format remain open. It is used for history, auditing, analysis, and future work. It is not read by the feed, Redis queue, or stale-submission verification path.

### 7.4.2 Difficulty state persistence

The independent difficulty module needs durable state for its complete algorithm. If it runs inside the same backend deployment, keep these tables or an equivalent module-owned schema separate from the core application tables:

- UserDomainRating: user_id, domain, rating, rating_deviation, volatility, cold_start_category, and updated_at.
- PuzzleVersionBandStats: puzzle_id, content_version, alpha, beta, interaction_count, and updated_at.
- Optional selection/calibration records for auditing exploration and safety decisions.

The key for puzzle statistics is the pair of stable puzzle ID and content_version. A content rotation therefore starts new alpha/beta evidence while preserving the stable ID. A stale or rejected interaction never updates either state.

### 7.5 Protecting the solution

The client response mapper must omit the verification field:

~~~ts
function toClientPuzzle(puzzle: Puzzle): ClientPuzzle {
  return {
    id: puzzle.id,
    contentVersion: puzzle.contentVersion,
    type: puzzle.type,
    content: puzzle.content,
    staticHints: puzzle.staticHints,
    difficulty: puzzle.difficultyMeta,
  };
}
~~~

The canonical solution stays in the backend/database until answer verification.

## 8. Redis implementation recommendation

Redis lists are suitable for ordered queue-like data, and sorted sets can support optional ranked caches. ([Redis lists](https://redis.io/docs/latest/develop/data-types/lists/), [Redis sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/))

### 8.1 Suggested keys

~~~text
queue:{userId}:ready
queue:{userId}:processing:{requestId}
queue:{userId}:meta
recent:{userId}
leaderboard:global             optional derived cache
~~~

Suggested content:

~~~text
queue:{userId}:ready
    ordered puzzle IDs

queue:{userId}:processing:{requestId}
    temporarily reserved puzzle IDs

queue:{userId}:meta
    queue generation
    rotation generation
    last refill time

recent:{userId}
    recently delivered IDs with timestamps or expiry
~~~

Redis is not the source of truth for puzzles, attempts, XP, or profile data.

### 8.2 Queue algorithm

~~~text
getFeedBatch(userId, batchSize):
    read ready queue length

    if ready queue length < refill threshold:
        request ordered IDs from difficulty module
        remove IDs in the recent window
        append accepted IDs to ready queue
        update queue metadata

    atomically reserve up to batchSize IDs
    move them from ready to a request-specific processing list

    load puzzle records from PostgreSQL
    remove missing IDs
    mark successful IDs as recently delivered
    finalize the processing list

    if loading fails:
        return reserved IDs to ready queue

    return renderable puzzle cards
~~~

### 8.3 Multi-device reservation

The same user can use multiple devices. Two simultaneous feed requests must not consume the same IDs.

Recommended approach:

1. Move IDs from ready to a request-specific processing list atomically.
2. Load the records.
3. Delete the processing list after success.
4. Move IDs back to ready after a recoverable failure.
5. Expire abandoned processing lists.

The exact Redis command sequence or Lua script is an implementation detail encapsulated by QueueService.

### 8.4 Repetition reduction

Track recently delivered IDs with timestamps or expiry rather than banning puzzles permanently.

~~~text
on successful delivery:
    add puzzle ID to recent:{userId}
    attach delivery timestamp
    expire old IDs

when accepting a difficulty response:
    remove IDs in the recent window
    allow a repeat only when there are not enough alternatives
~~~

The goal is to reduce repeated puzzles, not to guarantee that a puzzle never returns.

## 9. Difficulty-module integration

### 9.1 Adapter pattern

The feed module should depend on an interface rather than a particular difficulty implementation.

~~~ts
export type DifficultySelectionRequest = {
  userId: string;
  audienceCategory: 'CHILDREN' | 'TEENS' | 'ADHD';
  batchSize: number;
  recentPuzzleIds: string[];
  recentAttemptOutcomes?: Array<{ puzzleId: string; result: 'correct' | 'incorrect' | 'skipped' }>;
  recentSkipOutcomes?: Array<{ puzzleId: string; occurredAt: string }>;
  rotationGeneration?: string;
  currentUserContext?: Record<string, unknown>;
  audienceConstraints?: string[];
};

export type DifficultySelectionResponse = {
  selectionId: string;
  userId: string;
  orderedPuzzleIds: string[];
  selectionGeneration?: string;
  expiresAt?: string;
};

export type DifficultyOutcomeEvent = {
  userId: string;
  puzzleId: string;
  contentVersion: number;
  domain: string;
  result: 'correct' | 'incorrect' | 'skipped';
  outcomeScore?: number;
  elapsedTimeMs?: number;
  hintTierUsed?: 'none' | 'static' | 'dynamic';
  attemptCount?: number;
  abandonedMs?: number;
  submittedAt: string;
};

export interface DifficultyClient {
  selectBatch(
    request: DifficultySelectionRequest,
  ): Promise<DifficultySelectionResponse>;

  recordOutcome(event: DifficultyOutcomeEvent): Promise<void>;
}
~~~

The difficulty implementation can be an HTTP service, an internal process, or another module. The feed coordinator should not change as long as this contract remains stable.

### 9.2 Inputs required by the difficulty module

The core backend should be able to provide:

- User ID.
- User audience category.
- Requested batch size.
- Recently shown puzzle IDs.
- Recent verified outcomes.
- Rotation generation or queue-refresh generation.
- Eligibility filters once audience-category and puzzle metadata are finalized.

The difficulty workstream implements Glicko-2 for every user and domain, including rating, rating deviation, volatility, category/domain cold starts, target difficulty, calibration, exploration, domain diversity, safety ceilings/floors, and younger-user streak protection. The main backend sends outcome events without depending on private mathematical fields.

The difficulty module should maintain:

- one Glicko-2 state per user and domain, with rating, rating deviation, and volatility;
- category/domain-specific cold-start priors;
- a target difficulty derived from the user's current rating;
- Thompson Sampling candidates selected from the target range;
- alpha and beta statistics keyed by puzzle ID plus contentVersion, so a rotated content version has independent evidence;
- a difficulty floor and ceiling;
- domain-diversity limits within each requested batch;
- streak-protection rules for children and teens;
- calibration and controlled exploration behavior.

Every accepted correct, incorrect, or skipped interaction updates the relevant user-domain state and the selected content-version statistics. A stale or rejected submission must not update difficulty.

### 9.3 Outputs required from the difficulty module

The core backend needs at least:

- A selection ID.
- The user ID.
- An ordered list of puzzle IDs.
- Optional expiration or generation information.

The returned IDs should:

- Be ordered for delivery.
- Be unique within one batch.
- Be eligible for the user.
- Prefer not to repeat recently delivered IDs.
- Exist in the puzzle catalog.

The module may return additional metadata such as selected difficulty or a selection reason, but the core backend should not depend on it initially.

### 9.4 Verified outcome input

After an attempt or skip is accepted by the database, the backend should send an event such as:

~~~json
{
  "userId": "user-id",
  "puzzleId": "puzzle-id",
  "contentVersion": 1,
  "domain": "math",
  "result": "correct",
  "outcomeScore": 1,
  "elapsedTimeMs": 9200,
  "hintTierUsed": "none",
  "attemptCount": 1,
  "abandonedMs": null,
  "submittedAt": "2026-09-16T12:00:00Z"
}
~~~

The notification should happen after the database commit. If it fails, it can be retried without undoing the recorded attempt.

### 9.5 Unavailable-module fallback

If the independent difficulty module is temporarily unavailable, the backend may use a non-personalized fallback only to preserve feed availability:

~~~text
selectBatch(userId, batchSize):
    read current puzzles from the 3,000-record catalog
    exclude recently shown IDs
    order by stable ID or seed
    return the first batchSize IDs
~~~

This fallback is not a replacement for Glicko-2 or Thompson Sampling. Normal operation uses the complete independent difficulty module and sends accepted outcomes to it.

## 10. AI integration boundary

AI implementation details remain intentionally blank. Only the connection required by the rest of the application is described.

### 10.1 Static hints

Static hints require no AI request:

~~~text
User requests static hint
    ↓
Backend loads static hint stored with the puzzle
    ↓
Backend records hint usage
    ↓
Backend returns static hint
~~~

Suggested service shape:

~~~ts
async function getStaticHint(userId: string, puzzleId: string) {
  const puzzle = await puzzleRepository.findCurrentById(puzzleId);

  if (!puzzle) {
    throw new NotFoundError('Puzzle not found');
  }

  await hintRepository.record({
    userId,
    puzzleId,
    type: 'STATIC',
    status: 'DELIVERED',
  });

  return puzzle.staticHints;
}
~~~

### 10.2 Dynamic hints

The backend should depend on an adapter:

~~~ts
export type DynamicHintRequest = {
  requestId: string;
  userId: string;
  puzzleId: string;
  contentVersion: number;
  attemptId?: string;
  userQuestion?: string;
};

export type DynamicHintResult =
  | { status: 'success'; hintContent: unknown }
  | { status: 'unavailable' }
  | { status: 'failed'; retryable: boolean };

export interface DynamicHintProvider {
  requestHint(request: DynamicHintRequest): Promise<DynamicHintResult>;
}
~~~

The default provider can return unavailable until the AI workstream supplies an implementation. The feed, answer verification, XP, and statistics must still work in this mode.

The following remain outside this document:

- AI model.
- AI provider.
- Prompt.
- Context construction.
- Conversation memory.
- Safety policy.
- Cost control.
- AI framework.
- AI evaluation.

## 11. Puzzle catalog implementation

### 11.1 Initial seed

The database contains exactly 3,000 current puzzle records. The seed process should:

1. Read source puzzle files.
2. Validate required fields.
3. Assign stable IDs.
4. Insert exactly 3,000 current records.
5. Write an immutable archive snapshot for each initial record.
6. Validate the stable IDs and difficulty values.
7. Report invalid records without silently inserting them.

### 11.2 Flexible seed format

Because puzzle formats are not finalized, use a flexible source format:

~~~json
{
  "id": "puzzle-0001",
  "contentVersion": 1,
  "type": null,
  "difficulty": {},
  "content": {},
  "verification": {},
  "staticHints": [],
  "audienceCategories": ["CHILDREN", "TEENS", "ADHD"],
  "domain": null,
  "nextRotationAt": null
}
~~~

The values for type, content, verification, domain, audience categories, and difficulty metadata are intentionally open.

### 11.3 Catalog update workflow

~~~text
Select a puzzle by stable ID when its rotation time arrives
    ↓
Validate replacement content
    ↓
Write the current live snapshot to the append-only archive dataset keyed by puzzle ID and contentVersion
    ↓
Update content, solution, and hints in one database transaction
    ↓
    Keep ID, configured difficulty, domain, and audience categories unchanged
    ↓
Increment content version and pending refresh count

If the live update fails after the archive write, keep the immutable snapshot and retry the rotation idempotently; never delete an archive snapshot.
    ↓
After five updates, refresh queue metadata lazily
~~~

For the prototype, this can be a command-line seed/update script. A complete administrator dashboard can be added later.

### 11.4 Fixed-size content rotation

The database always contains exactly 3,000 puzzle records. Rotation updates one existing record by ID rather than deleting one ID and creating another.

Recommended behavior:

1. A fixed-time scheduler selects one puzzle ID.
2. The content, solution, and static hints are replaced in place.
3. The difficulty and puzzle ID remain unchanged.
4. The content version is incremented.
5. A pending queue-refresh count is incremented.
6. After five content updates, queue metadata is marked for refresh.
7. Each user refreshes its metadata on the next batch request.
8. The Redis queue continues to contain the same stable IDs.

If replacement content arrives with a new upstream/source identifier, map it to the selected existing catalog ID. Do not insert a 3,001st record or change the application puzzle ID.

If a user has already loaded an older content version, an answer submission for that version is rejected as an expired puzzle. The old content is not retained in the live database; its immutable snapshot is retained in the separate archive dataset.

## 12. Answer verification

### 12.1 Ownership

Answer verification belongs in the backend because:

- The canonical solution is protected.
- The client cannot award XP.
- Attempts must be recorded consistently.
- The difficulty module needs verified outcomes.
- Leaderboard values must use trusted events.

### 12.2 Verifier interface

~~~ts
type VerifyAnswerInput = {
  puzzle: {
    id: string;
    contentVersion: number;
    verification: unknown;
  };
  submittedAnswer: unknown;
};

type VerifyAnswerResult = {
  result: 'correct' | 'incorrect';
};

interface AnswerVerifier {
  verify(input: VerifyAnswerInput): VerifyAnswerResult;
}
~~~

The first implementation can support one answer format. Additional puzzle types can add their own verifier without changing the attempt API.

### 12.3 Stale-content rejection

When an answer arrives:

1. Load the current puzzle record by stable ID.
2. Compare the client content version with the current content version.
3. If they differ, do not run answer verification.
4. Return a conflict response indicating that the puzzle content expired.
5. Do not award XP or create a correct/incorrect attempt for the stale content.
6. The client discards the card and continues to the next puzzle.

Suggested logical response:

~~~json
{
  "error": {
    "code": "PUZZLE_CONTENT_EXPIRED",
    "message": "This puzzle was updated. Please continue to the next puzzle.",
    "puzzleId": "puzzle-123",
    "currentContentVersion": 2
  }
}
~~~

The client should treat this as a normal feed event rather than a fatal application error.

### 12.4 Verifier registry

Because puzzle types are not finalized, avoid one large conditional block.

~~~ts
interface PuzzleTypeVerifier {
  supports(type: string | null): boolean;
  verify(
    content: unknown,
    verification: unknown,
    submittedAnswer: unknown,
  ): 'correct' | 'incorrect';
}

class VerifierRegistry {
  constructor(private readonly verifiers: PuzzleTypeVerifier[]) {}

  verify(puzzle: Puzzle, submittedAnswer: unknown) {
    const verifier = this.verifiers.find((item) => item.supports(puzzle.type));

    if (!verifier) {
      throw new Error('Puzzle type verifier is not configured');
    }

    return verifier.verify(
      puzzle.content,
      puzzle.verification,
      submittedAnswer,
    );
  }
}
~~~

## 13. Attempts, XP, and streak transaction

The answer, XP, and daily progress should be updated in one database transaction whenever possible.

~~~text
begin transaction

check idempotency key
    if already processed:
        return previously stored result

load puzzle verification data
verify answer

insert attempt

if result == correct:
    calculate configured XP
    insert XP event
    update user total XP

if attempt completes the daily puzzle:
    insert daily completion if not already present
    update streak once

commit transaction

after commit:
    send verified outcome to difficulty module
~~~

The difficulty notification happens after commit. If it fails, retry it separately without creating a second attempt or second XP award.

## 14. Gamification implementation

### 14.1 XP

Start with one simple rule:

~~~text
correct answer  → +10 XP
incorrect       → +0 XP
skipped         → +0 XP
~~~

The value 10 is a configuration example. XP is awarded only by the backend after a verified answer.

Later, XP can depend on difficulty or daily-puzzle completion without changing the client API.

### 14.2 Daily puzzle

The daily puzzle requires:

1. A way to identify the daily puzzle for a date.
2. A record of whether the user completed it.
3. A transaction-safe streak update.

The first implementation can use a manually configured puzzle ID for each date. A more advanced selection process can be added later.

### 14.3 Streak

For a simple first implementation:

- Use one configured application time zone.
- Store the last daily-completion date.
- If today follows yesterday, increment the streak.
- If yesterday was missed, start a new streak at one.
- Do not update a streak twice for the same date.

### 14.4 Statistics

The first Stats page can show:

- Total attempts.
- Correct attempts.
- Accuracy percentage.
- Total XP.
- Current streak.
- Longest streak.
- Daily-puzzle completion.
- Hints used.
- Average answer time if timing is reliable.

Statistics by puzzle type can be added after puzzle types are finalized.

### 14.5 Global leaderboard

For a small prototype, calculate the global leaderboard from PostgreSQL:

~~~sql
SELECT
  id,
  display_name,
  total_xp
FROM users
ORDER BY total_xp DESC, id ASC
LIMIT 100;
~~~

Add a Redis sorted-set cache only when the database query becomes a real performance problem. PostgreSQL remains the durable source of truth.

### 14.6 Leaderboard mechanism

The first leaderboard is global and ranked by verified XP. It is not a second scoring system. It is a read model of XP that the backend has already awarded.

The authoritative flow is:

~~~text
User submits answer
    ↓
Backend verifies answer
    ↓
If correct, database transaction awards XP
    ↓
User total XP is updated
    ↓
XP event is stored with a unique reference
    ↓
Leaderboard query reads the updated total
~~~

The client never sends an XP value and never directly writes to the leaderboard.

#### XP and leaderboard update flow

~~~mermaid
flowchart TD
    A[User submits answer] --> B[Backend verifies answer]
    B -->|incorrect| C[Record attempt with zero XP]
    B -->|correct| D[Begin database transaction]
    D --> E[Insert attempt]
    E --> F[Insert unique XP event]
    F --> G[Increment user total XP]
    G --> H[Commit transaction]
    H --> I[Optional Redis leaderboard cache update]
    C --> J[Return result to client]
    I --> J
    J --> K[Client refreshes progress if needed]
~~~

#### Database-first implementation

For the prototype, the database should be enough:

~~~sql
SELECT
  id,
  display_name,
  total_xp
FROM users
ORDER BY total_xp DESC, id ASC
LIMIT 50;
~~~

The initial ranking rule is:

1. Higher total XP ranks first.
2. Equal XP uses a stable secondary ordering.
3. The secondary ordering should not change randomly between requests.

The exact tie-break rule is not a product decision yet. Ordering by stable user ID is a simple technical default.

#### Preventing double XP

An answer request can be retried by the client. The backend must not award XP twice.

Use both protections:

- Require a client-generated attempt ID and make it unique.
- Store a unique XP-event reference such as an attempt ID plus XP source.

Example:

~~~text
attempt ID:       attempt-123
XP event source:  CORRECT_ANSWER
XP reference:     attempt-123:CORRECT_ANSWER
~~~

The attempt, XP event, and user total update should happen in one PostgreSQL transaction:

~~~text
begin transaction

if attempt already exists:
    return the existing result

verify answer
insert attempt

if correct:
    insert XP event using unique XP reference
    increment users.total_xp

commit transaction
~~~

If the transaction is retried after a network timeout, the unique attempt ID prevents a second attempt and the unique XP reference prevents a second award.

#### Optional Redis leaderboard cache

When the number of users becomes large enough that repeated database ordering is expensive, maintain a derived Redis sorted set:

~~~text
leaderboard:global
    member = user ID
    score  = total XP
~~~

After the database transaction commits:

~~~text
ZADD leaderboard:global <totalXp> <userId>
~~~

To read the first page:

~~~text
ZREVRANGE leaderboard:global 0 49 WITHSCORES
~~~

The Redis value is only a cache. If it is missing or stale, the backend must be able to rebuild it from PostgreSQL.

#### Leaderboard read sequence

~~~mermaid
sequenceDiagram
    participant C as Client
    participant A as Backend API
    participant L as Leaderboard service
    participant R as Redis cache
    participant D as PostgreSQL

    C->>A: Request global leaderboard
    A->>L: Get first leaderboard page
    L->>R: Check optional sorted-set cache

    alt Cache is available and valid
        R-->>L: Return ranked user IDs and XP
        L->>D: Load safe public profile fields
        D-->>L: Return display names
    else Cache is missing or stale
        L->>D: Query users ordered by total XP
        D-->>L: Return ranked rows
        L->>R: Optionally warm/update cache
    end

    L-->>A: Return public leaderboard rows
    A-->>C: Display rank, name, and XP
~~~

#### Public data rules

The leaderboard response should contain only:

- Rank.
- Public display name or safe identifier.
- XP total.
- Optional current streak.

It should not expose:

- Email.
- Audience category.
- Authentication identity.
- Puzzle answers.
- Private attempt details.

#### Pagination

For the prototype, return the first 50 users. If pagination is needed:

- Use a limit parameter with a safe maximum.
- Prefer a cursor based on the last XP and stable tie-break value.
- Do not allow an arbitrary database offset to become a large performance cost.

Example logical request:

~~~text
GET /v1/leaderboard?scope=global&limit=50&cursor=...
~~~

#### Leaderboard failure behavior

If Redis is unavailable:

- Query PostgreSQL directly.
- Do not show an empty leaderboard merely because the cache is unavailable.

If PostgreSQL is unavailable:

- Return a retryable error.
- Do not fabricate ranks or XP values.

If a cache update fails after an XP transaction:

- Keep the XP transaction successful.
- Log the cache failure.
- Rebuild or repair the cache later.

## 15. Authentication recommendation

The user needs an account, but the exact authentication method is still open.

### Option A — Managed authentication

Use a managed provider and store the provider subject in the users table.

Advantages:

- Less password-security code.
- Password reset and email verification may already exist.
- Easy to use from web and native clients.

Trade-off:

- Adds a provider dependency.

### Option B — Backend-owned authentication

Implement:

- Email and password registration.
- Password hashing with a modern password-hashing algorithm.
- Short-lived access token.
- Long-lived refresh/session record.
- Logout by revoking the session.

Never store plaintext passwords. The exact library/provider remains undecided.

For the prototype, choose the method the team can implement and test confidently. Do not build password security from scratch without an experienced owner.

## 16. Local development

### 16.1 Local services

~~~text
Client development server
Backend API
PostgreSQL
Redis
Independent difficulty module or unavailable-module fallback
AI adapter returning unavailable
~~~

The fallback adapter allows the main application to remain available if the independent difficulty module is temporarily unavailable. Normal operation uses the complete difficulty module; AI remains behind its blank boundary.

### 16.2 Repository layout

~~~text
apps/
├── client/
└── api/

packages/
├── contracts/
├── config/
└── test-data/

infra/
└── docker-compose.yml
~~~

### 16.3 Environment variables

~~~text
API_PORT
DATABASE_URL
REDIS_URL
AUTH_SECRET
CLIENT_API_URL
DIFFICULTY_SERVICE_URL
PUZZLE_ARCHIVE_URL
AI_SERVICE_URL
QUEUE_BATCH_SIZE
QUEUE_REFILL_THRESHOLD
QUEUE_RECENT_WINDOW
QUEUE_REFRESH_AFTER_UPDATES
XP_CORRECT_ANSWER
APPLICATION_TIME_ZONE
~~~

Provide these names in a checked-in environment example file, but do not commit secrets.

### 16.4 Startup order

~~~text
1. Start PostgreSQL.
2. Start Redis.
3. Apply database migrations.
4. Seed sample puzzles.
5. Start the difficulty module or its documented local adapter.
6. Start the backend API.
7. Start the Expo client.

The archive dataset must be reachable by the rotation worker before content rotation is enabled.
~~~

## 17. Testing strategy

### 17.1 Backend unit tests

Test:

- Answer verifier.
- XP calculator.
- Streak calculator.
- Puzzle response mapper that removes verification data.
- Duplicate-reduction logic.
- Queue refill decision.
- Content-rotation counter and queue-refresh threshold.
- Difficulty adapter error handling.
- AI adapter unavailable state.

### 17.2 Database integration tests

Test:

- User creation.
- Puzzle seed/upsert.
- Attempt creation.
- Duplicate-attempt idempotency.
- Correct answer awards XP once.
- Incorrect answer awards no XP.
- Daily completion updates streak once.
- Leaderboard ordering.

### 17.3 Redis integration tests

Test:

- Queue insertion.
- Ordered consumption.
- Batch consumption.
- Low-water refill.
- Recently shown ID tracking.
- Missing ID removal and stale-content rejection.
- Concurrent requests for one user.
- Releasing a failed reservation.
- Rebuilding a missing queue.

### 17.4 Contract tests

Create contract tests for:

- Backend ↔ difficulty module.
- Backend ↔ dynamic-hint adapter.
- Backend ↔ client feed response.

The difficulty module should be tested through its public contract without exposing its Glicko implementation.

### 17.5 Client tests

Test:

- Feed loads a batch.
- Next batch prefetches at the threshold.
- Answer submission shows loading then result.
- Incorrect answer shows incorrect feedback.
- Swipe records a skip.
- Static hint displays correctly.
- Dynamic hint unavailable state does not break the feed.
- Bottom tabs navigate correctly.
- Stats and leaderboard render backend data.

## 18. Deployment recommendation

### 18.1 Prototype deployment

Keep deployment simple:

~~~text
One client deployment
One backend deployment
One PostgreSQL instance
One Redis instance
One difficulty module or stub
AI disabled or connected later
~~~

Prefer a provider that can run a Node.js service or container and provide PostgreSQL and Redis without requiring a cluster.

### 18.2 Minimum operational practices

- Use environment variables.
- Use database migrations.
- Add structured logs.
- Add request IDs.
- Do not log passwords, tokens, or canonical solutions.
- Add health endpoints.
- Add readiness checks for PostgreSQL and Redis.
- Record puzzle IDs and attempt IDs in diagnostic logs.

Suggested health checks:

~~~text
GET /health
    API process is alive

GET /ready
    database connection works
    Redis connection works
    required configuration exists
~~~

Difficulty and AI should be reported as optional capabilities unless the product later makes them mandatory for feed delivery.

## 19. Alternative client strategy

If the website becomes more important than the Android application, another valid path is:

~~~text
React web application
    ↓
Capacitor wrapper for Android later
~~~

Capacitor is designed to wrap web applications into native Android/iOS applications while retaining a web-first approach. ([Capacitor documentation](https://capacitorjs.com/docs))

| Requirement | Expo + React Native Web | React web + Capacitor |
|---|---|---|
| Android app | Strong native path | Web-wrapper path |
| Website | Supported | Natural starting point |
| Shared UI | Shared React Native components | Shared web components |
| Browser behavior | Requires checking React Native Web compatibility | Natural web behavior |
| Native features | Strong Expo ecosystem | Plugin-based native access |
| Best fit | Mobile app and web both matter | Website clearly dominates |
| PikPok recommendation | Preferred | Fallback |

The recommended path remains Expo because PikPok is fundamentally a mobile feed experience while still requiring web access.

## 20. What should not be implemented yet

Do not add these unless requirements change:

- Separate microservices for every backend module.
- A message broker for normal answer submissions.
- A separate NoSQL database only for puzzles.
- A full administrator dashboard.
- Offline answer synchronization.
- Friends leaderboard.
- Social sharing.
- Complex XP multipliers.
- Multiple streak-protection rules.
- Dynamic AI internals in the core backend.
- Client-side correctness as a source of truth.
- Permanent copies of all puzzles in every user’s Redis queue.

## 21. Implementation order

### Phase 1 — Foundation

- Create the Expo client.
- Create the Fastify TypeScript API.
- Add PostgreSQL and Prisma.
- Add Redis connection.
- Add environment configuration.
- Add health/readiness endpoints.

### Phase 2 — Account and profile

- Implement the selected simple authentication method.
- Create the user model.
- Store the selected audience category and basic profile data.
- Protect authenticated operations.

### Phase 3 — Puzzle catalog

- Define the first minimal puzzle record.
- Seed a small sample first.
- Seed the initial catalog after validation.
- Implement catalog reads by ID.
- Remove verification data from client responses.

### Phase 4 — Feed and difficulty integration

- Connect the complete Glicko-2 and Thompson Sampling difficulty client, including category eligibility and outcome events.
- Implement batch feed API.
- Implement client feed rendering.
- Implement local batch state.
- Implement next-batch prefetch.

### Phase 5 — Redis queues

- Add one queue per user.
- Add recent-puzzle tracking.
- Add refill threshold.
- Add multi-device reservation protection.
- Preserve queues between sessions.

### Phase 6 — Answers and skips

- Implement the first answer verifier.
- Implement answer submission.
- Implement correct/incorrect response.
- Implement skipped interaction recording.
- Add idempotency.

### Phase 7 — Gamification

- Add XP events.
- Add total XP.
- Add daily puzzle completion.
- Add streak calculation.
- Add statistics API.
- Add global leaderboard.

### Phase 8 — Hints

- Implement static hints from the database.
- Record static hint usage.
- Add the dynamic-hint adapter returning unavailable.
- Connect AI only when its contract is ready.

### Phase 9 — Difficulty integration

- Verify the complete difficulty client and its fallback behavior.
- Confirm the batch-selection contract.
- Send verified outcomes after attempts.
- Test Glicko-2 updates, content-version alpha/beta isolation, Thompson selection, and fallback behavior.

### Phase 10 — Catalog updates

- Add content rotation by existing puzzle ID.
- Track content versions and rotation timestamps.
- Write an immutable archive snapshot before each live content replacement.
- Start independent alpha/beta statistics for each new puzzle content version.
- Implement the fixed rotation interval.
- Refresh queue metadata after five updates.
- Test stale-content rejection.

## 22. Final recommendation

~~~text
Client:       Expo + React Native + React Native Web + TypeScript
Navigation:   Expo Router
Backend:      Node.js LTS + Fastify + TypeScript
API:          REST/JSON with schema validation
Database:     PostgreSQL with relational tables and JSONB puzzle content
ORM:          Prisma
Queue:        Redis lists per user
Recent IDs:   Redis set or sorted set with expiry
Leaderboard:  PostgreSQL first, Redis cache later if needed
Auth:         Simple account flow, exact provider TBD
Difficulty:   Independent adapter/service, complete Glicko-2 + Thompson Sampling design external
AI:           Blank adapter boundary, implementation external
Local setup:  Docker Compose or equivalent
~~~

This stack supports the current product loop without requiring large infrastructure. It keeps the client compatible with mobile web and Android, keeps durable data in one database, keeps queue operations fast, and leaves the difficulty and AI workstreams replaceable.

## 23. Official references

- [Expo — Develop websites with Expo](https://docs.expo.dev/workflow/web/)
- [Expo — Introduction to Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo — Router tabs](https://docs.expo.dev/router/advanced/tabs/)
- [Expo — Android build process](https://docs.expo.dev/build-reference/android-builds/)
- [Node.js — Release schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js — End-of-life guidance](https://nodejs.org/en/about/eol)
- [Fastify — TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Fastify — Type providers](https://fastify.dev/docs/latest/Reference/Type-Providers/)
- [PostgreSQL — JSON types](https://www.postgresql.org/docs/current/datatype-json.html)
- [Prisma — PostgreSQL connector](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql)
- [Prisma — Working with JSON fields](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types/working-with-json-fields)
- [Redis — Lists](https://redis.io/docs/latest/develop/data-types/lists/)
- [Redis — Sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/)
- [Capacitor — Cross-platform native runtime](https://capacitorjs.com/docs)
