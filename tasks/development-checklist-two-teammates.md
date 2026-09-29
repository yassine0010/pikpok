# PikPok Development Checklist — Two Teammates

This checklist divides the prototype into two parallel workstreams. Replace “Teammate A” and “Teammate B” with the developers’ names. Keep the shared contracts and integration points coordinated so both people can work in parallel.

Every actionable item uses a standard Markdown checkbox. In a task-list-aware Markdown editor or preview, click the box; otherwise, mark it complete by changing [ ] to [x]. Task group names such as A1 and B4 are used in the dependency map below.

Related documents:

- [Detailed project architecture](technical-architecture.md)
- [Technology recommendations and implementation](technical-stack-and-implementation.md)
- [Open decisions](open-decisions.md)

## 1. Work split

| Owner | Main responsibility | Main deliverable |
|---|---|---|
| Teammate A | Core backend data and application features | Persistent data, accounts, puzzle catalog and rotation, answer handling, hints, and gamification APIs |
| Teammate B | Client application and personalized feed delivery | Expo app, scrolling puzzle experience, feed API, per-user Redis queues, and difficulty-module adapter |
| Both | Shared decisions, API contracts, integration, and prototype handoff | One working app connected to the backend |

This split gives Teammate B ownership of the client-facing feed and its delivery pipeline, while Teammate A owns the durable puzzle and user activity features. Each person should own the files and modules listed below; agree before changing another owner’s interface.

## 2. Decisions to carry into implementation

- [x] Use the selected starting stack: Expo, React Native, React Native Web, Expo Router, and TypeScript for the client; Node.js, Fastify, and TypeScript for the API; PostgreSQL with Prisma for durable data; Redis for per-user feed queues.
- [ ] Keep the release as a small prototype with one central backend.
- [x] Use REST/JSON and `camelCase` for API and difficulty-adapter fields.
- [x] On difficulty-service outage, serve a non-personalized batch while enforcing audience eligibility and current content, avoiding recent IDs when possible, recording fallback use, and resuming personalized selection after recovery.
- [x] Award 10 XP for a verified correct answer and 0 for incorrect or skipped puzzles; use no multipliers in v1. Calculate streak dates in one configured application time zone.
- [x] Use an all-time global XP leaderboard; break ties by stable user ID. Expose only display name, XP, rank, and optional current streak, and do not reveal the solution automatically after an incorrect answer in v1.
- [x] Archive append-only JSON snapshots in object storage, keyed by puzzle ID and content version, restricted to backend/maintainer access, with backups. Provider and retention period remain TBD.
- [ ] Finalize the exact request/response fields, errors, and routes in the shared contract before client/server integration.
- [ ] Keep puzzle-specific formats flexible until the puzzle-generation workstream defines them later.
- [ ] Store one of three audience categories: CHILDREN, TEENS, or NEURODIVERGENT. The age-specific eligibility rule for NEURODIVERGENT remains TBD; do not infer age from the category.
- [ ] Use a configurable initial feed batch size of 5 and refill threshold of 2 as implementation defaults; these are adjustable values.
- [ ] After every 5 successful content updates, increment the durable catalogGeneration. On each user's next feed request, replace only undelivered queue IDs if their saved generation is behind.
- [ ] Set the rotation interval through configuration once the team chooses it. Each scheduled run requests one replacement from the generation engine.
- [ ] Return only correct or incorrect for submitted answers. A skipped/swiped puzzle is recorded as skipped.
- [ ] Build the global leaderboard only. Do not build a Library, share action, or fast-forward action in this prototype.
- [ ] Keep dynamic hints behind an integration boundary. The app may show an unavailable state until the AI owner supplies the integration contract and implementation.
- [ ] Keep the complete Glicko-2 and Thompson Sampling difficulty implementation in its independent workstream. These two workstreams implement and integrate the agreed selection/outcome adapter.
- [ ] Store every rotated puzzle snapshot in the separate append-only archive dataset while keeping exactly 3,000 live puzzle rows.

## 3. Shared setup and coordination

### Before implementation

- [ ] SH-01 — Both: Assign the two names and confirm the work split above.
- [ ] SH-02 — Both: Agree on the repository layout and branch/merge approach. Suggested layout:

  ~~~text
  apps/
    client/
    api/
  packages/
    contracts/
  ~~~

