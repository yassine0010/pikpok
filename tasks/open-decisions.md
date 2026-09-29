# PikPok — Open Decisions

This file separates decisions still requiring a choice from decisions that have been agreed. The technical documents should follow the agreed choices below.

## Decisions to settle for puzzle and difficulty integration

| ID | Open decision | What is already known | Who should confirm |
|---|---|---|---|
| D-01 | Neurodivergent age eligibility | The profile has one of three categories: `CHILDREN`, `TEENS`, or `NEURODIVERGENT`. The specific age rule for the neurodivergent category is TBD. Decide whether the profile needs an `age` or `ageBand` field and how puzzle eligibility uses it. | Product team and difficulty owner |
| D-02 | Difficulty rating scale | **Decided:** each generated puzzle JSON will include its own numeric `difficultyRating`. Still agree on the scale/range and how it compares with the difficulty engine's user-rating range. The sample value `1200` is illustrative only. | Puzzle-generation owner and difficulty owner |
| D-03 | Exact difficulty tuning values | The algorithm and its responsibilities are already described in the technical-stack document: Glicko-2 per user/domain, Thompson Sampling per puzzle content version, cold starts, target ranges, calibration/exploration, safety limits, domain diversity, and streak protection. This item is only for exact parameter and prior values that are not specified there. | Difficulty owner |

## Deferred until puzzle-generation work is ready

| ID | Deferred decision | What is already known | Who should confirm later |
|---|---|---|---|
| D-05 | Puzzle formats and answer validation | Keep the schema flexible for now. Later, define the first puzzle type, its JSON content shape, answer format, interaction types, and backend validation rule. The catalog still requires stable ID, content version, domain, difficulty rating, eligible audience categories, content, canonical solution, and static hints. | Puzzle-generation owner and backend owner |
| D-06 | Seed insertion and generated replacements | The initial 3,000 puzzles will be inserted later. The generation engine will provide replacement puzzle content. When that work begins, define the generated payload, validation, and mapping to the existing stable catalog ID. | Puzzle-generation owner and backend owner |

## Decisions to settle before implementation or release

| ID | Open decision | What is already known | Who should confirm |
|---|---|---|---|
| D-07 | Remaining infrastructure choices | **Selected from the recommendations:** Expo + React Native + React Native Web, Expo Router, TypeScript, Node.js + Fastify, PostgreSQL + Prisma, Redis, REST/JSON, OpenAPI-compatible schemas, and Docker Compose or equivalent for local development. Still choose the exact runtime release, Redis deployment, authentication method/provider, and hosting provider. | Both developers and product team |
| D-08 | Complete the shared API contract | REST/JSON, `camelCase`, and an OpenAPI document are agreed. The developers still need to write exact routes, payload schemas, errors, timestamps, authentication fields, idempotency behavior, expired-content response, and feed-refill signal in that contract. | Both developers |
| D-09 | Set the rotation interval | The generation engine supplies one replacement per scheduled rotation run. Validate and archive it before updating the selected stable puzzle ID; keep 3,000 live rows and increment `catalogGeneration` after five successful updates. Choose the interval. | Product team and puzzle owner |
| D-11 |  |  |  |
| D-14 | Archive provider and retention | Use append-only JSON snapshots in object storage, keyed by puzzle ID and content version. Restrict access to the backend and maintainers, and back up the archive. Choose the provider and retention period. | Backend owner and product team |

## Values to tune after the prototype works

| ID | Open decision | Current starting point | Who should confirm |
|---|---|---|---|
| D-15 | Feed batch and refill thresholds | Start with a batch size of 5 and refill threshold of 2; tune after observing real feed behavior. | Both developers |
| D-16 | Repeat-reduction target | Track recent puzzle IDs, prefer less recently seen puzzles, and allow repeats when alternatives are limited. The exact recent window and repeat target are TBD. | Product team and difficulty owner |
| D-17 | Redis reservation and recovery implementation | QueueService owns reservations and delivery. Choose the atomic Redis commands or script, lock/expiry strategy, and recovery for interrupted multi-device requests. | Backend owner |
| D-18 | Stats details | Basic attempts, correct answers, accuracy, XP, streaks, daily completion, and hint usage are the starting point. Confirm any additional statistics and when to add them. | Product team |

## Already agreed; not TBD

- The user selects one audience category: `CHILDREN`, `TEENS`, or `NEURODIVERGENT`.
- **D-04:** Correct/incorrect results update difficulty state; skips are neutral for skill and success/failure statistics in the first version and are recorded for repeat avoidance. Timing/hint data are context until a weighting rule is agreed.
- **D-08:** REST/JSON, `camelCase`, and OpenAPI are the shared API conventions. Exact routes and schemas are implementation work tracked above.
- **D-09:** The generation engine supplies each replacement. A scheduled run validates and archives the replacement before updating a stable catalog ID; the rotation interval remains open.
- **D-10:** If the difficulty service is unavailable, serve a non-personalized batch from current puzzles while preserving audience eligibility, avoiding recent IDs where possible, and recording fallback use. Resume personalized selection when the module recovers.
- **D-11:** Intentionally left blank as requested. The active documents retain only the unavailable dynamic-hint placeholder boundary.
- **D-12:** Award 10 XP for a correct answer; award 0 for incorrect or skipped puzzles; use no XP multipliers in v1. Use one configured application time zone for streaks. The global leaderboard is all-time, ordered by XP and then stable user ID.
- **D-13:** Public profile/leaderboard data is display name, XP, rank, and optional current streak. Do not expose audience category, authentication identity, or private attempts. Do not automatically reveal the solution after an incorrect answer in v1.
- **D-14:** Use append-only JSON snapshots in object storage, keyed by puzzle ID and content version, restricted to the backend and maintainers, with backups. Provider and retention period remain open.
- The recommended starting stack has been selected: Expo/React Native for web and Android, Fastify/Node.js, PostgreSQL/Prisma, Redis, REST/JSON, and OpenAPI-compatible contracts.
- QueueService is the only component that calls the difficulty adapter. It gets candidate metadata from the catalog; the difficulty module filters and ranks candidates and returns IDs.
- REST/JSON uses `camelCase` for API and difficulty-adapter fields.
- After five successful catalog updates, each user's next feed request reselects only undelivered queued IDs when its saved generation is stale. In-flight reservations and cards already returned to the client remain unchanged.
- Accepted answers and skips are saved with a durable outbox event. Retries reuse the same `eventId`, and the difficulty module deduplicates it.
- If Redis is unavailable, the prototype returns a retryable feed error. If the difficulty module is unavailable, use the non-personalized fallback described above.
- The live catalog stays at 3,000 stable puzzle IDs; rotated content is archived separately.

## Source documents

- [Technical architecture](technical-architecture.md)
- [Technical stack and implementation](technical-stack-and-implementation.md)
- [Development checklist for two teammates](development-checklist-two-teammates.md)

When a decision is made, update its row here and the matching source section above. Remove or mark resolved rows only after the source documents agree.
