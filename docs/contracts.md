# PikPok Shared Contracts

This document is the active v1 contract for Content Generation, the Difficulty Module, and the Software Team. The current user decisions below supersede older conflicting project documents. Existing implementation source files still require migration to these contracts.

Legend:

- **User decision** means explicit direction for this version.
- **Selected default** means a recommended technical choice used to make the contract concrete.
- **Repository fact** records an existing document statement; citations identify its source.

## Resolved source conflicts

| Topic | Repository fact and source | V1 resolution |
|---|---|---|
| Audience categories | project.md §Users and implementation-contract.md §§1.2–1.4 use CHILDREN and TEENS; the type definitions also use those two values. | Use only CHILDREN and YOUNG_ADULTS with the exact age bounds in this contract. neurodivergentMode is a private app setting, not an audience category. |
| Puzzle type audience mapping | The five-type guide overview maps Scheduling/Order, One-True-Statement, and Constrained Route to young adults; the detailed generation schemas map them to teens. | Use the five-type guide mapping to YOUNG_ADULTS. This is selected explicitly because the new v1 audience set has no teen category and ages 14–16 are unsupported. |
| Image presentation | The five-type guide says images are optional and its route section describes app rendering; architecture.md §3.1 describes per-type client renderers. | Every v1 puzzle uses IMAGE. The image is the visual display; prompt prose is structured text beside it. Frontend has no app-drawn puzzle fallback. |
| Answer verification | architecture.md §3.5 dispatches a verifier by puzzle type; puzzle.types.ts defines per-type verification interfaces. | Use private verification keyed by answerType and generic comparators. No per-puzzle-type grading code. |
| Rating scale | project.md FR-12 and architecture.md §3.6 use a wider range and a different center; the legacy difficulty recap §5.1 includes a different example starting rating. | Use catalog/selection scale 800–2000, start at 1400, RD 350, volatility 0.06, and tau 0.5. |
| Storage | architecture.md §§3.4 and 4.3 describe JSON-only local archive snapshots; open-decisions.md D-14 proposes object storage. | For the prototype, use the local live image store and append-only archive containing replaced images plus puzzle JSON. Cloud is a later adapter migration. |
| Neurodivergent support | project.md Users and M7 defer the feature; architecture.md previously described a future profile. | neurodivergentMode is active in v1 as a private app setting only. It never changes puzzle selection and makes no diagnosis claims. |

## 1. Audience and profile

### Audience values and age eligibility

| AudienceCategory | Supported completed ages | Puzzle age bounds |
|---|---:|---:|
| CHILDREN | 7–13 | ageFloor 7, ageCeiling 13 |
| YOUNG_ADULTS | 17–25 | ageFloor 17, ageCeiling 25 |

**User decision:** Ages 14–16 and all ages outside 7–13 and 17–25 return AGE_NOT_SUPPORTED. Do not reclassify them. Age 13 belongs to CHILDREN; age 17 belongs to YOUNG_ADULTS.

**Selected default:** At signup, accept integer ageYears for eligibility validation, derive audienceCategory, and persist only the category rather than date of birth or exact age. Do not expose audienceCategory in public feed cards, public profile data, or leaderboard responses.

### neurodivergentMode

- Private profile boolean; default false.
- Set by the user or an authorized guardian; never inferred from behavior or age.
- Makes no diagnostic or treatment claims.
- Changes app settings only: larger hint text and answer box, reduced motion, calmer styling, and no timers.
- Does not change puzzle eligibility, content, type, ranking, or recommendation.
- Never appears in public responses, feed cards, leaderboard data, analytics payloads, or responses for another user.
- **Selected default:** The authenticated owner profile response may return the flag to that same user's app so settings persist. The exact guardian authorization flow remains subject to privacy review.

## 2. Active puzzle audience map

| PuzzleType | AudienceCategory | AnswerType |
|---|---|---|
| NUMBER_SEQUENCE | CHILDREN | NUMBER or NUMBER_LIST |
| MISSING_OPERATOR | CHILDREN | OPERATOR, NUMBER, or NUMBER_LIST |
| SCHEDULING_ORDER | YOUNG_ADULTS | LABEL_LIST |
| ONE_TRUE_STATEMENT | YOUNG_ADULTS | LABEL |
| CONSTRAINED_ROUTE, minimum-move answer | YOUNG_ADULTS | NUMBER |

**Repository fact:** The five-type overview assigns Scheduling/Order, One-True-Statement, and Constrained Route to young adults, while the detailed legacy schemas assign them to teens. Sources: [five-type guide, overview and §§2, 4–5](./../puzzle-types-and-generation-guide.md) and [generation guidelines, Types 3–5](./../old%20work/puzzle%20generation/PUZZLE_GENERATION_GUIDELINES_AND_SCHEMA.md).

