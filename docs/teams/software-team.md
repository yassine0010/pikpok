# Software Team

The Software Team file has separate Backend and Frontend ownership sections. User identity, verification, and answer correctness stay on the Backend; presentation and interaction stay on the Frontend.

## Backend

### What you own

- Signup age validation and persistent audienceCategory values CHILDREN and YOUNG_ADULTS.
- A private profile field neurodivergentMode, default false, set by the user or an authorized guardian and never inferred.
- Database age filters before candidate metadata reaches the Difficulty Module.
- Puzzle catalog, private verification storage, generic answer comparators, API responses, hint and answer records.
- Image publication, local live/archive storage, current-image DB pointer, versioned media endpoint, and rotation orchestration.
- Publication validation: accept only presentation IMAGE. Reject INTERACTIVE and every unrecognized value.

### What you output

- Public feed cards with presentation IMAGE, locale en, structured prompt/clue text, image URL, accessibilityText, answer input descriptor, and hints as separate fields.
- Private owner-authenticated profile data may include neurodivergentMode so the account can apply its settings. Do not include the flag in feed cards, leaderboard, public user data, analytics payloads, or another user's response.
- Answer results with correct/incorrect and scoring only. Never return canonicalAnswer, acceptedAnswers, or verification.

### What you receive

- Certified puzzle JSON and a rendered image manifest from Content Generation.
- Age policy and candidate-selection interfaces from the Difficulty Module.
- Frontend feed, answer, skip, hint, and private profile-setting requests.

### Answer verification

Load the current puzzle and verify contentVersion before comparison. Select a generic comparator using only the private verification.answerType. Do not branch on puzzle type.

All verification values are strings. Use the shared vector files for NUMBER, NUMBER_LIST, LABEL, LABEL_LIST, and OPERATOR. Normalize only harmless formatting and explicitly accepted forms. Never use fuzzy matching. A malformed request returns INVALID_ANSWER_FORMAT; a valid mismatch records an incorrect attempt without revealing the solution.

### Local image storage and rotation

- Current image: ./.local/images/live/{puzzleId}/v{contentVersion}.png
- Replaced version archive:
  - ./.local/images/archive/{puzzleId}/v{contentVersion}/image.png
  - ./.local/images/archive/{puzzleId}/v{contentVersion}/puzzle.json

The DB stores the current live key. Write each new version with create-exclusive semantics; never overwrite a version path. Before changing the DB pointer, validate the new puzzle, image checksum, and accessibilityText; append the replaced image and complete private puzzle JSON to the archive; then publish the new live image. Update the DB pointer transactionally. Keep the old live file until the pointer commit succeeds, then remove it. Retries must be idempotent.

The rotation worker generates and stores images before publishing puzzle versions. Feed requests never invoke image generation. Treat contentVersion as the version of the entire published package; any content, prompt, accessibility, or image-template change increments it.

### Backend error behavior

- Unsupported age: AGE_NOT_SUPPORTED; never reclassify.
- Unsupported presentation at publication: PRESENTATION_NOT_SUPPORTED; leave the current version live.
- Stale answer contentVersion: PUZZLE_CONTENT_EXPIRED; do not grade.
- Image unavailable during feed: omit the card and select another eligible card. Never return a card with a broken or missing image.
- Invalid image or archive write: fail the rotation and retain the current DB pointer.

### Backend mocks until other teams deliver

- Use fixture puzzle JSON with private verification blocks.
- Use a placeholder PNG image and deterministic manifest.
- Use a deterministic difficulty selector and pure age policy.
- Use a temporary local directory for storage contract tests.

### Backend definition of done

- Only CHILDREN and YOUNG_ADULTS are accepted audience values and age validation matches the contracts.
- neurodivergentMode defaults false, is private, and changes no feed selection.
- The comparator registry is keyed only by answerType and passes every shared vector.
- Verification is absent from every public response and never reaches the image renderer.
- Publication rejects all presentation values except IMAGE.
- Rotation writes immutable version paths, archives the replaced image and private puzzle JSON, and only changes the DB pointer after validation.
- Feed/media serving returns the current image for the current contentVersion.
- Failures retain the previous published image and puzzle.