- [ ] SH-03 — Both: Create or approve the shared API contract location. Put shared request/response types there rather than separately inventing client and server shapes.
- [ ] SH-04 — Both: Agree on the first account/authentication approach. The architecture requires an account, but the exact method is still open.
- [ ] SH-05 — Both: Plan to insert the initial 3,000 puzzle records later; confirm the generation engine's replacement-content handoff before rotation is implemented.
- [ ] SH-06 — Both: Confirm the rotation interval. Replacement content is supplied by the puzzle-generation engine to a backend scheduled job.
- [ ] SH-07 — Both: Defer the first puzzle type and answer format until the puzzle-generation workstream defines them. Do not invent a puzzle schema or verifier before that input exists.
- [ ] SH-08 — Both: Choose the object-storage provider and retention period for append-only JSON archive snapshots; confirm backend/maintainer-only access and backups.

### Shared API contract to settle early

- [ ] API-01 — Teammate A leads; Teammate B reviews: Define common error shape, authentication convention, user identifier, timestamps, and idempotency behavior.
- [ ] API-02 — Teammate B leads; Teammate A reviews: Define the camelCase feed batch request/response, including stable puzzle ID, contentVersion, content, static hints, and the next-refill signal.
- [ ] API-03 — Teammate A leads; Teammate B reviews: Define camelCase answer submission and result payloads, including attemptId, stable puzzle ID, contentVersion, submittedAnswer, and correct/incorrect result.
- [ ] API-04 — Teammate A: Define the expired-content response code and message. A version mismatch must tell the client to discard the card and continue.
- [ ] API-05 — Teammate A: Define the profile, static hint, dynamic-hint placeholder, stats, daily-puzzle, and leaderboard response shapes.
- [ ] API-06 — Both: Define the exact routes, payloads, errors, timestamps, authentication fields, and idempotency rules in the shared OpenAPI document; use those same camelCase shapes in implementation.

### Dependency map and recommended order

The main dependencies are between task groups, not every individual checkbox. Tasks within a group can usually proceed together unless a checkbox says it needs a specific input.

| Task group | Can start after | Unblocks or is needed by |
|---|---|---|
| SH-01 to SH-07 | Nothing; complete the relevant shared decisions first | Establishes repository ownership, data inputs, puzzle format, and rotation interval |
| SH-08 | SH-05 and SH-07 | Confirms archive handoff and audience-category profile rule |
| API-01 to API-06 | SH-03; define independent payloads in parallel. Auth-related fields also need SH-04 | A2, A4, A6, A7, B2, B3, and B4 integration |
| A1 Backend foundation | SH-02 and agreed stack; authentication routes also need SH-04 and API-01 | A2 and B4 backend integration; B2 needs A1 account/profile routes |
| B1 Client foundation | SH-02 and agreed stack; can run in parallel with A1 | B2, B3, B5, B6, and B7 |
| A2 Durable data model | A1 and initial API-01 fields; flexible JSON content can be used while puzzle specifics are pending | A3, A4, A6, A7, and B4 catalog integration |
| A3 Puzzle catalog and initial data | A2 plus SH-05 and SH-08; a real 3,000-record seed also needs puzzle-source data | A4, A5, and B4 catalog integration |
| B2 Account/profile screens | B1, SH-04, API-01, and Teammate A's account/profile routes | Account-to-feed integration |
| B3 Puzzle feed UI | B1 and API-02; SH-07 is needed for final puzzle controls. Layout work can start with placeholder data | End-to-end solve-and-scroll also needs A4 and B4 |
| B4 Feed endpoint, Redis queue, difficulty adapter | Queue mechanics can start against API-02; connect catalog reads when A1/A2/A3 are ready. Difficulty integration needs the difficulty-owner contract | B5 and personalized-feed integration; its catalog-generation/reselection piece also needs A5 |
| Difficulty integration state | API-02/API-03/API-05 plus difficulty-owner contract | B4 selection adapter, A4 outcome emission, and difficulty-module verification |
| A4 Answer, attempt, and skip handling | A2, A3, API-03/API-04, and SH-07 puzzle/answer rules | A7 XP flow and end-to-end answer feedback |
| A5 Content rotation | A3, SH-05 replacement input, SH-06 interval/source, SH-08 archive contract, and the catalog-generation/reselection contract | B4 catalog-generation/reselection piece and content-rotation milestone |
| A6 Hints | A2, A3, and API-05; static hints can start before an AI contract exists | B6 hint integration |
| A7 XP, daily puzzle, stats, leaderboard | A2, A4, API-05, and the team’s initial XP rule | B7 screens |
| B5 Client batch state and prefetch | B1 and B4 feed contract/endpoint | Smooth continuous-feed milestone |
| B6 Hints UI | B1, A6 static-hint route, and API-05 | Hint integration milestone |
| B7 Stats and leaderboard screens | B1, A7 routes, and API-05 | Progress/leaderboard milestone |

