# PikPok - Implementation Contract

> Authoritative implementation reference for v1. Update this document whenever an implementation-level contract changes.

This document reconciles the remaining useful details from `old work/` with the current product and architecture. It exists so implementation work does not need to infer routes, schemas, transaction rules, or generation behavior from legacy notes.

When sources disagree, use this order:

1. `project.md` for product behavior.
2. `architecture.md` for system design and boundaries.
3. `implementation-contract.md` for exact implementation contracts.
4. `milestones.md` and `tasks.md` for delivery order.
5. `common/types/` for active shared TypeScript contracts.
6. `old work/` for history only.

The active v1 audience is `CHILDREN | TEENS`, deployment is local-only, and only the five active puzzle types are supported. Neurodivergent profiles and `ADHD_TAP_CHALLENGE` remain isolated for M7.

---

## 1. API Contract

### 1.1 Conventions

- REST/JSON over HTTP.
- All request and response fields use `camelCase`.
- Timestamps are ISO 8601 UTC strings.
- Authentication uses `Authorization: Bearer <token>`.
- Successful responses return the requested resource directly.
- Errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

`details` is optional and must never contain `verification`, canonical answers, password hashes, or another user's private data.

### 1.2 Active Routes

| Method | Route | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/health` | No | Local health check |
| `POST` | `/auth/signup` | No | Create an account and return a token |
| `POST` | `/auth/login` | No | Authenticate and return a token |
| `GET` | `/feed` | Yes | Return the next feed batch |
| `POST` | `/feed/skip` | Yes | Record a skipped puzzle |
| `POST` | `/answer` | Yes | Verify and record an answer |
| `GET` | `/hints/:puzzleId` | Yes | Return one static hint tier and record usage |
| `GET` | `/stats` | Yes | Return the current user's statistics |
| `GET` | `/leaderboard` | Yes | Return the global XP leaderboard |
| `GET` | `/profile` | Yes | Return the current user's profile |
| `PATCH` | `/profile` | Yes | Update `displayName` only |

The legacy `/v1/...` route names are not active. If an OpenAPI document is added, it must match this table.

Fastify route schemas are the source for validation and generated OpenAPI documentation. A route is not complete until its request and success/error schemas match this document.

### 1.3 Authentication Payloads

`POST /auth/signup`

```json
{
  "displayName": "Maya",
  "email": "maya@example.com",
  "password": "at-least-eight-characters",
  "audienceCategory": "CHILDREN"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "displayName": "Maya",
    "audienceCategory": "CHILDREN",
    "createdAt": "2026-10-04T12:00:00.000Z"
  }
}
```

`POST /auth/login`

```json
{
  "email": "maya@example.com",
  "password": "at-least-eight-characters"
}
```

The login response uses the same `{ token, user }` shape as signup. Unknown email and wrong password both return `INVALID_CREDENTIALS` so the response does not reveal whether an account exists.

Validation rules:

- `displayName`: trimmed, 2 to 30 characters.
- `email`: trimmed and normalized to lowercase, valid email shape, maximum 320 characters.
- `password`: 8 to 72 characters, never logged or returned.
- `audienceCategory`: exactly `CHILDREN` or `TEENS`.

### 1.4 Feed Payload

`GET /feed?size=5`

- `size` is optional, defaults to `5`, and is clamped to `1..10`.
- The authenticated user is inferred from the JWT; the client never sends `userId`.

Response:

```json
{
  "puzzles": [
    {
      "id": "number-0001",
      "contentVersion": 1,
      "type": "NUMBER_SEQUENCE",
      "domain": "math",
      "difficultyRating": 1450,
      "content": {},
      "staticHints": [
        {
          "tier": 1,
          "type": "guiding_question",
          "content": "What changes between each pair of numbers?"
        }
      ]
    }
  ],
  "nextBatchRequiredAt": 2
}
```

The response must not contain `verification`, canonical answers, `audienceCategories`, `ageFloor`, `ageCeiling`, or `fingerprintHash`.

If the ready queue is too short, QueueService refills it before reserving the response. If fewer than `size` valid puzzles remain after catalog checks, return the valid subset and let the client request another batch.

### 1.5 Skip Payload

`POST /feed/skip`

```json
{
  "interactionId": "client-generated-uuid",
  "puzzleId": "number-0001",
  "contentVersion": 1
}
```

Response:

```json
{
  "interactionId": "client-generated-uuid",
  "puzzleId": "number-0001",
  "result": "skipped",
  "xpAwarded": 0
}
```

`interactionId` is required for idempotency. A skip is persisted and emits a neutral difficulty outcome after commit.

The submitted `contentVersion` must match the live puzzle. A mismatch returns `PUZZLE_CONTENT_EXPIRED` and persists neither an attempt nor an outbox event.

### 1.6 Answer Payload

`POST /answer`

```json
{
  "interactionId": "client-generated-uuid",
  "puzzleId": "number-0001",
  "contentVersion": 1,
  "submittedAnswer": "42",
  "elapsedTimeMs": 9200,
  "staticHintsUsed": 1
}
```

Response:

```json
{
  "interactionId": "client-generated-uuid",
  "puzzleId": "number-0001",
  "result": "correct",
  "xpAwarded": 10,
  "currentStreak": 3
}
```

`submittedAnswer` is a string with length `1..200`. `elapsedTimeMs` and `staticHintsUsed` are optional context and do not change the v1 score.

An incorrect response is:

```json
{
  "interactionId": "client-generated-uuid",
  "puzzleId": "number-0001",
  "result": "incorrect",
  "xpAwarded": 0,
  "currentStreak": 3
}
```

The response never includes the canonical solution.

### 1.7 Hint Payload

`GET /hints/:puzzleId?contentVersion=1&tier=1`

- `contentVersion` is required.
- `tier` is required and must be `1`, `2`, or `3`.
- A version mismatch returns `PUZZLE_CONTENT_EXPIRED`.
- A valid request records one `HintUsage` row and returns only that tier.

Response:

```json
{
  "puzzleId": "number-0001",
  "contentVersion": 1,
  "hint": {
    "tier": 1,
    "type": "guiding_question",
    "content": "What changes between each pair of numbers?"
  }
}
```

The feed already includes `staticHints` for local rendering. The endpoint is still called when a tier is revealed so hint usage is recorded consistently.

### 1.8 Stats, Leaderboard, and Profile Payloads

`GET /stats`:

```json
{
  "totalAttempts": 42,
  "correctAttempts": 31,
  "accuracyPercent": 73.81,
  "totalXp": 310,
  "currentStreak": 3,
  "longestStreak": 8,
  "dailyCompletions": 12,
  "hintsUsed": 5
}
```

`accuracyPercent` is `0` when there are no attempts; otherwise it is `correctAttempts / totalAttempts * 100`, rounded to two decimal places.

`GET /leaderboard?limit=50`:

```json
{
  "entries": [
    {
      "rank": 1,
      "displayName": "Maya",
      "totalXp": 310,
      "currentStreak": 3
    }
  ],
  "currentUser": {
    "rank": 12,
    "displayName": "Sam",
    "totalXp": 120,
    "currentStreak": 1
  }
}
```

- `limit` defaults to `50` and is clamped to `1..100`.
- Ties use stable user ID ascending, but user IDs are not exposed.
- `currentUser` is omitted if the authenticated user cannot be ranked.
- Public entries never include email, user ID, audience category, answer history, or hint history.

`GET /profile`:

```json
{
  "id": "uuid",
  "displayName": "Maya",
  "audienceCategory": "CHILDREN",
  "createdAt": "2026-10-04T12:00:00.000Z"
}
```

`PATCH /profile`:

```json
{
  "displayName": "Maya K."
}
```

The response is the updated profile. Audience category is immutable in v1.

### 1.9 Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Body, query, or path validation failed |
| `401` | `UNAUTHORIZED` | Missing, invalid, or expired token |
| `401` | `INVALID_CREDENTIALS` | Login email or password is incorrect |
| `403` | `FORBIDDEN` | Authenticated user cannot access the resource |
| `404` | `PUZZLE_NOT_FOUND` | Puzzle ID does not exist |
| `404` | `SCOPE_NOT_FOUND` | Requested resource does not exist |
| `409` | `EMAIL_ALREADY_REGISTERED` | Signup email already exists |
| `409` | `PUZZLE_CONTENT_EXPIRED` | Submitted content version is stale |
| `409` | `IDEMPOTENCY_CONFLICT` | Interaction ID was reused with a different payload |
| `422` | `UNSUPPORTED_AUDIENCE_CATEGORY` | Audience value is not `CHILDREN` or `TEENS` |
| `503` | `QUEUE_UNAVAILABLE` | Redis queue cannot serve the feed request; retryable |
| `500` | `VERIFIER_NOT_CONFIGURED` | No verifier is registered for a puzzle type |
| `500` | `INTERNAL_ERROR` | Unexpected server failure |

Expired-content details:

```json
{
  "error": {
    "code": "PUZZLE_CONTENT_EXPIRED",
    "message": "This puzzle was updated. Please continue to the next puzzle.",
    "details": {
      "puzzleId": "number-0001",
      "currentContentVersion": 2
    }
  }
}
```

Difficulty adapter failure does not return an API error when the non-personalized fallback succeeds.

---

## 2. PostgreSQL and Prisma Contract

### 2.1 Prisma Schema

The first migration must create these models. Use PostgreSQL 16 and Prisma migrations; do not use `prisma db push` as the normal workflow.

```prisma
enum AudienceCategory {
  CHILDREN
  TEENS
}