## Frontend

### What you own

- Feed card display, answer entry, hint display, screen-reader behavior, retry/skip behavior, and profile settings UI.
- Display the image as the puzzle visual. Render prompt, scenario, written clues, hints, and answer input as separate native text/UI fields.
- Apply neurodivergentMode settings: larger hint text and answer box, reduced motion, calmer styling, and no timers.

### What you output

- Feed requests with no user ID.
- Answer submissions with puzzle ID, contentVersion, interaction ID, and submitted answer string.
- Skip requests for skipped cards.
- Hint-tier requests.
- Private profile-setting updates initiated by the user or authorized guardian.

### What you receive

- Public PuzzleCard fields only. Never expect answerType or verification.
- accessibilityText that describes the visual information required to solve the puzzle.
- A private, authenticated owner profile response containing neurodivergentMode for app settings.

### Image and accessibility behavior

- Display prompt and written clues beside the image as scalable native text; do not rasterize them into the image.
- Use accessibilityText as the image's screen-reader description. The screen-reader order is prompt/clues, image description, answer control, then revealed hints.
- The visual puzzle itself remains the generated image. Do not draw a replacement puzzle from JSON.
- On image load failure, retry once. If it still fails, submit a skip, remove the card, and request another feed card. Do not submit an answer for a failed image.
- If presentation is IMAGE, render the image card. Skip INTERACTIVE and any unknown presentation value without crashing; report the unsupported card and request another.
- Hints and answer entry remain separate from the image. The client never grades or compares answers.

### Frontend mocks until other teams deliver

- Use the checked-in placeholder image and fixture PuzzleCard.
- Use a fake answer endpoint that returns correct/incorrect without locally inspecting the submission.
- Use fixture hints and a private profile fixture with neurodivergentMode false/true.
- Simulate image load failure to verify one retry followed by skip and refetch.

### Frontend definition of done

- Prompt and clues render as native text next to the image; accessibilityText is attached to the image.
- Hints and answer input are separate controls.
- neurodivergentMode changes only the specified app settings and is not included in public request payloads.
- Failed images retry once, then skip and request a replacement card.
- Unsupported presentation values are skipped safely.
- The client never receives verification or performs answer checking.

## Backend: concrete request lifecycles and integration

### Persistence boundary

Recommended service ownership:

- SignupService validates request shape, calls age classification, and persists only a supported audience.
- QueueService queries and hard-filters eligible records, calls DifficultyAdapter, verifies returned IDs, reserves feed items, and maps public cards.
- AnswerService performs version/idempotency checks, invokes the generic comparator, and commits Attempt, XP/streak effects, and OutboxEvent atomically.
- RotationService owns the job state machine and coordinates ContentGenerationAdapter, StorageAdapter, and catalog DB transaction.
- HintService validates current contentVersion, returns the requested tier, and records usage.
- ProfileSettingsService updates the private neurodivergentMode field for the authenticated owner.
- MediaService resolves versioned IDs to the current local file; it never returns a raw machine filesystem path.

### Feed request trace

~~~text
HTTP GET /feed
  → authenticate token
  → read audience and per-domain rating state
  → SQL query: only published + audience/age eligible + IMAGE + en + current image
  → DifficultyAdapter.select(eligible IDs and metadata)
  → validate ordering, reserve cards
  → explicit internal-to-public mapper
  → JSON response
~~~

If SQL returns no candidates, return an empty batch. If the difficulty module fails, preserve the eligible set and order it by target-distance then stable puzzle ID. If an asset is missing, mark that catalog item unavailable and exclude it; never emit a broken URL as a normal card.

### Answer request trace

~~~text
HTTP POST /answer
  → authenticate
  → parse string payload and interactionId
  → look up prior interactionId
      same payload: return saved response
      different payload: IDEMPOTENCY_CONFLICT
  → check puzzle contentVersion is current
      mismatch: PUZZLE_CONTENT_EXPIRED, no writes
  → load private verification
  → compareAnswer(answerType, submittedAnswer, verification)
  → one DB transaction: Attempt + XP/streak + OutboxEvent
  → return result with no expected answer
  → outbox worker sends rating event after commit