**Selected default:** Use the five-type overview for v1. The detailed teen mapping is superseded because the active audience list has no teen category and ages 14–16 are unsupported. This is an explicit recorded resolution, not an unmarked source preference.

## 3. Internal puzzle JSON

Every generated and published puzzle has presentation IMAGE and locale en. The enum keeps INTERACTIVE reserved, but it is inactive in v1.

~~~json
{
  "id": "sequence-001",
  "contentVersion": 1,
  "type": "NUMBER_SEQUENCE",
  "presentation": "IMAGE",
  "locale": "en",
  "domain": "math",
  "difficultyRating": 1280,
  "ageFloor": 7,
  "ageCeiling": 13,
  "audienceCategories": ["CHILDREN"],
  "fingerprintHash": "sha256-structure-hash",
  "content": {
    "textBlocks": [
      {"role": "prompt", "text": "Find the missing number."}
    ],
    "visualData": {
      "kind": "sequence",
      "terms": [4, 7, 10, null, 16]
    },
    "answerInput": {
      "kind": "text",
      "placeholder": "Enter the number"
    }
  },
  "accessibilityText": "A horizontal row shows 4, 7, 10, a blank, and 16.",
  "staticHints": [
    {"tier": 1, "type": "guiding_question", "text": "What changes between the numbers?"}
  ],
  "verification": {
    "answerType": "NUMBER",
    "canonicalAnswer": "13",
    "acceptedAnswers": ["13"]
  }
}
~~~

Contract rules:

- content.textBlocks carry the prompt, scenario, written clues, and other readable puzzle prose as structured text beside the image.
- content.visualData carries the diagram, sequence layout, grid, labels, or symbols used to render the visual image.
- The image template renders visualData only. It does not render prompt prose, written clues, hints, explanations, answer controls, or feedback.
- accessibilityText describes the visual information needed by a screen reader. It is public, separate from the image pixels, and must agree with visualData.
- answerInput describes the separate Frontend control.
- verification is private, server-only, and mandatory.
- Content Generation owns the verification values and certifies uniqueness. The Backend compares submissions; it does not recertify puzzle uniqueness.
- All answer values, canonicalAnswer and each acceptedAnswers entry are strings.
- locale is exactly en in v1.
- audienceCategories only permits CHILDREN and YOUNG_ADULTS.
- difficultyRating is an integer from 800 through 2000.

## 4. Presentation and image contract

### Presentation enum

| Value | Status | Backend publication | Frontend |
|---|---|---|---|
| IMAGE | Active v1 | Accept after image/schema validation | Display the image card |
| INTERACTIVE | Reserved, not active | Reject with PRESENTATION_NOT_SUPPORTED | Skip and request another card |
| Unknown future value | Unsupported | Reject | Skip safely without failing |

Interactive puzzles are excluded from v1; no interactive configuration or answer schema is defined here.

### Prompt-text decision

**Selected default:** deliver prompt, scenario, and written clues as structured text beside the image; only the visual puzzle component is inside the image.

Effects:

- **Image templates:** English-only deterministic templates render the visual data and any labels/numbers that are part of that visual. They do not render prose instructions or clues. Select a template by puzzle type and audience; locale is fixed to en. Store templateId and templateVersion in the internal image manifest, not the puzzle JSON.
- **JSON schema:** textBlocks, visualData, accessibilityText, and answerInput are separate fields. The generated puzzle has no template ID, style ID, or asset URL. The image module returns an ImageManifest with media type, checksum, template version, and staging reference.
- **Frontend:** prompt and clues are rendered as native text beside the image. accessibilityText describes the image for screen readers. Hints and answer input are also separate. neurodivergentMode retains exactly its defined settings and does not enlarge prompt text in v1; the prompt remains native, platform-accessible text rather than text baked into an image.

**Selected default:** render PNGs deterministically from templates. Do not use text-generative raster models for puzzle content.

### Image contents and failures

Images must never contain verification, answers, hints, explanations, answer input, correctness feedback, difficulty/rating data, telemetry, or user data. accessibilityText is not a substitute for hidden verification and must describe only what a user needs to perceive.

On load failure, retry once. If the retry fails, the Frontend skips the card, records the skip, and requests another card. There is no app-drawn fallback renderer and no answer submission for the failed card.

## 5. Verification and answer checking

### Verification schema

~~~json
{
  "answerType": "LABEL_LIST",
  "canonicalAnswer": "A,B,C,D",
  "acceptedAnswers": ["ABCD", "A,B,C,D", "A B C D"]
}
~~~