#### Dependency flow

~~~mermaid
flowchart TD
    S[Repository and stack agreement] --> A1[A1 Backend foundation]
    S --> B1[B1 Client foundation]
    F[Feed contract] --> B4[B4 Feed API and Redis queue]
    P[Initial seed and later puzzle-generation format] --> A3[A3 Puzzle catalog and seed]

    A1 --> A2[A2 Durable data model]
    A2 --> A3
    A1 --> B4
    A2 --> B4
    A3 --> B4

    B1 --> B2[B2 Account and profile UI]
    B1 --> B3[B3 Puzzle feed UI]
    B1 --> B5[B5 Batch state and prefetch]
    B4 --> B5

    A3 --> A4[A4 Answers and skips]
    A2 --> A4
    P --> A4
    A4 --> A7[A7 XP, daily puzzle, stats, leaderboard]
    A2 --> A7
    A7 --> B7[B7 Stats and leaderboard UI]
    B1 --> B7

    A2 --> A6[A6 Hint endpoints]
    A3 --> A6
    A6 --> B6[B6 Hint UI]
    B1 --> B6

    A3 --> A5[A5 Content rotation]
    R[Rotation interval and replacement input] --> A5
    A5 -. catalog generation .-> Q[B4 undelivered-ID reselection]
    B4 --> Q
~~~

#### What can run in parallel

- Teammate A can build A1 while Teammate B builds B1 after SH-02.
- Teammate A can draft A2 while Teammate B builds screens with placeholder data; final field shapes depend on the shared contracts and puzzle input.
- Teammate A can implement A6 static hints while Teammate B builds the feed UI.
- Teammate B can implement queue mechanics and the public difficulty adapter contract once A1/A2/A3 and API-02 are ready. The complete difficulty module remains an independent integration dependency.
- A5 rotation and B3/B5 client work can be developed separately, but their integrated behavior depends on stable contentVersion and catalog-generation/reselection contracts.

## 4. Teammate A — Core backend and durable application features

### A1. Backend foundation

- [ ] Create the Fastify TypeScript API application.
- [ ] Add environment configuration and a safe example environment file without secrets.
- [ ] Add PostgreSQL and Prisma configuration.
- [ ] Add database connection handling and a health endpoint.
- [ ] Add shared request validation and a consistent API error response.
- [ ] Add authentication middleware after the team selects its account approach.
- [ ] Implement account creation/sign-in and profile routes for the selected approach, including the audience category field.
- [ ] Add the backend module boundaries: account/profile, puzzle catalog, attempts, hints, gamification.

Completion outcome: The API starts locally, connects to PostgreSQL, and exposes a health response. Protected routes can identify the authenticated user.

### A2. Durable data model

- [ ] Implement the initial User/Profile model, including the account identity, audience category, display name if used, XP totals, and streak fields required by the agreed API.
- [ ] Implement the Puzzle model with a stable application ID, contentVersion, required numeric difficultyRating, required domain, audience categories, current content, current verification data, current static hints, and rotation timestamps.
- [ ] Implement CatalogState with the durable catalogGeneration and pending successful-content-update count.
- [ ] Implement a DifficultyOutboxEvent with unique eventId, payload, delivery status, and timestamps.
- [ ] Implement Attempt data with user ID, stable puzzle ID, displayed content version, answer result or skipped result, hint counts, elapsed time when available, XP awarded, and an idempotency identifier.
- [ ] Implement the data needed for static/dynamic hint usage, XP events, and daily puzzle completion.
- [ ] Add the database migrations and keep frequently queried fields as normal columns. Keep puzzle-specific content flexible.
- [ ] Keep the canonical solution/verification data out of client responses.
- [ ] Store basic attempt data in the live database. Preserve previous puzzle snapshots only in the separate append-only archive dataset.