enum PuzzleType {
  NUMBER_SEQUENCE
  MISSING_OPERATOR
  SCHEDULING_ORDER
  ONE_TRUE_STATEMENT
  CONSTRAINED_ROUTE
}

enum DomainCategory {
  math
  logic
  spatial
  pattern
  deduction
}

enum AttemptResult {
  CORRECT
  INCORRECT
  SKIPPED
}

enum OutboxStatus {
  PENDING
  PROCESSING
  DELIVERED
}

model User {
  id               String            @id @default(uuid())
  email            String            @unique @db.VarChar(320)
  passwordHash     String
  displayName      String            @db.VarChar(30)
  audienceCategory AudienceCategory
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  attempts         Attempt[]
  stats            UserStats?
  hintUsage        HintUsage[]
  ratings          UserRating[]

  @@index([audienceCategory])
}

model Puzzle {
  id                 String        @id
  contentVersion     Int           @default(1)
  type               PuzzleType
  domain             DomainCategory
  difficultyRating   Float
  ageFloor           Int
  ageCeiling         Int
  audienceCategories AudienceCategory[]
  content            Json
  verification       Json
  staticHints        Json
  difficultyMetadata Json
  fingerprintHash    String
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  rotatedAt          DateTime?
  attempts           Attempt[]
  hintUsage          HintUsage[]

  @@index([type])
  @@index([domain])
  @@index([difficultyRating])
  @@index([ageFloor, ageCeiling])
  @@index([fingerprintHash])
}