The Backend chooses a comparator only from verification.answerType. There is no per-puzzle-type grading code. Content Generation owns this block and certifies exactly one intended solution. The block is absent from image-renderer input, feed responses, hints, logs, and public errors.

| answerType | Accepted string meaning | Normalization |
|---|---|---|
| NUMBER | One numeric value | Trim whitespace; parse finite decimal; compare numeric value |
| NUMBER_LIST | Ordered numeric values | Parse documented comma/space separators; compare values and order |
| LABEL | One label | Unicode normalization, trim, case-fold, exact canonical/accepted membership |
| LABEL_LIST | Ordered labels | Normalize tokens and separators; preserve order; exact membership |
| OPERATOR | One supported operator symbol | Normalize defined symbol variants; exact canonical/accepted membership |

No fuzzy matching. List order is significant. Content Generation must include all permitted formatting variants in acceptedAnswers. Invalid syntax returns INVALID_ANSWER_FORMAT; a valid non-match is incorrect. Unsupported answerType rejects the puzzle at publication.

### Shared test vectors

Create one file per answerType at:

~~~text
common/test-vectors/NUMBER.json
common/test-vectors/NUMBER_LIST.json
common/test-vectors/LABEL.json
common/test-vectors/LABEL_LIST.json
common/test-vectors/OPERATOR.json
~~~

Each file contains accepted and rejected submissions, normalization cases, malformed cases, and expected comparator outcomes. Both Content Generation and Backend consume the same vectors. No additional answer type is added for deferred interactive puzzles.

## 6. Difficulty contract

**Selected defaults:**

- Catalog puzzle difficultyRating range: 800–2000 inclusive.
- New user/domain Glicko rating: 1400.
- Rating deviation: 350.
- Volatility: 0.06.
- Tau: 0.5.
- One accepted answer event is one rating period for the prototype, matching the existing per-answer update flow.
- The raw Glicko estimate is unbounded; clamp the candidate-selection target to 800–2000. Reject puzzle catalog values outside the range.
- Centered Glicko conversion: mu = (rating - 1400) / 173.7178; phi = RD / 173.7178; reverse with rating = 173.7178 × mu + 1400.

**Repository facts:** The existing product and architecture docs use a different Glicko center and a wider puzzle range; the legacy difficulty recap uses 1200 as a new-user example and formula baseline. Sources: [project.md FR-12](./project.md), [architecture.md §3.6](./architecture.md), and [Age/Difficulty Recap §§5.1 and 6](./old%20work/difficulty%20module/Age_Difficulty_Generation_Engines_MASTER_Recap.md).

**Resolution:** Use 1400 as the v1 initial player rating and center. Formula baselines such as 1200 remain valid values within the new puzzle range; clamp/reject generated catalog ratings outside 800–2000. For historical player Glicko rows, subtract 100 from rating to move the origin while preserving RD and volatility. For historical puzzle scores, recalculate from structural metadata; if unavailable, map old values with newRating = 800 + 0.5 × (oldRating - 400), then flag the record for calibration.