Completion outcome: The database represents accounts, the current puzzle catalog, attempts, hints, XP, daily completion, and streaks without storing old puzzle content.

### A3. Puzzle catalog and initial data

- [ ] Implement repository operations to find one current puzzle by stable ID and load multiple current puzzles by ID while preserving requested order.
- [ ] Implement a response mapper that returns only client-safe puzzle fields.
- [ ] Implement initial catalog import/seed with validation.
- [ ] Ensure the live catalog contains exactly 3,000 puzzle records after seeding.
- [ ] Ensure each record has an application ID, content, canonical solution, static hints, numeric difficultyRating, domain, and at least one audience category. Each generated puzzle JSON includes its own difficultyRating.
- [ ] Write an immutable archive snapshot for each initial puzzle record.
- [ ] Write an immutable archive snapshot before replacing content for an existing puzzle ID.
- [ ] Reject or report invalid/incomplete input instead of silently inserting it.
- [ ] If replacement data arrives with a different source identifier, map it to the selected existing application puzzle ID.

Completion outcome: The application catalog has exactly 3,000 current records. The client can read a puzzle by ID but cannot receive its answer.

### A4. Answer, attempt, and skip handling

- [ ] Implement the first answer verifier after the puzzle-generation workstream defines the first puzzle format and answer rules.
- [ ] On answer submission, load the current puzzle by stable ID and compare the submitted contentVersion with the current version before verifying.
- [ ] If versions match, verify on the backend and return only correct or incorrect.
- [ ] If versions differ, reject the submission as an expired puzzle before verification; do not award XP or create a correct/incorrect attempt for stale content.
- [ ] Persist accepted attempts with the version shown to the user and only basic attempt information.
- [ ] Implement skip recording for a puzzle swiped past without an answer.
- [ ] Make answer submission idempotent so a retry does not create a second attempt or XP award.
- [ ] Emit the accepted outcome to the difficulty adapter after the database transaction commits.

Completion outcome: Current puzzle answers produce a backend-owned correctness result. Stale content is rejected and can never award XP. Swipes are recorded as skips.

### A5. Content rotation and catalog-generation signal

- [ ] Implement a configurable fixed-time rotation trigger, one puzzle at a time.
- [ ] Select an existing puzzle record by its stable application ID.
- [ ] Validate replacement content before writing. If content is missing or invalid, leave the current record and version unchanged.
- [ ] Replace only its current content, solution, and static hints.
- [ ] Write the current live snapshot to the append-only archive dataset before replacement.
- [ ] Preserve the puzzle ID, configured difficulty, domain, and audience categories exactly.
- [ ] Increment contentVersion and update the rotation timestamp in the same database transaction as the content replacement.
- [ ] Keep the live catalog size at exactly 3,000. Do not insert a new catalog row; archive the outgoing snapshot separately.
- [ ] Increment the pending successful-content-update count in the same transaction as each successful rotation.
- [ ] After 5 successful updates, increment catalogGeneration and reset the pending count.
- [ ] On each user's next batch request, compare their Redis generation with catalogGeneration. If stale, discard and reselect only IDs still waiting in the server-side queue.
- [ ] Keep IDs already reserved for an in-flight response and cards already returned to the client unchanged; always load current content/version by ID.
- [ ] Ensure already displayed older versions receive the expired-puzzle response if submitted after rotation.

Completion outcome: A scheduled update archives the outgoing snapshot, changes one existing record’s content while preserving its ID, difficulty, domain, and audience categories, and keeps the catalog at 3,000 records. After five successful updates, stale users' undelivered queue IDs are reselected on their next request.

### A6. Hints

- [ ] Implement static hint retrieval from the current puzzle record.
- [ ] Record static hint usage against the authenticated user and puzzle.
- [ ] Add the dynamic-hint provider interface and request record only to the level needed by the shared contract.
- [ ] Return an unavailable/retryable response while no AI implementation is connected.
- [ ] Keep all AI internals, prompts, model choices, framework choices, and generation logic outside this implementation.