~~~

The comparator gets answerType and strings only. It does not get puzzle type or content fields. Do not store rejected/malformed raw submissions in telemetry; retain only safe operational diagnostics unless a separately reviewed retention policy permits more.

### Rotation transaction and startup recovery

The process has independent filesystem and SQL durability, so use the explicit rotation job and state transitions from docs/contracts.md. On startup or periodic maintenance, inspect jobs stuck after each state:

- STAGED with no DB reference: retry archive/promotion or clean only after checking the job.
- ARCHIVED with no DB commit: old version remains live; retry same job.
- DB_COMMITTED with old image still live: run cleanup.
- Unknown checksum/key collision: quarantine and require operator repair; never overwrite.

The current DB pointer is the authority for feed selection. Archive is the recovery record, not a serving fallback. When the current image URL returns 404/410, Frontend handles retry/skip; Backend does not silently serve an archived version for a new contentVersion.

### API and DB work before client integration

Publish OpenAPI and common API schemas before route implementation. Add database constraints/migrations for supported audience values, 800–2000 puzzle rating, contentVersion, current image pointer/checksum, private verification storage, locale, and publication state. Seed one valid image-backed fixture per active puzzle type and both audiences according to the agreed map.

## Frontend: concrete component and state behavior

### Card state

Recommended card state machine:

~~~text
RECEIVED → VALIDATED → IMAGE_LOADING → READY → ANSWER_PENDING → ANSWERED
                           ↓ error 1
                      IMAGE_RETRY
                           ↓ error 2
                       SKIPPING → REFILL
RECEIVED with unknown presentation → SKIPPING → REFILL
READY with stale response → EXPIRED → REFILL
~~~

An unsupported card must not crash the list. Skip/refill is idempotent by interactionId. A retry uses the same image URL and keeps the card's contentVersion. Do not allow answer submission until the image has loaded successfully.

### Accessibility and layout

Render the prompt and clue blocks as native text adjacent to the image. Set the image accessibility label from accessibilityText. Do not duplicate the entire prompt into accessibilityText unless it is needed to describe visual content; assistive technology should encounter prompt text and visual description as separate content.

When neurodivergentMode is enabled, use shared UI tokens for larger hint and answer-box text, calmer styling, reduced motion, and timer suppression. Keep prompt text at the normal native platform scaling behavior for v1. Do not derive a puzzle type, image template, recommendation, or API request from the flag.

### Frontend behavior under common failures

- Empty feed: show a retryable empty state without spinning indefinitely.
- Unknown presentation: skip this card and continue; do not fail the batch.
- Image fails once: retry once; if it fails again, disable answer and skip/refill.
- Version expires during answer/hint: discard the stale card and fetch replacement.
- Answer timeout: retry same payload and interactionId; never generate a second ID for an uncertain request.
- Hint unavailable: keep the image/prompt visible and show a non-blocking message.
- Profile settings unavailable: keep default settings and do not infer neurodivergentMode.

## Software Team main-codebase merge checklist

The current common/types/puzzle.types.ts is a legacy source, not an implementation-ready v1 contract. Keep a compatibility migration focused and reviewable:

1. Add common runtime schemas and new types alongside legacy exports.
2. Update API response/request types and fixtures to the new schemas.
3. Update database migration and seed fixtures.
4. Move Backend route/service code to new types.
5. Move Frontend to PublicPuzzleCard and remove old per-type render/check paths from active feed.
6. Remove legacy TEENS, rating range/center, and per-type verification interfaces only after imports are migrated.
7. Reconcile docs/implementation-contract.md and docs/milestones.md after code behavior matches the accepted contract.

Merge Backend routes against common mocks first. Merge actual Content Generation and Difficulty Module adapters behind the same signatures. The final integration PR should contain composition, seed data, local configuration, and a walkthrough—not duplicate module implementations.

### Expanded Software Team definition of done

A reviewer can trace a local user through supported signup, feed filtering, versioned image load, answer comparison, durable rating event, hint use, private settings, and content rotation. A failure at any boundary produces the documented retry/skip/stale behavior without leaking verification, exact age, audience internals, or neurodivergentMode.