model Attempt {
  id                     String        @id
  userId                 String
  puzzleId               String
  contentVersionAtAttempt Int
  result                 AttemptResult
  submittedAnswer        Json?
  xpAwarded              Int           @default(0)
  elapsedTimeMs          Int?
  staticHintsUsed        Int           @default(0)
  createdAt              DateTime      @default(now())
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  puzzle                 Puzzle        @relation(fields: [puzzleId], references: [id])

  @@index([userId, createdAt])
  @@index([userId, puzzleId])
  @@index([puzzleId, createdAt])
}

model UserStats {
  userId            String    @id
  totalXp           Int       @default(0)
  currentStreak     Int       @default(0)
  longestStreak     Int       @default(0)
  totalAttempts     Int       @default(0)
  correctAttempts   Int       @default(0)
  dailyCompletions  Int       @default(0)
  hintsUsed         Int       @default(0)
  lastStreakDate    DateTime?
  updatedAt         DateTime  @updatedAt
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model HintUsage {
  id             String   @id @default(uuid())
  userId         String
  puzzleId       String
  contentVersion Int
  hintTier       Int
  hintType       String
  usedAt         DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  puzzle         Puzzle   @relation(fields: [puzzleId], references: [id])

  @@index([userId, usedAt])
  @@index([puzzleId, contentVersion])
}

model OutboxEvent {
  eventId       String       @id
  aggregateType String
  aggregateId   String
  eventType     String
  payload       Json
  status        OutboxStatus @default(PENDING)
  attemptCount  Int          @default(0)
  availableAt   DateTime     @default(now())
  processedAt   DateTime?
  lastError     String?
  createdAt     DateTime     @default(now())

  @@index([status, availableAt])
}

model CatalogState {
  id                    String   @id @default("catalog")
  catalogGeneration     Int      @default(1)
  pendingRotationCount  Int      @default(0)
  updatedAt             DateTime @updatedAt
}

model UserRating {
  userId           String
  domain           DomainCategory
  rating           Float
  ratingDeviation  Float
  volatility       Float
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, domain])
}