The Glicko reference describes standard initialization and conversion; these defaults are deliberately shifted to the selected 1400 center. See the [Glicko-2 reference](https://www.glicko.net/glicko/glicko2.pdf).

## 7. Module interfaces

Every call below is synchronous at the module boundary unless stated otherwise. Puzzle generation, rendering, and storage run in a background rotation job and never block a feed request.

| Caller → callee | Input → output example | Errors | Mode |
|---|---|---|---|
| Backend rotation worker → Content Generation puzzle generator | Input: {"puzzleId":"sequence-001","contentVersion":2,"type":"NUMBER_SEQUENCE","audienceCategory":"CHILDREN","targetRating":1400,"locale":"en","presentation":"IMAGE"}. Output: full internal puzzle JSON with private string verification and unique-solution certification metadata. | Unsupported type/audience; schema error; duplicate; no unique solution. Reject candidate and retain current version. | Sync call in background rotation job. |
| Content Generation puzzle generator → Content Generation image renderer | Input: {"id":"sequence-001","contentVersion":2,"presentation":"IMAGE","locale":"en","type":"NUMBER_SEQUENCE","audienceCategory":"CHILDREN","visualData":{"kind":"sequence","terms":[4,7,10,null,16]}}. Output: {"mediaType":"image/png","sha256":"…","templateId":"number-sequence","templateVersion":1,"stagingKey":"…"}. | Missing visual data; unsupported template; render overflow; checksum failure. Fail rotation. | Awaited sync call in background rotation job. The input excludes verification and hints. |
| Backend → Difficulty Module age policy | Input: {"ageYears":14}. Output: {"error":{"code":"AGE_NOT_SUPPORTED"}}. Input age 13 returns {"audienceCategory":"CHILDREN"}. | Non-integer or unsupported age → AGE_NOT_SUPPORTED; no reclassification. | Sync at signup; Backend does not persist exact age by default. |
| Backend QueueService → Difficulty Module selector | Input: {"targetRating":1400,"batchSize":5,"candidates":[{"puzzleId":"sequence-001","contentVersion":2,"domain":"math","difficultyRating":1280,"audienceCategory":"CHILDREN"}]}. Output: {"orderedPuzzleIds":["sequence-001"]}. | Invalid metadata/module unavailable. Backend fallback must use current age-eligible content only. | Sync during feed refill after DB eligibility filtering. |
| Backend rotation worker → Local storage and DB | Input: {"puzzleId":"sequence-001","oldVersion":1,"newVersion":2,"imageRef":"staging/…","newPuzzle":{…}}. Output: {"liveKey":"sequence-001/v2.png","currentVersion":2}. | Disk full, key conflict, invalid checksum, archive/DB failure. Keep old pointer and retry idempotently. | Sync steps in background rotation workflow. |
| Frontend → Backend GET /feed | Input: GET /feed?size=5. Output card: {"id":"sequence-001","contentVersion":2,"type":"NUMBER_SEQUENCE","presentation":"IMAGE","locale":"en","difficultyRating":1280,"textBlocks":[{"role":"prompt","text":"Find the missing number."}],"image":{"url":"/media/puzzles/sequence-001/v2.png","mediaType":"image/png"},"accessibilityText":"A row shows 4, 7, 10, a blank, and 16.","answerInput":{"kind":"text","placeholder":"Enter the number"},"staticHints":[…]}. | Auth error, no supported-age catalog, insufficient valid images. Never return verification or neurodivergentMode. | Sync HTTP. |
| Frontend → Backend POST /answer | Input: {"puzzleId":"sequence-001","contentVersion":2,"interactionId":"uuid","submittedAnswer":"13"}. Output: {"correct":true,"xpAwarded":10}. | Stale version → PUZZLE_CONTENT_EXPIRED; malformed string → INVALID_ANSWER_FORMAT; unsupported stored answerType is an integrity error. | Sync HTTP. |
| Frontend → Backend GET /hints/{puzzleId} | Input: puzzle ID, contentVersion, requested tier. Output: {"tier":1,"text":"What changes between the numbers?"}. | Stale version, unknown puzzle, or unavailable tier. Hint is separate text, never image content. | Sync HTTP. |
| Frontend → Backend POST /feed/skip | Input: {"puzzleId":"sequence-001","contentVersion":2,"interactionId":"uuid"}. Output: {"recorded":true}. | Stale version or auth error. Skip has neutral difficulty effect. | Sync HTTP after the image retry fails. |
| Frontend → Backend private profile settings | Input: PATCH /profile/settings with {"neurodivergentMode":true}. Output is available only in that authenticated owner's profile response. | Unauthorized actor or failed guardian authorization. Do not expose flag in public responses or other users' records. | Sync HTTP. |

## 8. End-to-end flows

### Feed request

1. Frontend requests a batch; it sends no user ID or neurodivergentMode.
2. Backend reads the private profile's audienceCategory.
3. Difficulty Module policy is applied; Backend hard-filters the DB catalog before ranking.
4. Difficulty Module returns ordered IDs based on metadata and the clamped target.
5. Backend verifies each current record has presentation IMAGE and a current image pointer.
6. Backend returns public text, image URL, accessibilityText, answer input, and separate hints. It excludes verification, audience category, age fields, and neurodivergentMode.
7. If an image fails to load, Frontend retries once, records a skip, and requests another card.

### Answer submission

1. Frontend submits puzzle ID, contentVersion, interaction ID, and answer string.
2. Backend rejects stale contentVersion before loading the comparator.
3. Backend loads private verification and dispatches by answerType only.
4. Backend records correct/incorrect and XP; it sends accepted outcome metadata to the Difficulty Module.
5. Response contains no canonical answer or verification details.

### Content rotation and publication

1. Background worker requests replacement content for an existing stable puzzle ID and next contentVersion.
2. Content Generation emits a schema-valid IMAGE puzzle, English locale, structured text and visual data, private string verification, hints, accessibilityText, and uniqueness certification.
3. Content Generation renders a deterministic PNG from visualData only and returns its checksum and template manifest.
4. Backend validates presentation, audience, age bounds, rating, verification shape, image checksum, and accessibilityText.
5. Backend appends the replaced full private puzzle JSON and image to the archive.
6. Backend writes the new image to its unique live version path without overwrite.
7. Backend commits the puzzle data and current image pointer in the DB. Only after commit does it remove the former live image.
8. On failure, retain the old DB pointer and image; retries are idempotent. Never delete or overwrite archive files.

### Hint request

1. Frontend requests a hint tier for the current puzzle ID and version.
2. Backend checks version and tier, records hint use, and returns hint text.
3. Frontend presents the hint separately from the image. Hints never modify or regenerate the image.

## 9. Local storage and cloud migration

Prototype layout:

~~~text
.local/images/live/{puzzleId}/v{contentVersion}.png
.local/images/archive/{puzzleId}/v{contentVersion}/image.png
.local/images/archive/{puzzleId}/v{contentVersion}/puzzle.json
~~~

Live contains only the current image for each puzzle. Archive is append-only and receives every replaced image plus the corresponding complete private puzzle JSON. The DB points to the current live key. Version paths are immutable; an existing path with a different checksum is a conflict, not an overwrite. Temporary render files are transient staging artifacts and are not a third durable store.

Later cloud migration keeps the storage adapter and logical keys. Copy files, verify checksums, switch DB pointers, then serve live images through an authorized media endpoint/CDN. Configure archive objects as immutable. Keep the local copy until verification and rollback are complete.

## 10. Repository, tests, and architecture documentation

Suggested structure:

~~~text
apps/api/
apps/client/
common/
  schemas/
  test-vectors/
apps/api/src/generation/puzzle/
apps/api/src/generation/image/
apps/api/src/difficulty/
apps/api/src/adapters/storage/
docs/teams/content-generation.md
docs/teams/difficulty-module.md
docs/teams/software-team.md
docs/contracts.md
~~~

Contract work:

- Use JSON Schema as the runtime/shared contract, with generated TypeScript types. Runtime validation is required at generation ingestion, publication, and API boundaries.
- Contract tests use fixture providers and the shared answer vector files. Provider and consumer teams can work independently.
- Stub image provider returns a valid placeholder PNG and manifest. Fixture content provider returns certified samples. Selector stub returns deterministic IDs. Local storage adapter uses a temporary directory in tests.
- Assert every public response lacks verification, neurodivergentMode, audience category, and age fields.
- Assert the image-renderer input lacks verification and hints, and publication rejects non-IMAGE values.

### ARCHITECTURE.md outline

1. Active audience, privacy, rating, and presentation decisions.
2. System context and repository structure.
3. Ownership and module boundaries.
4. Internal/private and public puzzle schemas.
5. Feed, answer, hint, skip, and rotation flows.
6. Image rendering, accessibility, retry, and skip behavior.
7. Local live/archive lifecycle, recovery, and future cloud adapter.
8. Security and profile-setting privacy.
9. Deferred: interactive puzzles.

### ADR list

- Audience bounds, unsupported ages, and account age handling.
- neurodivergentMode privacy and user/guardian authorization.
- Resolution of legacy puzzle-type audience mappings.
- 800–2000 scale and Glicko initialization.
- Private answer verification and answerType comparator behavior.
- IMAGE presentation, prompt text sidecar, and accessibility text.
- English-only deterministic template selection and image format.
- Versioning, local storage paths, rotation ordering, and cloud adapter.

### OpenAPI skeleton

~~~yaml
openapi: 3.1.0
paths:
  /feed:
    get:
      responses:
        "200":
          description: Batch of public IMAGE puzzle cards
  /answer:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/AnswerSubmission"
      responses:
        "200": {description: Correct or incorrect result}
  /hints/{puzzleId}:
    get:
      responses:
        "200": {description: One separate hint tier}
  /feed/skip:
    post:
      responses:
        "200": {description: Skip recorded}
  /media/puzzles/{puzzleId}/v{contentVersion}.png:
    get:
      responses:
        "200": {description: Current versioned PNG image}
components:
  schemas:
    PuzzleCard: {}
    AnswerSubmission: {}
    Verification: {}
    ImageManifest: {}
    PrivateProfileSettings: {}
~~~

## 11. Integration order

1. Adopt these audience, schema, answer, image, and rating contracts.
2. Add shared schemas, fixtures, answer vectors, and API response allowlists.
3. Add mock puzzle, image, difficulty, and storage providers.
4. Implement generic Backend comparators, age filtering, profile settings, and Frontend image/text behavior against mocks.
5. Implement puzzle certification and deterministic image templates.
6. Integrate rotation, local archive, live image publication, and DB pointer changes.
7. Replace mocks and verify feed, answer, hint, skip, and rotation flows end to end.

No delivery dates are part of this plan.

## 12. Handoff checklists

### Content Generation

- Five active puzzle types map to the agreed audience.
- Every output has presentation IMAGE, locale en, structured text, visualData, answerInput, accessibilityText, hints, and private verification.
- Unique solution is certified; all verification fields are strings.
- One image manifest and checksum per contentVersion.
- Image pixels contain visualData only and exclude private/answer/hint content.

### Difficulty Module

- Ages and audience categories match the exact boundaries.
- Unsupported age returns AGE_NOT_SUPPORTED.
- Filtering occurs before ranking.
- New rating and Glicko defaults match this contract.
- neurodivergentMode is never an input to eligibility or selection.

### Software Team Backend

- Publication rejects anything except IMAGE.
- Generic comparator routing uses answerType, never puzzle type.
- Private verification and profile flag remain out of public responses.
- Storage is immutable by version, archive is append-only, and pointer update is transactional.
- Failed image generation or validation leaves the current version available.

### Software Team Frontend

- Prompt/clues, image, accessibilityText, hints, and answer control remain distinct.
- No app-drawn puzzle fallback or client-side grading exists.
- One image retry precedes skip and replacement request.
- Unknown or unsupported presentation is safely skipped.
- neurodivergentMode affects app settings only.

## 13. Migration and risks

1. Make this contract and the updated architecture the active v1 references; keep older differing docs identified as legacy until reconciled.
2. Update shared audience and puzzle contracts. For stored records with known ages, map 7–13 to CHILDREN and 17–25 to YOUNG_ADULTS; block 14–16 and all unsupported ages. If age is unknown, require revalidation rather than guessing.
3. Map legacy per-type verification into the answerType string union. Reject ambiguous mappings; regenerate those puzzles.
4. Rebase old player Glicko ratings by subtracting 100 from the old rating coordinate; preserve RD and volatility. Recompute puzzle ratings from structural metadata and clamp to 800–2000. If metadata is missing, use the documented linear catalog-range mapping and flag for calibration.
5. Create one image for every active puzzle before making image-required feed responses live. Serve fixture PNGs during migration if a renderer is unavailable.
6. Publish images through a versioned storage adapter. Keep old image and DB pointer until validation and commit succeed.
7. Enable image-required feed behavior only after active catalog coverage, URL serving, and accessibilityText are complete.

Risks and fallbacks:

- Existing age-only TEENS records cannot be assumed to belong to either supported category without age verification. Keep them out of feed until revalidated.
- Existing raw Glicko ratings and puzzle catalog ratings use conflicting coordinate assumptions. Export a backup; shadow the mapping and preserve the previous values for rollback.
- A missing or corrupt image blocks that card. Keep the old published version during rotation; at feed time skip and request another card.
- The neurodivergentMode flag is not diagnostic. The guardian authorization and privacy review remain open; if authorization cannot be established, do not enable the flag for that account.
- Interactive puzzle contracts remain deliberately deferred.

## 14. Still open

- Guardian authorization and consent workflow for profile-setting changes by a guardian. **Recommended default:** allow a verified guardian or the account owner to set the private flag; complete privacy review before enabling the guardian flow for minors.
- Final Glicko calibration after sufficient outcome data. **Recommended default:** keep the stated initialization and tune only from measured prediction quality.
- Cloud object-storage provider and deployment controls. **Recommended default:** retain the local storage adapter interface and defer provider selection until cloud hosting is chosen.
- Interactive puzzle mechanics and contracts. **Recommended default:** keep INTERACTIVE reserved and reject it in v1; design contracts only when interactive work is approved.



## 15. Current checkout and how work merges into main

**Repository inspection (fact):** the current checkout contains the planning documents, common/types/puzzle.types.ts, and no package.json, apps/api, apps/client, or Prisma schema. docs/milestones.md M1 describes these as intended scaffolding. The main-codebase integration steps below are therefore a target plan, not existing build instructions.

**Current legacy types that must be migrated:**

| Existing source | Current assumption | Required change before app modules compile |
|---|---|---|
| common/types/puzzle.types.ts AudienceCategory | CHILDREN and TEENS | CHILDREN and YOUNG_ADULTS; AGE_NOT_SUPPORTED is a classifier error, not an audience value. |
| common/types/puzzle.types.ts GeneratedPuzzle | 400–2800 and 1500 center | 800–2000 catalog rating; Glicko uses 1400 center/default. |
| Type-specific verification interfaces | Numeric answers, answer arrays, proof fields mixed into each puzzle type | A private universal VerificationBlock with string values; keep solver proof separate and private. |
| common/types/future/neurodivergent.types.ts | Contains provisional deferred audience and interactive-puzzle types | Exclude it from v1 imports and do not migrate its configuration shape; keep interactive work only in the deferred architecture section until separately approved. |
| Legacy content interfaces | Prompt and controls embedded per type | Shared textBlocks, visualData, answerInput, accessibilityText and presentation/image manifest boundary. |
| Planned API and milestone payloads | TEENS, renderer assumptions, old rating defaults | Update schemas, DB enum/checks, API examples, seed data, fixtures, and docs together. |

### Contract package location

Use the planned npm workspaces in docs/milestones.md M1: apps/api, apps/client, and common. Treat common as the contracts package. Its schemas are the runtime source of truth; TypeScript interfaces should be derived from or checked against them. Keep the following together:

- common/schemas for InternalPuzzle, PublicPuzzleCard, requests, responses, errors, and module interfaces.
- common/types for exported TypeScript types.
- common/test-vectors/answers for one vector file per answerType.
- common/mocks for generator, difficulty, storage, and API fixtures.

Do not create app-local copies of the schemas. If the repo later moves to a package named contracts, move common once and preserve imports through a small compatibility re-export; do not maintain two authorities.

### Main merge path

1. **Bootstrap PR:** establish npm workspaces, root TypeScript configuration, app shells, database tooling, and common package exports. Keep the PR free of module-specific behavior.
2. **Contract PR:** update puzzle and API types, runtime schemas, database enums/check constraints, errors, and all five answer vectors. Have Content Generation and Backend review answer semantics; have Difficulty Module and Backend review age/rating fields.
3. **Mock/interface PR:** add adapter interfaces plus deterministic common mocks. Each application slice must be runnable against these mocks before the production implementation arrives.
4. **Content Generation PR:** add generator, uniqueness certifier, template map, deterministic renderer, fixtures, and checksum manifest. It imports common and writes no app/database/storage state.
5. **Difficulty Module PR:** add pure age/rating/selector functions and vectors. It imports common and has no Prisma, HTTP, file, or profile dependency.
6. **Backend PRs by vertical slice:** first profile/age, then catalog/rotation/storage/media, then feed, then answer/outbox, then hints/settings. Each slice starts with a mock adapter and changes to the real module by wiring only.
7. **Frontend PR:** consume public API fixtures first, then local Backend. Include image retry/skip, stale-version, unknown-presentation, and accessibility behavior.
8. **Integration PR:** wire real adapters, local data, migrations, and the end-to-end scenario. Keep changes focused on composition and avoid rewriting module internals.

For each PR, use the same shared schema version and fixtures. Any contract change must update common first; dependent branches rebase and rerun type/schema/vector checks before merging. No team should merge a private copy of a schema or a new comparator rule that bypasses common.

### Suggested code ownership map

| File area | Sole responsibility owner | Integration rule |
|---|---|---|
| common/schemas and common/types | Software Team Backend maintains shared API/catalog contract; all teams review changes that affect their payloads. | Contract changes merge before dependent implementation. |
| common/test-vectors/answers | Content Generation owns expected valid/invalid answer examples with Backend co-review. | Both suites read the same checked-in files. |
| apps/api/src/puzzles/answer-comparators | Software Team Backend | Dispatch by answerType only. |
| apps/api/src/difficulty | Difficulty Module implementation, exposed through Backend adapter | Pure module; Backend owns persistence and fallback. |
| apps/api/src/content-generation adapter | Software Team Backend integration wrapper | Content Generation owns generator internals and renderer. |
| apps/api/src/services/rotation and storage adapter | Software Team Backend | Storage promotion and DB pointer transaction have one owner. |
| apps/client puzzle components | Software Team Frontend | Consume PublicPuzzleCard only; no answer comparator or puzzle renderer. |
| local image templates and generation fixtures | Content Generation | Renderer receives visualData and returns bytes plus manifest. |

## 16. Rotation state and recovery scenarios

Use an explicit job state so a retry can tell which durable step completed:

~~~text
QUEUED → GENERATED → VALIDATED → STAGED → ARCHIVED → PROMOTED → DB_COMMITTED → CLEANED
                   ↘ REJECTED / RETRYABLE_FAILURE
~~~

Recommended job record fields: rotationRequestId, puzzleId, oldVersion, newVersion, state, stagingKey, newImageKey, oldArchiveKey, expected checksum, attempt count, and last safe error code. Do not store answer strings in logs.

| Failure point | What remains authoritative | Retry behavior |
|---|---|---|
| Puzzle generation or uniqueness failure | Old DB record and old live image | Ask for another candidate; do not reuse failed verification. |
| Image rendering/checksum failure | Old DB record and old live image | Retry render from validated visualData; if deterministic output differs, create a new candidate/version rather than overwrite. |
| Archive write fails | Old DB record and old live image | Retry archive; do not promote new content. |
| New live file write fails | Old DB record and old live image | Retry write to the same unique new-version key; verify any existing key before reuse. |
| DB transaction fails after new image is staged/promoted | Old DB pointer; old live image remains | Leave or clean the unreferenced new asset after checking pointer; retry the same job key. |
| Old live cleanup fails after commit | New DB pointer and new image | Retry cleanup; archive is untouched. |
| Duplicate scheduler event | Existing job state | Return the existing job/result using rotationRequestId; never create a second version. |

A filesystem and database transaction cannot be made atomic together. The job record, immutable version keys, checksums, and “DB pointer is authoritative” rule provide recovery. A crash may leave an orphan staging/new file; a cleanup worker can remove only files proven unreferenced by the DB and job table.

## 17. Detailed request behavior

### Public API errors

| Code | HTTP recommendation | Client behavior | Persistence behavior |
|---|---:|---|---|
| AGE_NOT_SUPPORTED | 422 | Explain supported age bands without reclassification. | No account/profile write. |
| PRESENTATION_NOT_SUPPORTED | 422 on publication | Not shown in a normal feed; Frontend skips a future unknown value. | Candidate is not published. |
| PUZZLE_CONTENT_EXPIRED | 409 | Drop stale card and request a new one. | No attempt, hint usage, or rating event for stale version. |
| INVALID_ANSWER_FORMAT | 422 | Ask for a valid answer format without revealing expected answer. | No successful attempt/outcome event; log only a safe code. |
| IDEMPOTENCY_CONFLICT | 409 | Do not auto-submit a changed payload under the old interaction ID. | Preserve the first committed request. |
| HINT_NOT_AVAILABLE | 404 | Keep the puzzle visible; show that this hint is unavailable. | Do not create a hint-use row for a missing tier. |
| MEDIA_VERSION_REPLACED | 410 | Retry once, then skip/refill if still unavailable. | No answer or rating event. |
| NO_ELIGIBLE_PUZZLES | 200 with empty list, or 503 if catalog is unhealthy | Show retryable empty state. | No puzzle reservation. |

The Backend must return one stable error envelope with code, safe message, and request ID. Do not include internal filesystem paths, verification data, solver diagnostics, or user profile flags.

### Data invariants that span modules

- A puzzle is not feed-eligible until both its DB publication record and current image pointer exist and the image checksum has been verified.
- Every answer, hint, skip, and media URL carries or implies contentVersion. A version mismatch never silently operates on the replacement puzzle.
- Answer comparison is server-only. A correct/incorrect response is not a content-generation certificate.
- Difficulty selection receives an already-filtered list. It cannot make an unsupported age/category eligible.
- Image retries are client loading attempts; they do not create answer attempts or rating events.
- Text scale and neurodivergentMode never affect image content, candidate ranking, or response shape.

## 18. Recommended contract and integration test matrix

| Boundary | Valid fixture | Negative/failure fixtures |
|---|---|---|
| Age classifier | 7, 13, 17, 25 | 6, 14, 16, 26, fractional, missing |
| Internal puzzle schema | One IMAGE/en candidate for each active puzzle type | INTERACTIVE publication, unknown type, unsupported audience, wrong age bounds, rating outside 800–2000, missing accessibilityText, non-string answer |
| Image renderer | VisualData for sequence, equation, schedule, statements, route | Missing template, overflow, malformed visualData, checksum mismatch, accidental prompt/hint field in renderer input |
| Answer comparator | One shared vector file for each of five answerTypes | Invalid format, wrong answer, whitespace/case/symbol normalization, order mismatch |
| Public projection | Public card includes image/text/accessibility/hints | Assert verification, private answer, age, audience, fingerprint, profile flag are absent recursively |
| Feed | Eligible image-ready candidates and deterministic selector | Empty catalog, selector throws, selector returns duplicate/unknown ID, missing current asset |
| Answer and outbox | Correct and incorrect outcomes with stable interaction ID | Stale version, same ID same payload, same ID altered payload, outbox retry |
| Rotation | Full successful version swap | Every failure point in §16, duplicate event, crash after DB commit, orphan cleanup |
| Frontend image | First load succeeds | First fails then retry succeeds; both fail then skip/refill; replaced URL returns 410 |
| Private settings | Owner reads/writes flag | Public profile, leaderboard, feed, and telemetry contain no flag |

The test matrix is a contract for later implementation. No app tests were run as part of this documentation update because the application packages are not present in the current checkout.