Completion outcome: Static hints work from stored puzzle data. Dynamic hints have a safe placeholder response that does not block the feed or answer flow.

### A7. XP, daily puzzle, streak, statistics, and leaderboard

- [ ] Award XP only for backend-verified correct answers. Incorrect and skipped interactions award zero XP.
- [ ] Store an XP event tied to the unique attempt ID so retries cannot award twice.
- [ ] Implement daily puzzle completion and ensure it is recorded at most once per user per day.
- [ ] Update current and longest streak from server-recorded daily completion.
- [ ] Implement the agreed basic statistics response: attempts, correct answers, accuracy, XP, streak, daily completion, and hint usage where available.
- [ ] Implement the global leaderboard from persistent XP totals with a stable tie-break order.
- [ ] Return only public leaderboard fields; never expose audience category, authentication identity, or private attempts.
- [ ] Keep Redis leaderboard caching out of the first implementation unless a real performance need appears.

Completion outcome: XP and progress come from persisted backend events. The Stats and global leaderboard endpoints return the agreed data.

### A8. Teammate A handoff

- [ ] Publish endpoint paths, payload types, error codes, and authentication requirements for the routes owned by Teammate A.
- [ ] Publish a local API URL and setup instructions for Teammate B.
- [ ] Notify Teammate B before changing any shared contract field.

## 5. Teammate B — Client and personalized feed delivery

### B1. Client foundation and navigation

- [ ] Create the Expo TypeScript client using Expo Router.
- [ ] Configure the app to run on Android and web.
- [ ] Add shared theme, loading, empty, and error components.
- [ ] Implement the agreed main navigation: Feed, Stats, Leaderboard, and Profile.
- [ ] Leave out the Library, share action, and fast-forward action.
- [ ] Add an API client that reads the base URL from configuration and attaches the authenticated session.

Completion outcome: The app launches on the intended targets and the four agreed sections are reachable.

### B2. Account and profile screens

- [ ] Implement account creation/sign-in screens that match the authentication contract selected by both teammates.
- [ ] Implement the simple profile screen with the audience category and only the agreed public profile fields.
- [ ] Handle signed-out, loading, and expired-session states.
- [ ] Do not collect extra profile details unless the team later adds them to scope.

Completion outcome: A user can sign in and reach the authenticated app with the agreed profile data.

### B3. Puzzle feed and scrolling interaction

- [ ] Implement one puzzle card per full-screen feed page.
- [ ] Implement vertical swipe/page snapping to move to the next puzzle.
- [ ] Support answer submission from the puzzle card and display the backend’s correct or incorrect result.
- [ ] Support swiping past a puzzle without answering and treat it as a skip.
- [ ] Prevent accidental duplicate answer/skip submission while a card is being submitted or transitioned.
- [ ] Implement card states for loading, ready, submitting, answered, skipped, expired, and recoverable error.
- [ ] Handle an expired-puzzle response by discarding that card, showing a brief “puzzle updated; continue” message, and moving the user forward.
- [ ] Do not reveal the correct solution automatically after an incorrect answer in v1.
- [ ] Use the supplied feed mockup as visual inspiration; omit Library, share, and fast-forward actions from the prototype.

Completion outcome: A user can open the feed, solve and submit, see correctness, swipe to skip, and continue through cards.

### B4. Feed endpoint, Redis queue, and difficulty adapter