model PuzzleSelectionStats {
  puzzleId       String
  contentVersion Int
  alpha          Float
  beta           Float
  impressions    Int      @default(0)
  updatedAt      DateTime @updatedAt

  @@id([puzzleId, contentVersion])
}
```

### 2.2 Migration Rules

- The live catalog starts with exactly 3,000 rows by M6. M3 may use a smaller validated fixture.
- Puzzle IDs are stable and are never regenerated during rotation.
- `contentVersion` increments by one on each successful rotation.
- Rotation replaces `content`, `verification`, `staticHints`, `difficultyMetadata`, and `fingerprintHash` while preserving `id`, `type`, `domain`, `difficultyRating`, and audience or age eligibility.
- A failed database update after an archive write leaves the immutable archive snapshot in place and retries idempotently.
- `catalogGeneration` increments after five successful rotations and resets `pendingRotationCount` to zero.
- Use one migration history from the beginning. Do not edit an applied migration to change a later contract.
- Store puzzle-specific data in JSONB, but keep IDs, versions, type, domain, rating, eligibility, dates, and hash values in normal columns.
- Do not add `NEURODIVERGENT`, `ADHD_TAP_CHALLENGE`, refresh tokens, cloud-provider tables, or production-only fields before M7 or an explicit scope decision.

### 2.3 Audience and Age Eligibility

v1 does not collect a birth date or exact age. Eligibility uses the selected audience category plus validated puzzle age bounds:

| Category | Eligible age band |
|---|---|
| `CHILDREN` | 0 through 12 |
| `TEENS` | 13 through 17 |

The candidate query must enforce both rules at the PostgreSQL layer:

```text
WHERE audienceCategories HAS :audienceCategory
  AND ageFloor <= :categoryMaxAge
  AND ageCeiling >= :categoryMinAge
```

The puzzle validator must reject a record whose age bounds do not cover its declared audience category. The difficulty module receives only already-eligible candidates and never performs the safety filter itself.

---

## 3. Redis Queue and Reservation Contract

### 3.1 Keys

| Key | Type | Responsibility |
|---|---|---|
| `queue:{userId}:ready` | List | Ordered puzzle IDs waiting for delivery |
| `queue:{userId}:processing:{requestId}` | List | IDs reserved for one feed request |
| `queue:{userId}:meta` | Hash | Queue's seen `catalogGeneration` and last refill time |
| `recent:{userId}` | Sorted set | Recently delivered IDs scored by delivery time |
| `leaderboard:global` | Sorted set | Optional derived leaderboard cache only |

Redis is not the source of truth for puzzles, attempts, XP, streaks, profile data, or difficulty state.

### 3.2 Atomic Reservation

The ready-to-processing move must be one Redis Lua script. Do not implement it as separate `LLEN`, `LRANGE`, and `LPOP` calls.

```lua
-- KEYS[1] = queue:{userId}:ready
-- KEYS[2] = queue:{userId}:processing:{requestId}
-- ARGV[1] = requested count
-- ARGV[2] = reservation TTL in seconds

local requested = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local reserved = {}

for i = 1, requested do
  local puzzleId = redis.call('LPOP', KEYS[1])
  if not puzzleId then
    break
  end
  table.insert(reserved, puzzleId)
end

if #reserved > 0 then
  redis.call('RPUSH', KEYS[2], unpack(reserved))
  redis.call('EXPIRE', KEYS[2], ttl)
end

return reserved
```

After a successful response, `DEL queue:{userId}:processing:{requestId}` and add delivered IDs to `recent:{userId}`.

### 3.3 Recoverable Failure Release

If the database load fails after reservation, return reserved IDs to the front of `ready` in their original order. Use one Lua script so a second request cannot observe a partially restored queue.

```lua
-- KEYS[1] = queue:{userId}:processing:{requestId}
-- KEYS[2] = queue:{userId}:ready

local reserved = redis.call('LRANGE', KEYS[1], 0, -1)

for i = #reserved, 1, -1 do
  redis.call('LPUSH', KEYS[2], reserved[i])
end

