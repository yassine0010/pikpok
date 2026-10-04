# PikPok — Project Overview

> **This is the single source of truth.** Every feature, rule, and constraint for PikPok is documented here. If it's not in this file, it's not agreed.

---

## Problem

Generic puzzle apps serve the same content to everyone regardless of age or skill level. Children get puzzles that are too hard or inappropriate. Teens get bored by content designed for younger users. As a result, users disengage quickly because the difficulty is wrong, the content does not fit their age band, or the experience feels impersonal.

---

## Goal

Build a mobile-first puzzle application that delivers a continuous, personalized feed of puzzles to each user based on:

1. **Their audience category** (`CHILDREN` or `TEENS`).
2. **Their demonstrated skill level** across multiple cognitive domains, tracked and updated after every puzzle.

The system must feel like an infinite, well-tuned puzzle feed — never too easy, never too hard, always age-appropriate.

---

## Users

| User Type | Age Range | Category Code | Description |
|---|---|---|---|
| Children | Under 13 | `CHILDREN` | Younger users; content uses colorful, reward-driven tone; simpler reading level; COPPA-compliant |
| Teens | 13–17 | `TEENS` | Competitive, social framing; faster pacing; more complex reasoning puzzles |

The user (or parent) selects their age category at signup. It is never inferred from behavior. Neurodivergent profiles and condition-specific content are deferred to M7 and are not part of the active v1 audience contract.

---

## Functional Requirements

### FR-01: Account & Profile
- Users must have an account to use the app.
- Profile stores: display name, audience category (`CHILDREN` | `TEENS`), and account creation date.
- Authentication method is TBD (JWT-based is recommended).

### FR-02: Puzzle Feed
- On opening the app, the user receives a batch of puzzles (default: 5).
- When the local queue drops to ≤ 2 puzzles, the client requests a new batch.
- Puzzles are selected based on audience eligibility first, then personalized by the difficulty engine.
- Each puzzle has a stable ID and a `contentVersion` — the ID never changes, even when content rotates.

### FR-03: Answer Submission
- The user submits a short text answer for each puzzle.
- Answers are validated **server-side only** — the canonical solution is never sent to the client.
- The server returns `correct` or `incorrect`. In v1, an incorrect answer does not reveal the solution.
- If the user submits an answer for an outdated `contentVersion`, the server rejects it as expired.

### FR-04: Skip / Swipe
- The user can swipe past a puzzle without answering.
- Skips are recorded as interactions but are neutral for difficulty scoring (no correct/incorrect effect on Glicko-2).
- Skips are tracked for repeat-avoidance.

### FR-05: Static Hints
- Each puzzle includes up to 3 tiers of static hints (guiding question → strategic clue → step walkthrough).
- Hints are stored as part of puzzle content and served alongside the puzzle.

### FR-06: Dynamic Hints (Deferred)
- AI-generated dynamic hints are not built yet.
- The app shows an "unavailable" placeholder for this feature.
- An integration boundary exists for future AI hint service connection.

### FR-07: XP & Scoring
- Correct answer: **+10 XP**.
- Incorrect answer or skip: **0 XP**.
- No XP multipliers in v1.

### FR-08: Daily Streak
- Calculated using one configured application time zone.
- A streak increments when the user answers at least one puzzle correctly on a new calendar day.

### FR-09: Leaderboard
- Global, all-time leaderboard.
- Ordered by total XP; ties broken by stable user ID.
- Shows: display name, XP, rank, and optionally current streak.
- Does **not** expose: audience category, authentication identity, or private answer history.

### FR-10: Statistics
- Track per user: total attempts, correct answers, accuracy %, total XP, current streak, longest streak, daily completion count, and hint usage.

### FR-11: Puzzle Catalog & Rotation
- Live catalog holds exactly **3,000 puzzle slots** with stable IDs.
- A puzzle-generation engine supplies replacement content on a scheduled interval (interval TBD).
- Each rotation run replaces one puzzle: archive the old version (append-only JSON snapshot), update the live row, increment `contentVersion`.
- After every 5 successful rotations, increment `catalogGeneration`. On the next feed request for each user, reselect only undelivered queued puzzle IDs if the user's saved generation is stale.

### FR-12: Difficulty-Aware Feed (via independent module)
- The difficulty engine uses Glicko-2 (per user per domain) and Thompson Sampling (per puzzle content version) to select optimal puzzles.
- QueueService is the only component that calls the difficulty adapter.
- If the difficulty service is unavailable, fall back to a non-personalized batch that still respects audience eligibility, uses current content, avoids recently seen puzzles, and records fallback use.

---

## Business Logic

### Puzzle Selection Pipeline
```
User requests feed
    → QueueService gets candidate puzzle metadata from catalog
    → Age Engine hard-filters by audience category (age_floor / age_ceiling)
    → Difficulty Engine filters and ranks candidates, returns IDs
    → QueueService reserves IDs in Redis per-user queue
    → Batch delivered to client
```

### Answer Processing
```
User submits answer (puzzleId, contentVersion, submittedAnswer)
    → Server checks contentVersion matches current live version
        → If mismatch: reject as expired
    → Server validates answer against canonical solution
    → Returns correct/incorrect
    → Saves attempt with durable outbox event
    → Difficulty module updates user's Glicko-2 rating for the puzzle's domain
    → XP and streak updated if correct
```

### Difficulty Fallback
```
Difficulty service unavailable?
    → Serve non-personalized batch
    → Enforce audience eligibility
    → Use current puzzle content only
    → Avoid recently seen puzzles where possible
    → Record fallback use
    → Resume personalized selection after recovery
```

---

## Business Rules