- [ ] Implement the feed batch endpoint and coordinator using the shared feed contract.
- [ ] Connect the independent difficulty module through the agreed adapter: Glicko-2 per user/domain, Thompson Sampling, and category eligibility.
- [ ] Include candidate metadata from the catalog (puzzleId, contentVersion, difficultyRating, domain, audienceCategories), plus the user's audience category, recent IDs/outcomes, and batch constraints.
- [ ] Make QueueService the only caller of the difficulty adapter; it stores returned IDs in Redis.
- [ ] Emit accepted outcome events with a stable eventId and puzzle ID, contentVersion, domain, result, timing, hint tier, and other agreed signals.
- [ ] Persist outcome events in the outbox with the attempt/skip; retry the same eventId until the difficulty module acknowledges it.
- [ ] Ensure the adapter keeps content-version statistics separate when a stable puzzle ID rotates.
- [ ] Test difficulty ceilings/floors, domain diversity, calibration, exploration, and younger-user streak protection through the public contract.
- [ ] Keep the difficulty integration behind an adapter. The client must not call the difficulty module directly.
- [ ] Implement one Redis queue per user, containing puzzle IDs and queue metadata rather than full puzzle content.
- [ ] Start with the agreed configurable batch size and refill threshold.
- [ ] Track recently delivered IDs to reduce repeats, without permanently excluding a puzzle.
- [ ] Reject duplicate IDs within a returned batch.
- [ ] Reserve IDs safely so simultaneous requests for the same user do not deliver the same queued item twice.
- [ ] On a missing Redis queue, reconstruct it through the adapter.
- [ ] On a missing catalog ID, discard that ID and ask for another.
- [ ] Load current puzzle content/version from PostgreSQL when building the response.
- [ ] On a stale catalogGeneration, discard and reselect only undelivered IDs in the user's Redis queue; never change cards already sent to the client.
- [ ] On Redis failure, return a recoverable feed error. Do not claim a database-backed queue fallback in the prototype, and do not lose attempts, XP, or profile data.
- [ ] Preserve per-user queue behavior across app sessions.

Completion outcome: Feed batches are personalized per user through the adapter, stored as IDs in Redis, and returned with current content from PostgreSQL.

### B5. Client batch state and prefetch

- [ ] Store the received batch and current card index in client state.
- [ ] Render the next card smoothly without issuing one request for every swipe.
- [ ] Request the next batch when the local batch reaches the agreed refill point.
- [ ] Avoid appending duplicate cards if a request is retried.
- [ ] Preserve the user’s feed position/queue state as agreed when the app is backgrounded and reopened.
- [ ] Show a recoverable loading/error state if the next batch is temporarily unavailable.

Completion outcome: The user can scroll through the current batch and receive more puzzles without an abrupt feed interruption.

### B6. Hints and puzzle detail UI

- [ ] Add the static hint interaction to the puzzle card and render the returned stored hint.
- [ ] Track hint use through the backend response/attempt flow where available.
- [ ] Add a dynamic hint entry point only as a placeholder UI that calls the backend boundary.
- [ ] Display the backend’s unavailable/retryable response without blocking solving or scrolling.
- [ ] Do not implement AI logic, prompts, or model calls in the client.

Completion outcome: Static hints work. Dynamic hints show a clear unavailable state until the AI integration is supplied.

### B7. Stats, daily puzzle, and leaderboard screens

- [ ] Implement the Stats screen using the backend’s documented statistics response. Treat mockup badges, weekly trends, and insight cards as future work until their data is specified.
- [ ] Include the daily puzzle entry/completion state in the agreed simple form.
- [ ] Implement the global leaderboard screen using public response fields only.
- [ ] Implement loading, empty, and retry states for these screens.
- [ ] Keep the Profile screen limited to agreed public profile details.

Completion outcome: The app displays persisted user stats and a global XP leaderboard without exposing private fields.

### B8. Teammate B handoff

- [ ] Publish feed endpoint and Redis queue setup details for Teammate A.
- [ ] Publish the client’s expected API base URL and required environment variables.
- [ ] Notify Teammate A before changing any shared contract field.

## 6. Integration milestones

Complete these in order. A milestone is ready when its behavior can be shown end to end.

### Milestone 1 — Local foundation

- [ ] Teammate A: API and PostgreSQL start locally.
- [ ] Teammate B: Client starts on web and Android development target.
- [ ] Both: Client can reach the local API using the shared configuration.

### Milestone 2 — Account and first feed

- [ ] Teammate A: Account/profile and current puzzle catalog APIs are available.
- [ ] Teammate B: Sign-in and profile flow are connected.
- [ ] Teammate B: Feed endpoint returns an ordered batch of client-safe current puzzles.
- [ ] Both: Confirm canonical solutions are absent from feed responses.

### Milestone 3 — Solve and scroll