redis.call('DEL', KEYS[1])
return #reserved
```

### 3.4 Queue Recovery Rules

- Abandoned processing lists expire after `QUEUE_RESERVATION_TTL_SECONDS`, default `600`.
- Expired IDs are not recovered from the processing list. QueueService refills from PostgreSQL on the next request.
- Missing puzzle IDs are removed from the result and not returned to `ready`.
- Version-mismatched or ineligible IDs are removed from `ready`, not returned.
- Queue generation refresh replaces only IDs still in `ready`; it never changes an in-flight `processing` list.
- A rotation does not rewrite every user queue. QueueService compares the queue's saved `catalogGeneration` with `CatalogState.catalogGeneration` on the next batch.
- If Redis is unavailable, return `QUEUE_UNAVAILABLE`. Do not claim a database-backed queue fallback.
- `recent:{userId}` is trimmed by rank to `RECENT_PUZZLE_WINDOW`, default `100`.
- Recent IDs are preferred exclusions, not permanent bans. Allow a repeat when there are not enough alternatives.

Required Redis integration tests:

1. Two concurrent reservations cannot return the same ID.
2. A successful reservation moves IDs out of `ready` and deletes the processing list after completion.
3. A failed database load restores IDs in their original order.
4. An expired processing list disappears and the next request refills the queue.
5. A stale catalog generation refreshes only waiting IDs.
6. Missing or ineligible IDs are removed without breaking the response.

---

## 4. Difficulty Adapter Contract

The active module is in-process TypeScript under `apps/api/src/difficulty`, but QueueService may call it only through `DifficultyAdapter`.

```ts
export type DifficultyResult = 'correct' | 'incorrect' | 'skipped';

export interface DifficultyCandidate {
  puzzleId: string;
  contentVersion: number;
  difficultyRating: number;
  domain: 'math' | 'logic' | 'spatial' | 'pattern' | 'deduction';
  audienceCategories: Array<'CHILDREN' | 'TEENS'>;
}

export interface DifficultySelectionRequest {
  userId: string;
  audienceCategory: 'CHILDREN' | 'TEENS';
  batchSize: number;
  candidates: DifficultyCandidate[];
  recentPuzzleIds: string[];
  recentAttemptOutcomes: Array<{
    puzzleId: string;
    result: DifficultyResult;
    occurredAt: string;
  }>;
  catalogGeneration: number;
}

export interface DifficultySelectionResponse {
  selectionId: string;
  userId: string;
  orderedPuzzleIds: string[];
  selectionGeneration?: string;
  expiresAt?: string;
}

export interface DifficultyOutcomeEvent {
  eventId: string;
  userId: string;
  puzzleId: string;
  contentVersion: number;
  domain: 'math' | 'logic' | 'spatial' | 'pattern' | 'deduction';
  result: DifficultyResult;
  elapsedTimeMs?: number;
  staticHintsUsed?: number;
  submittedAt: string;
}

export interface DifficultyAdapter {
  selectBatch(
    request: DifficultySelectionRequest,
  ): Promise<DifficultySelectionResponse>;
  recordOutcome(event: DifficultyOutcomeEvent): Promise<void>;
}
```

There is no `outcomeScore` field. Correct and incorrect are the only skill-evidence results; skipped is neutral and may be used for repeat avoidance only.

The adapter contract error codes are internal to QueueService:

| Code | Trigger | Behavior |
|---|---|---|
| `DIFFICULTY_ADAPTER_UNAVAILABLE` | Module cannot be reached or initialized | Use fallback |
| `DIFFICULTY_SELECTION_TIMEOUT` | Selection exceeds the local timeout | Use fallback |
| `DIFFICULTY_SELECTION_INVALID` | Duplicate, unknown, ineligible, or stale ID | Discard response and use fallback |
| `DIFFICULTY_OUTCOME_FAILED` | Outcome delivery failed before outbox acknowledgment | Keep outbox event pending |

The fallback selects current, eligible puzzles, excludes recent IDs when possible, orders by stable `id`, records that fallback was used, and resumes personalized selection automatically.

The difficulty module owns these PostgreSQL records:

- `UserRating` keyed by `(userId, domain)`.
- `PuzzleSelectionStats` keyed by `(puzzleId, contentVersion)`.
- Cold-start priors, exploration state, and calibration details in module-owned code or future tables.

---

## 5. Verifier Contract

### 5.1 Interfaces

Use a registry with one verifier per active puzzle type. Do not use one large route-level conditional.

```ts
export type PuzzleType =
  | 'NUMBER_SEQUENCE'
  | 'MISSING_OPERATOR'
  | 'SCHEDULING_ORDER'
  | 'ONE_TRUE_STATEMENT'
  | 'CONSTRAINED_ROUTE';