1. **Age gating is a hard filter at the database layer.** The difficulty engine never sees age-inappropriate puzzles.
2. **Solutions stay on the server.** The client receives only puzzle `content` and `staticHints`.
3. **Skips are neutral for skill tracking** in v1. They are recorded for repeat-avoidance only.
4. **No medical or diagnostic claims.** PikPok is not a diagnostic or treatment tool. Any future cognitive-profile feature must preserve this boundary.
5. **The LLM never decides difficulty.** Deterministic code computes structural parameters; the LLM only adds themes and wording.
6. **The LLM never grades itself.** A deterministic solver must independently verify every generated puzzle's answer and uniqueness.
7. **Structural anti-duplication.** Renaming characters is not a new puzzle — a fingerprint hash of the mathematical/logical structure prevents duplicates.

---

## Technical Requirements

- Single central backend (no microservices for the prototype).
- Server-side answer validation.
- Per-user Redis queues for feed delivery.
- Durable outbox pattern for answer events sent to the difficulty module.
- Idempotent event processing (retries reuse the same `eventId`; difficulty module deduplicates).
- Multi-device access by the same user (one queue, consistent state).

---

## Technologies

| Layer | Technology | Status |
|---|---|---|
| Frontend | Expo + React Native + React Native Web | Selected |
| Navigation | Expo Router (file-based) | Selected |
| Language | TypeScript (everywhere) | Selected |
| Backend | Node.js (Active LTS) + Fastify | Selected |
| Database | PostgreSQL + Prisma ORM | Selected |
| Cache / Queue | Redis | Selected (deployment TBD) |
| API Style | REST/JSON, `camelCase`, OpenAPI-compatible | Selected |
| Archive | Append-only JSON snapshots in object storage | Selected (provider TBD) |
| Auth | Simple account flow | Open (provider TBD) |
| Local Dev | Docker Compose | Selected |

---

## Constraints

- **Prototype scope:** One central backend, no microservices.
- **3,000 live puzzle rows** — catalog does not grow beyond this.
- **No Library section, no share button, no fast-forward button** in v1.
- **No AI-generated dynamic hints** until the AI integration contract is defined.
- **Authentication provider not yet chosen** — keep the auth layer pluggable.
- **Rotation interval not yet set** — make it configurable.
- **Initial 3,000 puzzles will be seeded later** — the puzzle generation engine defines the content.

---

## Non-Functional Requirements

### Performance
- Feed batch delivery should complete in < 500ms under normal load.
- Redis queue operations should be atomic and sub-millisecond.

### Security
- Puzzle solutions never leave the server.
- Private data (audience category, auth identity, answer history) never appears in public responses.
- Age filtering is enforced at the database query level, not in application code that could be bypassed.
- COPPA compliance for users under 13.

### Scalability
- Architecture supports future microservice extraction (difficulty engine, AI hints) via adapter boundaries.
- Redis queues and PostgreSQL are horizontally scalable when needed.

### Reliability
- If Redis is unavailable: return a retryable feed error.
- If the difficulty module is unavailable: use the non-personalized fallback.
- Durable outbox pattern ensures no answer events are lost.

---

## Out of Scope (v1)

- AI-generated dynamic hints (placeholder only).
- Exact Glicko-2 calibration values and Thompson priors (tuned post-prototype).
- Dyslexia literacy puzzles (require verified linguist-reviewed lexicon).
- Library / history browsing.
- Share button or social features.
- Fast-forward / skip-ahead mechanics.
- iOS build (Android + Web only).
- Admin dashboard.
- Analytics / observability tooling.
- Multiplayer or real-time competitive modes.
- Neurodivergent profiles, ADHD tap challenges, and condition-specific adaptations (deferred to M7).

---

## Deferred Post-v1: M7 Neurodivergent Profile

M7 is not part of the v1 delivery and must not add active signup options, audience enum values, puzzle types, domains, or renderers before its decision gates are complete.

The phase must:

- Decide whether neurodivergent support is an additive profile, a general accessibility layer, or another model.
- Keep the active audience gated to children and teens unless a later product decision explicitly expands scope.
- Define age-safe eligibility, signup/profile behavior, and guardian/privacy requirements.
- Complete accessibility research with intended users and qualified reviewers.
- Define the ADHD tap challenge, including verification, scoring, safety, and content rules.
- Complete privacy, legal, and clinical-safety review before implementation starts.

---

## Acceptance Criteria

| # | Criterion | How to Verify |
|---|---|---|
| AC-01 | A new user can sign up, select `CHILDREN` or `TEENS`, and receive their first puzzle batch | End-to-end test: signup → category selection → feed request returns 5 puzzles |
| AC-02 | Puzzle solutions are never sent to the client | Inspect API response payloads — `verification` object must be absent |
| AC-03 | Submitting a correct answer returns `correct` and awards 10 XP | Integration test on answer endpoint |
| AC-04 | Submitting an answer for an expired `contentVersion` returns an expired error | Integration test with mismatched version |
| AC-05 | Skipping a puzzle records the skip but does not affect XP or difficulty rating | Check database after skip — XP unchanged, no Glicko-2 update |
| AC-06 | Feed respects the active audience category — children and teens never receive content outside their eligibility | Query test: verify age_floor/age_ceiling filter applied |
| AC-07 | If the difficulty service is down, the user still gets a non-personalized feed | Integration test with mocked unavailable difficulty adapter |
| AC-08 | Leaderboard shows display name, XP, rank — never audience category or auth identity | Inspect leaderboard API response |
| AC-09 | Puzzle rotation archives the old version before updating | Check object storage after a rotation run |
| AC-10 | Static hints (3 tiers) are served with each puzzle | Verify hint array in feed response |