- [ ] Teammate A: Answer, skip, and expired-content behavior are available.
- [ ] Teammate B: Puzzle card supports vertical paging, submission, feedback, skip, and continue.
- [ ] Both: Confirm stale content is rejected before verification and does not award XP.

### Milestone 4 — Queue and hints

- [ ] Teammate B: Redis queue stores stable IDs per user and refills through the difficulty adapter.
- [ ] Teammate A: Static hint endpoint reads hints stored with the puzzle.
- [ ] Both: Confirm Redis loss can be recovered without losing durable user data.
- [ ] Both: Confirm dynamic hints remain available only through the placeholder boundary.

### Milestone 5 — Progress and leaderboard

- [ ] Teammate A: XP, daily completion, streak, stats, and global leaderboard APIs are available.
- [ ] Teammate B: Stats, daily puzzle, and leaderboard screens display the API data.
- [ ] Both: Confirm duplicate answer requests cannot award XP more than once.

### Milestone 6 — Content rotation

- [ ] Teammate A: Fixed-time rotation updates one existing puzzle ID at a time.
- [ ] Teammate A: Rotation writes the outgoing snapshot to the archive, preserves ID/difficulty/domain/audience categories, replaces current content/solution/hints, and increments contentVersion.
- [ ] Teammate B: After a catalogGeneration change, the next batch request replaces only undelivered queued IDs; already returned cards remain unchanged.
- [ ] Both: Confirm old displayed versions receive the expired response and the client lets the user continue.
- [ ] Both: Confirm the archive receives the outgoing snapshot and the live catalog remains exactly 3,000 records.

## 7. Inputs required from other workstreams

The following are dependencies, not implementation tasks for these two teammates:

- [ ] The initial 3,000 puzzle records are inserted later with content, canonical solution, static hints, per-puzzle difficultyRating, domain, and audience categories.
- [ ] The puzzle-generation engine supplies replacement content; before rotation is implemented, define payload validation and mapping to the selected existing catalog ID.
- [ ] The puzzle-generation workstream defines the first puzzle type and answer format later so the backend can implement its verifier and the client can render its controls.
- [ ] Difficulty owner supplies the complete Glicko-2/Thompson selection and outcome contracts, including category eligibility and content-version statistics.
- [ ] AI owner supplies a dynamic-hint integration contract and service. Until then, retain only the placeholder/unavailable behavior.
- [ ] Product/team selects the authentication approach and confirms the audience-category setup and fixed rotation interval.

## 8. Prototype completion checklist

- [ ] User can create/sign into an account and provide the agreed audience-category profile data.
- [ ] User receives a personalized batch and can scroll through full-screen puzzle cards.
- [ ] User can submit an answer and see correct or incorrect.
- [ ] User can swipe past a puzzle; it is treated as skipped.
- [ ] Static hints are loaded from the puzzle record.
- [ ] Dynamic hints remain behind the placeholder boundary.
- [ ] The backend records attempts and awards XP only for verified correct answers.
- [ ] Stats and the global leaderboard use backend-persisted data.
- [ ] The feed uses a per-user Redis queue of stable puzzle IDs and loads current content from PostgreSQL.
- [ ] The current catalog contains exactly 3,000 puzzle records.
- [ ] Scheduled rotation archives the outgoing snapshot, changes content for one existing puzzle ID at a time, preserves ID/difficulty/domain/audience categories, and increments the content version.
- [ ] After five successful content updates, catalogGeneration increments; each user's next batch request reselects only undelivered IDs if its saved generation is stale.
- [ ] A stale displayed puzzle is rejected as expired, is not verified, and awards no XP; the client lets the user continue.
- [ ] No retired puzzle content is kept in the live database; rotated snapshots are stored in the separate archive dataset.

## 9. Not part of this prototype

- AI model, prompts, training, evaluation, or dynamic-hint generation internals.
- Glicko implementation or difficulty-selection algorithm internals are owned by the difficulty workstream, but their complete public integration is required.
- Puzzle creation/generation internals.
- Friends or additional audience-category leaderboards.
- Library, share button, or fast-forward button.
- Admin dashboard, unless the team later decides it is needed; a controlled seed/rotation command is enough initially.
- Separate NoSQL puzzle database or Redis leaderboard cache unless a measured need appears.