export interface VerifyAnswerInput {
  puzzle: {
    id: string;
    type: PuzzleType;
    contentVersion: number;
    content: unknown;
    verification: unknown;
  };
  submittedAnswer: string;
}

export interface VerifyAnswerResult {
  result: 'correct' | 'incorrect';
}

export interface AnswerVerifier {
  readonly type: PuzzleType;
  verify(input: VerifyAnswerInput): VerifyAnswerResult;
}

export class VerifierRegistry {
  private readonly byType: ReadonlyMap<PuzzleType, AnswerVerifier>;

  constructor(verifiers: readonly AnswerVerifier[]) {
    this.byType = new Map(verifiers.map((verifier) => [verifier.type, verifier]));
  }

  verify(puzzle: VerifyAnswerInput['puzzle'], submittedAnswer: string): VerifyAnswerResult {
    const verifier = this.byType.get(puzzle.type);
    if (!verifier) {
      throw new Error('VERIFIER_NOT_CONFIGURED');
    }
    return verifier.verify({ puzzle, submittedAnswer });
  }
}
```

### 5.2 Normalization Rules

Normalization is internal to each verifier and must not be exposed to the client.

| Puzzle type | Normalization | Correctness rule |
|---|---|---|
| `NUMBER_SEQUENCE` | Trim, normalize Unicode minus signs, remove thousands separators, parse one finite number | Compare with canonical number |
| `MISSING_OPERATOR` | Trim, remove spaces, normalize `x`/`×` to `*`, `÷`/`:` to `/` | Compare with `acceptedAnswers` after the same normalization |
| `SCHEDULING_ORDER` | Trim, uppercase, split on commas, arrows, or whitespace, remove empty tokens | Compare ordered tokens with canonical order |
| `ONE_TRUE_STATEMENT` | Trim, collapse whitespace, lowercase | Compare with normalized `acceptedAnswers` |
| `CONSTRAINED_ROUTE` | Trim, uppercase, remove separators and whitespace, validate symbols `U/D/L/R` | Compare move sequence with normalized `acceptedAnswers` |

Rules:

- `canonicalAnswer` and `acceptedAnswers` remain server-only.
- A syntactically valid but wrong or unparseable answer returns `incorrect`.
- A non-string, empty, or over-200-character `submittedAnswer` returns `VALIDATION_ERROR`.
- A verifier must never mutate puzzle content or update difficulty.
- Every verifier must have table-driven tests with valid, equivalent, wrong, and malformed input.

---

## 6. Answer Transaction, XP, Streak, and Outbox

### 6.1 Transaction Sequence

Use one PostgreSQL transaction for an accepted answer or skip:

```text
begin transaction
  if Attempt.id already exists:
    if the stored user/puzzle/version/payload matches:
      return the stored result
    else:
      return IDEMPOTENCY_CONFLICT

  for an answer or skip:
    load current puzzle by stable ID
    compare submitted contentVersion with current contentVersion
    if mismatch: roll back and return PUZZLE_CONTENT_EXPIRED

  for an answer:
    run the registered verifier

  insert Attempt using interactionId as the stable id

  update UserStats:
    totalAttempts += 1
    if correct: correctAttempts += 1

  if correct:
    xpAwarded = 10
    totalXp += 10
    if this is the first correct answer on a new APP_TIME_ZONE calendar day:
      update currentStreak, longestStreak, dailyCompletions, lastStreakDate

  insert OutboxEvent:
    eventId = interactionId
    eventType = "difficulty.outcome"
    payload = verified outcome

commit
```

Create the `UserStats` row with default values in the same transaction as signup. A user must never reach answer processing without a stats row.

An incorrect answer and a skip insert an attempt and outbox event with `result: "incorrect"` or `result: "skipped"` and `xpAwarded: 0`. A stale or invalid answer updates nothing.

### 6.2 Idempotency

- `interactionId` is required and client-generated.
- `Attempt.id` is the idempotency key.
- Repeating the same request returns the stored result without adding XP or another outbox event.
- Reusing an ID with different `userId`, `puzzleId`, `contentVersion`, or submitted answer returns `IDEMPOTENCY_CONFLICT`.
- Do not use a separate generic idempotency table in v1.

### 6.3 Streak Rules

- Use `APP_TIME_ZONE`, default `UTC`.
- A calendar day is determined in that time zone, not by rolling 24-hour windows.
- Only the first correct answer of a new calendar day updates the streak.
- If the previous streak date is yesterday, increment.
- If the previous streak date is older than yesterday, reset `currentStreak` to `1`.
- If there is no previous streak date, start at `1`.
- `longestStreak` is the maximum of its previous value and the new current streak.
- `dailyCompletions` increments once per day on the first correct answer.
- Incorrect answers and skips never change streak values.

### 6.4 Hint Usage

- A valid hint request inserts one `HintUsage` row and increments `UserStats.hintsUsed`.
- Hint usage does not change XP, streak, or difficulty rating.
- The hint tier must be `1..3` and the content version must match the live puzzle.

### 6.5 Outbox Worker

- The worker polls `PENDING` events whose `availableAt` is due.
- It marks an event `PROCESSING` with a lease, calls `recordOutcome`, and marks it `DELIVERED` on success.
- On failure, it returns the event to `PENDING`, increments `attemptCount`, sets `lastError`, and schedules exponential backoff capped at 60 seconds.
- A `PROCESSING` event older than 60 seconds is reset to `PENDING`.
- Retries always reuse `eventId`; the difficulty module deduplicates by it.
- The outbox event is committed with the attempt, so a crash cannot lose the outcome.

---

## 7. Puzzle Generation and Seed Ingestion

### 7.1 Certification Pipeline

Every generated puzzle must pass this deterministic pipeline before entering the live catalog:

```text
Generated candidate
  -> 1. Schema validation
  -> 2. Deterministic re-solve and uniqueness check
  -> 3. Formula calibration check
  -> 4. Structural fingerprint deduplication
  -> 5. Hint consistency check
  -> Certified puzzle
```

Rules:

- Step 1 uses Zod schemas discriminated by `PuzzleType`.
- Step 2 uses deterministic solvers: equation solver, constraint solver, BFS, or equivalent. The solver must prove that the solution exists, is unique, and matches `verification`.
- Step 3 recomputes `difficultyRating` from `difficultyMetadata`; reject a mismatch outside `1e-6`.
- Step 4 computes SHA-256 over canonical structural JSON with sorted object keys while preserving meaningful array order.
- Step 5 verifies that tiers 1-3 are present, non-empty, and do not contradict the canonical solution. Tier 3 may describe the full method, but it must not state the literal canonical answer or accepted-answer string because all static hints are sent to the client.
- A candidate that fails any step is rejected and reported. It is never inserted.

### 7.2 Fingerprint Coverage

Include:

- puzzle type
- structural formula, equation, sequence, grid, constraints, or truth relation
- canonical answer or canonical order
- answer normalization identity

Exclude:

- theme
- character names
- cosmetic wording
- prompt and hint prose
- IDs and timestamps

The same structure with renamed characters or a different story must produce the same fingerprint.

### 7.3 LLM Constraints

The LLM is an optional offline content-wording tool:

- It receives already-generated structural parameters.
- It must return JSON only for the requested schema.
- It may change theme, character names, and wording only.
- It may not change numbers, operators, constraints, the canonical answer, accepted-answer rules, or difficulty metadata.
- Every LLM response is schema-validated and re-solved by deterministic code.
- LLM output is never trusted for certification, scoring, uniqueness, or difficulty.
- Dynamic runtime hints remain unavailable in v1.

### 7.4 Seed Wrapper

Generation exports use one versioned wrapper:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-04T12:00:00.000Z",
  "puzzles": []
}
```

Each item must match the active `GeneratedPuzzle` TypeScript contract. Files may be split by puzzle type, but all items use the same schema.

The M3 fixture may contain fewer than 3,000 rows. The M6 seed must contain exactly 3,000 records with this distribution:

| Puzzle type | Count |
|---|---:|
| `NUMBER_SEQUENCE` | 700 |
| `MISSING_OPERATOR` | 700 |
| `SCHEDULING_ORDER` | 600 |
| `ONE_TRUE_STATEMENT` | 550 |
| `CONSTRAINED_ROUTE` | 450 |

Ratings must stay within `400..2800` and be spread across the range. Every record must declare at least one active audience category and valid age bounds.

### 7.5 Ingestion Rules

The seed command must:

1. Read the wrapper.
2. Validate `schemaVersion` and every puzzle.
3. Reject duplicate stable IDs.
4. Reject duplicate `fingerprintHash` values within the file and against the live catalog.
5. Verify the exact count for the M6 seed; the M3 fixture command may allow fewer.
6. Upsert by stable puzzle ID.
7. Write an initial archive snapshot for each inserted or updated record.
8. Report all rejected rows without silently inserting a partial catalog.

Suggested script names:

```text
npm run seed:fixture -- --file ./seed/fixtures/m3.json
npm run seed -- --file ./seed/catalog-3000.json
```

The seed and rotation paths must share the same validator, fingerprint function, and archive writer.

---

## 8. Authentication and Token Handling

### 8.1 Password Storage

- Hash passwords with bcrypt cost `12`.
- Never store or log plaintext passwords.
- Compare login passwords with bcrypt.

### 8.2 JWT

- Use `@fastify/jwt`.
- Sign with HS256 and a secret from `JWT_SECRET`.
- Include `sub: userId`, `iat`, `exp`, issuer `pikpok-local`, and audience `pikpok-client`.
- Expire tokens after `JWT_EXPIRES_IN`, default `7d`.
- Do not add refresh tokens or a logout endpoint in v1.
- A client logs out by deleting its local token.

### 8.3 Middleware

The auth middleware:

1. Reads `Authorization: Bearer <token>`.
2. Verifies signature, issuer, audience, and expiry.
3. Loads the user ID from `sub`.
4. Attaches `{ userId }` to the authenticated request.
5. Returns `UNAUTHORIZED` for missing, malformed, invalid, or expired tokens.

Route handlers read the authenticated `userId` from the request. They never trust a user ID supplied in the body or query.

### 8.4 Local Configuration

Required local settings:

```text
API_PORT=3000
DATABASE_URL=postgresql://pikpok:pikpok@localhost:5432/pikpok
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-local-secret
JWT_EXPIRES_IN=7d
APP_TIME_ZONE=UTC
ROTATION_ENABLED=true
ROTATION_INTERVAL_MINUTES=60
RECENT_PUZZLE_WINDOW=100
QUEUE_RESERVATION_TTL_SECONDS=600
```

`JWT_SECRET` must have no committed production default. The `.env.example` value is a placeholder only.

---

## 9. Required Tests

Backend:

- Vitest unit tests for each verifier, difficulty adapter, fingerprint function, and error mapper.
- Prisma integration tests against a local test database for the answer transaction, XP, streak, hint usage, rotation, and outbox.
- Redis integration tests for atomic reservation, release, expiry, and stale-generation refresh.
- Route tests for success, validation, authentication, expiration, idempotency, and fallback behavior.

Client:

- Jest plus React Native Testing Library tests for auth, feed, answer, hint, stats, profile, and leaderboard flows.
- Token attach and expired-token handling.

E2E:

- Playwright web flow: signup -> feed -> answer -> XP -> stats -> leaderboard.
- Verify that no API response contains a solution or private audience data.

Seed and rotation:

- Invalid schema, duplicate ID, duplicate fingerprint, rating mismatch, hint mismatch, and count mismatch tests.
- Archive-before-update test.
- Idempotent retry test after a simulated database failure.

---

## 10. Explicit Historical Exclusions

The following legacy details are not active:

- `NEURODIVERGENT` audience values and additive neurodivergent profiles.
- `ADHD_TAP_CHALLENGE` and condition-specific renderers.
- `outcomeScore`, hint-weighted outcome scoring, or timing-based scoring.
- Multiple-choice answers, Library, sharing, and fast-forward UI.
- `/v1/...` route names and legacy `/me` route names.
- Cloud providers, object storage, production deployment, CI/CD, external auth, and refresh tokens.
- A database-backed feed queue fallback when Redis is unavailable.
- Dynamic AI hints as an active feature.

If one of these becomes active later, update `project.md`, `architecture.md`, this document, shared types, migrations, and tests together.
