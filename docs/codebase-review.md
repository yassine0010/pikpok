# PikPok Codebase Review

Review date: 2026-10-13
Reviewed commit: `aac725c5d8b624e766e081dd480afe99f3db9b7b`
Scope: API, client, shared types, database schema/migration, seed/rotation scripts, configuration, dependencies, tests, and current planning documents.

This is an assessment, not an implementation change. Application files, dependencies, and databases were not modified. `contracts.md` is the requirements authority; legacy documents are used only where compatible.

## 1. Verdict

- **Syntax:** No parser errors found in the 71 tracked TypeScript, TSX, and JavaScript code/configuration files checked, excluding historical material.
- **Type checking:** All three workspace typecheck commands pass. This does not prove runtime correctness: explicit `any`, assertions, unvalidated JSON, and duplicated contracts bypass important checks.
- **Lint:** The normal lint command fails before completing analysis. A diagnostic run also found substantive issues beneath the configuration failures.
- **Functionality:** Several core workflows are broken or simulated. Passing compilation is not sufficient to call the app feature-complete.
- **Dependencies:** A peer-version conflict, an Expo compatibility mismatch, missing formatter dependency, and security advisories need attention.
- **Optimization:** The code is not yet well consolidated or performance-validated. Correctness, shared contracts, and unnecessary requests matter more than small algorithmic optimizations.
- **Unused code:** Some genuine cleanup candidates exist, but other unused structures are unfinished planned integrations. Deleting everything unused would remove intended architecture.

The largest structural problem is that accepted v1 requirements changed while the implementation still follows many older contracts. Reconcile those contracts before investing further in obsolete renderers and verifiers.

## 2. Verification Results

Environment: Node `v26.9.0`, npm `11.19.1`, installed workspace dependencies.

| Check | Result | Interpretation |
| --- | --- | --- |
| TypeScript parser over 71 tracked `.ts`, `.tsx`, and JS configuration/entry files | PASS, zero parse errors | Syntax only; not proof of behavior or native compatibility. |
| `npm run typecheck` | PASS for API, client, and common | Client test helpers are excluded from its TypeScript project. |
| `npm test` | PASS: one API health test; zero client tests | Client uses `--passWithNoTests`. There is no meaningful feature coverage yet. |
| `npm run lint` | FAIL | API has unknown `vitest` environment; client cannot load `prettier-plugin-organize-imports`. |
| Diagnostic lint with those blockers bypassed in memory | FAIL: API 83 errors / 8 warnings; client 290 errors / 23 warnings | No configuration files were changed. Counts include stylistic rules and two client test-project configuration errors. |
| `prisma validate` | PASS with a placeholder `DATABASE_URL` | Initial invocation lacked the variable. Validation did not connect to PostgreSQL or verify deployed migrations. |
| API build emitted to `/tmp/pikpok-review-api-build` | PASS | JavaScript is emitted, including `src/server.js`. |
| Running emitted API entry with workspace package resolution | FAIL: `Cannot find module '@utils/config'` | Runtime aliases are unresolved; the normal start script also points to the wrong output path. |
| `npm ls --depth=0` | PASS | Top-level listing does not detect all nested peer conflicts. |
| `npm ls --all` | FAIL | Installed `lightningcss@1.19.0` does not satisfy Vite's optional peer requirement. |
| Expo offline `install --check` | FAIL | `react-native-safe-area-context` is `4.10.0`; installed Expo expects `4.10.5`. Offline validation is explicitly limited. |
| Online `npm audit` during this review | 125 affected dependency entries | 5 critical, 77 high, 42 moderate, 1 low; includes development tools and transitive chains. |

### Diagnostic lint details

The diagnostic invocation used the existing ESLint configurations with only `env.vitest` removed and the Prettier rule disabled, in memory. It is not a successful run of the project's normal lint command.

| Finding | API | Client |
| --- | ---: | ---: |
| Explicit `any` diagnostics | 15 | 11 |
| Unused-variable/import diagnostics | 5 | 20 |
| Style-order diagnostics | 0 | 220 |
| Files outside ESLint's configured TypeScript project | 0 | 2 |

Other diagnostics include unsafe assignments/member access, inconsistent type-only imports, and unhandled/misused promises. The totals are not counts of independent bugs. In particular, the 220 style-order errors should not take priority over broken behavior.

### Runtime probes

Fastify injection and direct service probes used process-local mocks where database/queue data was needed. They did not write to the real database or run rotation. These are review experiments, not checked-in regression tests.

| Probe | Observed result |
| --- | --- |
| Browser preflight: `OPTIONS /auth/login` | `401 UNAUTHORIZED`, preventing the browser's intended request. |
| Authenticated feed with a populated mocked puzzle | `200`, but serialized `content` became `{}`. |
| Expired-content service error through the answer route | `500 INTERNAL_ERROR`, not the required `409 PUZZLE_CONTENT_EXPIRED`. |
| 101 successive health requests from the same injected IP | Request 101 returned `500`, not `429`. |
| NUMBER submission `"13"` with accepted string canonical answer `"13"` | Incorrect under the legacy number verifier. |
| Seed scheduling answer `"b,a,c,d"` | Incorrect because only the submission is uppercased. |
| Route submission `"R R 123 ! D D"` | Accepted when `RRDD` is an accepted route; invalid characters are silently discarded. |
| Reuse successful interaction ID with a different answer | Previous success returned instead of idempotency conflict. |
| Reuse a skipped interaction as an answer | Replay formatted as an incorrect answer. |
| Two correct answers on one day with host `TZ=Africa/Tunis`, app timezone UTC | Streak increased from 1 to 2 in mocked persistence. |
| Concurrent queue refills with the same five mocked candidates | Ten queued entries containing only five distinct IDs. |

### Follow-up review confirmation: 2026-10-13

The follow-up assessment confirmed the eight findings below. They map to existing entries rather than duplicate issues; their detailed impact and recommended actions remain in those entries.

| Finding | Existing entry | Follow-up evidence |
| --- | --- | --- |
| Client answer feedback is random and never submits to the API | [F02](#f02-client-answer-grading-is-random-and-never-reaches-the-api) | Static: `handleSubmit` uses `Math.random()` rather than `api.submitAnswer`, so solving through the UI records no attempt or server XP. |
| Authentication blocks browser preflight | [F04](#f04-authentication-blocks-cors-preflight) | Reproduced: `OPTIONS /auth/login` returned `401 UNAUTHORIZED`. |
| Feed serialization removes puzzle content | [F05](#f05-feed-serialization-deletes-the-content-needed-by-the-client) | Reproduced: a populated mocked puzzle returned `content: {}` through the actual feed response schema. |
| Signup does not enforce accepted age eligibility | [F01](#f01-accepted-age-policy-is-not-implemented) | Static: signup requires a self-selected `CHILDREN | TEENS` category and performs no `ageYears` classification. |
| Account changes retain cached private data | [F03](#f03-query-cache-survives-account-changes) | Static: logout leaves the persistent QueryClient intact, while feed and stats use account-independent keys. Account-switch behavior was not browser-tested. |
| Server graders reject valid answers | [F07](#f07-verifier-architecture-and-normalization-are-incorrect) | Reproduced: accepted string-number answer `"13"`, seeded scheduling answer `"b,a,c,d"`, and minimum-move route answer `"4"` all returned incorrect. |
| Public seed hints contain solutions | [F14](#f14-seeded-public-hints-contain-literal-answers) | Static: tier-three hints contain the final answers, and the feed includes those hints. |
| Expired answers become generic server errors | [F06](#f06-error-handling-converts-expected-errors-into-http-500) | Reproduced through `POST /answer`: stale content returned `500 INTERNAL_ERROR` rather than `409 PUZZLE_CONTENT_EXPIRED`. |

Repeated verification:

- `npm run typecheck` passed in all three workspaces.
- `npm test` passed one API health test; the client reported no tests.
- `npm run lint` failed on the API's unknown `vitest` environment and the client's missing `prettier-plugin-organize-imports`.
- An additional answer-route probe reconfirmed [F08](#f08-idempotency-does-not-protect-answerskip-semantics): changing the answer under an existing interaction ID returned the previous success instead of a conflict.

Request/service probes used process-local mocked data. No live PostgreSQL/Redis end-to-end test, browser/device test, database write, or application-code change was performed in this follow-up.

Assessment remains unchanged: the repository is a useful scaffold, not yet a reliable working v1. Prioritize the accepted contracts and the real signup -> feed -> answer workflow before adding features.

## 3. High-Priority Findings

Severity: **P1** means core behavior, privacy, eligibility, or data integrity should be addressed before relying on the app. **P2** means a material defect or maintenance risk. **P3** means lower-priority cleanup.

Evidence labels: **Reproduced** means a command or isolated runtime probe demonstrated the behavior; **Static** means the implementation directly establishes it; **Integration gap** means planned functionality is absent, not necessarily a regression.

### F01. Accepted age policy is not implemented

**P1 | Static / contract conflict**

Sources: [signup validation](../apps/api/src/routes/auth.ts#L7), [database enum](../apps/api/prisma/schema.prisma#L10), [queue filtering](../apps/api/src/services/queueService.ts#L176), [accepted age policy](contracts.md#L25).

Signup accepts a self-selected `CHILDREN | TEENS` category without age classification. Queue filtering uses ages 0-12 and 13-17. Accepted v1 requires `CHILDREN` ages 7-13 and `YOUNG_ADULTS` ages 17-25, rejecting every other age with `AGE_NOT_SUPPORTED`.

Impact: unsupported ages can register, age 13 has the wrong legacy classification, and young-adult content cannot be represented correctly. Seed audience/type assignments also violate the accepted mapping.

Action: migrate signup, shared schemas, Prisma enum, fixtures, and database-layer eligibility together. Existing accounts with unknown age require revalidation; do not silently rename `TEENS` to `YOUNG_ADULTS`.

### F02. Client answer grading is random and never reaches the API

**P1 | Static**

Source: [PuzzleCard submission](../apps/client/components/puzzle/PuzzleCard.tsx#L54).

`handleSubmit` uses `setTimeout` and `Math.random() > 0.5`. It never calls the implemented `api.submitAnswer` method. The UI presents correctness/XP feedback without recording an answer, awarding server XP, updating stats, or emitting a difficulty event.

Action: use a real mutation and the server's result, preserve the interaction ID across retries of the same action, handle stale content and errors, and update affected queries. Remove simulated outcomes. Do not reuse one ID for distinct answer and skip actions.

### F03. Query cache survives account changes

**P1 | Static privacy risk**

Sources: [persistent QueryClient](../apps/client/providers.tsx#L8), [logout](../apps/client/store/authStore.tsx#L62), [feed key](../apps/client/app/(tabs)/feed.tsx#L20), [stats key](../apps/client/app/(tabs)/stats.tsx#L19).

Queries use account-independent keys such as `['feed']`, `['stats']`, and `['leaderboard']`. Logout clears authentication but does not cancel/clear queries; the QueryClient remains mounted above authentication.

Impact: the next account can receive the previous account's cached private stats, personalized ranking, or wrong-audience puzzles before a refetch. In-flight requests can also repopulate old data.

Action: scope private query keys to account identity and clear/cancel account data at authentication boundaries. Test account A -> logout -> account B, including requests still in flight.

### F04. Authentication blocks CORS preflight

**P1 | Reproduced**

Sources: [hook registration](../apps/api/src/server.ts#L28), [auth middleware](../apps/api/src/middleware/auth.ts#L16), [CORS registration](../apps/api/src/utils/plugins.ts#L13).

The global authentication hook executes before CORS handling and does not exempt preflight requests. `OPTIONS /auth/login` returned 401.

Action: arrange CORS/preflight handling so approved browser origins can complete preflight without a JWT. Keep authentication enforced on the actual protected requests.

### F05. Feed serialization deletes the content needed by the client

**P1 | Reproduced**

Source: [feed response schema](../apps/api/src/routes/feed.ts#L38).

The response schema declares `content: { type: 'object' }` without its fields. Fastify serialized a populated puzzle's content to `{}`. Renderers subsequently expect fields such as `sequence`, `items`, and `clues`.

Action: define an explicit shared public response schema matching the accepted image-card contract. Do not solve this by serializing the complete internal puzzle or enabling unrestricted fields that could expose verification.

### F06. Error handling converts expected errors into HTTP 500

**P1 | Reproduced**

Sources: [error handler](../apps/api/src/middleware/errorHandler.ts#L12), [expired-answer error](../apps/api/src/services/answerService.ts#L58), [rate limiting](../apps/api/src/utils/plugins.ts#L18).

Services throw errors with a domain `code` but no `statusCode`; the handler does not map those codes. An expired answer returned 500 instead of 409. The handler also fails to preserve rate-limit status 429: the 101st health request returned 500.

Other issues: all known Prisma request errors are broadly mapped to 400, and a manually supplied 409 becomes generic `CONFLICT`, losing the domain code. Development-mode responses include stack traces and local paths.

Action: use typed domain errors and a central status/code mapping, preserve supported framework HTTP errors, map database constraints deliberately, and return safe error details. Add stale-version, idempotency, missing-resource, validation, rate-limit, and infrastructure-failure tests.

### F07. Verifier architecture and normalization are incorrect

**P1 | Reproduced / contract conflict**

Sources: [legacy verifiers](../apps/api/src/utils/verifiers.ts#L28), [required generic comparators](contracts.md#L146).

Current dispatch is by puzzle type; accepted v1 dispatch is exclusively by private `verification.answerType`.

Confirmed examples:

- Number verification compares a parsed number with a canonical value assumed to be numeric. Accepted v1 canonical answers are strings, so `"13"` is rejected against `"13"`.
- Scheduling uppercases submissions but compares them to lowercase seed answers, rejecting the correct seeded order.
- Route normalization discards arbitrary invalid characters, accepting malformed input.
- `Number(...)` accepts forms outside a deliberately validated decimal grammar, including hexadecimal; blank input normalizes to zero.

Action: implement the five accepted generic comparator types with strict format validation and shared vectors. Invalid syntax must return `INVALID_ANSWER_FORMAT`; a valid non-match is incorrect. Do not expand the obsolete per-puzzle verifier design.

### F08. Idempotency does not protect answer/skip semantics

**P1 | Reproduced / Static**

Sources: [answer replay check](../apps/api/src/services/answerService.ts#L38), [replay response](../apps/api/src/services/answerService.ts#L191), [skip insertion](../apps/api/src/services/queueService.ts#L300).

Answer replay compares user, puzzle, and version, but not submitted answer or interaction kind. Changing an answer can return the previous successful result. Replaying a skip through the answer endpoint becomes `incorrect`, and replayed answers always return `currentStreak: 0`.

Skip performs a raw insert rather than an idempotent replay. Concurrent duplicate requests can also race past the initial answer lookup and surface as a generic database error.

Action: define an immutable interaction payload, enforce matching replay, persist or reconstruct consistent response fields, and handle unique-key races. A changed action/payload must conflict without side effects.

### F09. Streak dates mix application and host timezones

**P1 | Reproduced**

Source: [streak calculation](../apps/api/src/services/answerService.ts#L120).

Formatting a date in `APP_TIME_ZONE`, reparsing it in the host timezone, and storing local midnight changes its meaning. With host timezone Africa/Tunis and application timezone UTC, two correct answers on the same day incremented the streak twice.

Action: compare stable application-calendar date keys or use a timezone-aware date implementation. Test same-day answers, consecutive days, missed days, timezone differences, and daylight-saving boundaries.

### F10. Queue refill and refresh are not concurrency-safe

**P1 | Reproduced / Static**

Sources: [refill](../apps/api/src/services/queueService.ts#L176), [generation refresh](../apps/api/src/services/queueService.ts#L262), [reservation cleanup](../apps/api/src/services/queueService.ts#L133).

Refills exclude recent puzzles but not already queued or currently reserved IDs. They have no per-user refill coordination. Concurrent refills produced duplicate entries. Generation refresh uses separate read/delete/push operations, which can overwrite another refill or reintroduce consumed entries.

Reservations are not released/recovered when puzzle loading fails; expiration deletes the processing list without returning those IDs.

Action: preserve atomic reservation while coordinating refill and refresh; exclude ready/processing IDs and define recovery. Verify interleaved requests and failure paths against real Redis.

### F11. Rotation and reseeding violate archive/version guarantees

**P1 | Static data-integrity risk**

Sources: [archive write](../apps/api/scripts/rotate.ts#L64), [replacement writes](../apps/api/scripts/rotate.ts#L67), [seed upsert](../apps/api/prisma/seed.ts#L110), [archive default](../apps/api/src/utils/config.ts#L35).

Rotation writes archives with overwrite-capable `writeFileSync`, then changes only the prompt prefix. It does not generate/validate a replacement puzzle or image. Puzzle and catalog-state writes are separate, without a version comparison or retry identity. Concurrent/retried runs can overwrite history or lose catalog counters.

Seed reruns increment content versions and replace content without archival or catalog-generation coordination. Storage uses `./.local/archive`, not the accepted live/image archive layout.

Action: keep seed initialization distinct from rotation. Implement append-only image plus complete JSON archival before publication, exclusive/idempotent file handling, validated replacement content, and conditional transactional database switching. Do not run the current scripts against data whose history matters.

### F12. Default JWT secret is unsafe when the server is reachable

**P1 | Static, conditional on environment**

Source: [API configuration](../apps/api/src/utils/config.ts#L6).

The API defaults to `0.0.0.0` and a known hardcoded signing secret when `JWT_SECRET` is absent. Anyone who can reach the server and knows that default could forge a token for a known user ID.

Action: require a strong local secret and validate configuration at startup. Default to loopback unless LAN access for device testing is explicitly configured. This does not require cloud or production infrastructure.

### F13. Compiled API cannot be started by its declared command

**P1 | Reproduced**

Sources: [API scripts](../apps/api/package.json#L4), [compiler configuration](../apps/api/tsconfig.json#L22), [aliased imports](../apps/api/src/server.ts#L3).

With `rootDir: "."`, the compiler emits `dist/src/server.js`, but `main` and `start` expect `dist/server.js`. Even when the correct emitted entry is executed, Node cannot resolve aliases such as `@utils/config`; TypeScript does not rewrite them.

Action: align the build output and start entry, then use a compatible alias rewrite/bundling/runtime-resolution strategy. Add a compiled-build startup smoke test. This finding concerns the compiled start path; `tsx` development execution is separate.

### F14. Seeded public hints contain literal answers

**P1 | Static**

Sources: [number hint](../apps/api/prisma/seed.ts#L34), [operator hint](../apps/api/prisma/seed.ts#L60), [scheduling hint](../apps/api/prisma/seed.ts#L92), [hint confidentiality rule](implementation-contract.md#L896).

Third-tier hints contain the final number, operator, or complete answer order. The scheduling placeholder also gives its exact solution at seed line 81. These fields are sent to the client.

Action: ensure public hints explain the method without containing canonical/accepted answers, and use neutral answer-format examples. Add publication checks and public-projection fixtures.

## 4. Other Functional Findings

| ID | Severity / evidence | Problem and recommended direction |
| --- | --- | --- |
| F15 | P2 / Static | [Queue fallback](../apps/api/src/services/queueService.ts#L221) can call `RPUSH` with no values; [cleanup](../apps/api/src/services/queueService.ts#L167) can call `ZADD` with no score/member pairs. Empty catalogs or missing reserved rows become Redis errors. Guard empty collections and return the defined empty/unavailable result. |
| F16 | P2 / Static boundary risk | [Adapter output](../apps/api/src/services/queueService.ts#L244) is trusted without rejecting unknown, duplicate, excessive, or ineligible IDs. [Final loading](../apps/api/src/services/queueService.ts#L140) filters only by ID. The present stub returns eligible candidates, but an integrated faulty selector could bypass that assumption. Restrict results to eligible candidates and revalidate current database eligibility before returning cards. |
| F17 | P2 / Static | [Skip](../apps/api/src/services/queueService.ts#L319) creates an attempt without the intended transaction/outbox and stats accounting. It does not explicitly maintain repeat-avoidance state. Reconcile skip accounting with the accepted/compatible interaction contract; keep skips neutral for skill updates. |
| F18 | P2 / Static | [HintPanel](../apps/client/components/hints/HintPanel.tsx#L19) displays feed hints without calling `api.getHint`, so real hint usage is never recorded by the normal UI. Tier-dot controls also have an empty handler. Wire reveal actions and error states; remove or implement inactive controls. |
| F19 | P2 / Static | [HintService](../apps/api/src/services/hintService.ts#L41) inserts usage and increments the stats counter in separate operations. Failure between them leaves inconsistent data. Use a transaction and define retry/reveal semantics. |
| F20 | P2 / Static | [FeedScreen](../apps/client/app/(tabs)/feed.tsx#L19) loads one batch and never uses `nextBatchRequiredAt` to prefetch. Skipping invalidates the entire feed, replacing other unsolved cards. Maintain a bounded client queue and remove/refill only the affected card(s). Surface skip failures. |
| F21 | P2 / Static | [StatsScreen](../apps/client/app/(tabs)/stats.tsx#L127) shows hardcoded weekly, monthly, domain, and XP-trend values as account statistics. Use measured data or omit unsupported sections. Do not add unapproved metrics merely to populate the UI. |
| F22 | P2 / Static | [Tab layout](../apps/client/app/(tabs)/_layout.tsx#L6) has no authentication gate. [StatsScreen](../apps/client/app/(tabs)/stats.tsx#L59) dereferences `data!` even when its unauthenticated query is disabled and has no data. Add a route guard and explicit loading/empty/auth states. |
| F23 | P2 / Static | [Auth restoration](../apps/client/store/authStore.tsx#L25) clears stored credentials on failure but leaves the API object's in-memory bearer token. [API requests](../apps/client/services/api.ts#L43) have no centralized expired-session handling. Clear all authentication representations consistently, distinguish transient network failure from invalid credentials, and coordinate query cleanup. |
| F24 | P2 / Static | [API base URL](../apps/client/services/api.ts#L7) is hardcoded to emulator/localhost addresses and an unconfigured release hostname. Physical devices need the workstation address. Use configurable local endpoints; no external deployment is needed. |
| F25 | P2 / Static | [Leaderboard ordering](../apps/api/src/services/leaderboardService.ts#L29) lacks a stable tie-breaker. In-list ranks use position, but an outside-list user's rank counts only strictly higher XP, producing inconsistent tie behavior. Define one ordering/ranking policy for both paths. |
| F26 | P2 / Static | [Typography](../apps/client/constants/typography.ts#L34) defines fractional line-height multipliers, but renderers pass them directly to React Native, where line height is an absolute layout value. This risks overlapping/clipped multiline text. Convert deliberately or use the existing absolute text-style values. Named custom fonts also lack a loading/assets path in active code. |
| F27 | P2 / Static | [Scheduling renderer](../apps/client/components/puzzle/SchedulingOrderRenderer.tsx#L30) places raw text/numbers inside a `View`, not `Text`, violating native text requirements. It also displays ordinal numbers instead of the item IDs referenced by answer labels. Address only as needed during migration to the accepted image presentation. Native behavior was not device-tested. |
| F28 | P2 / Reproduced serialization behavior | [Fingerprint helper](../apps/api/prisma/seed.ts#L6) passes top-level keys as a JSON replacer array. That allowlist also applies recursively, dropping nested puzzle fields. Different puzzles of one type can hash the same reduced structure. Use a deliberate canonical semantic fingerprint and test nested-field changes; do not include cosmetic prose as a substitute for puzzle identity. |

## 5. Dependency And Tooling Problems

### D01. Nested dependency conflict

**P2 | Reproduced**

Installed `lightningcss@1.19.0` matches Expo Metro's `~1.19.0` requirement but not Vite `5.4.21`'s optional peer `^1.21.0`. `npm ls --all` reports `ELSPROBLEMS`.

This is a real dependency-tree inconsistency, not evidence that every Vite task crashes. Resolve compatible toolchain versions or isolation deliberately; a global override could break Expo.

### D02. Expo package versions need alignment

**P2 | Reproduced / Static**

Expo's offline check expects `react-native-safe-area-context@4.10.5`, but the client pins `4.10.0`. The client also declares React Native `0.74.0`, while the root override forces `0.74.5`. The installed React/React Native copies were not duplicated in the inspected tree.

Action: keep the intended Expo SDK and its supported native package set aligned, then run online Expo validation and native/web smoke tests. Do not upgrade or downgrade the entire framework solely to silence an audit suggestion.

### D03. Security advisories require a reviewed upgrade plan

**P1 triage | Online audit evidence**

The online audit reported 125 affected dependency entries: **5 critical, 77 high, 42 moderate, and 1 low**. Counts include ancestor packages affected through dependencies; they are not 125 independently demonstrated application vulnerabilities.

Critical advisory chains include development tooling such as `tar`, `tinypool`, and `vitest`. Toolchain exposure and API runtime exposure need separate assessment.

Action: review advisory paths and reachable functionality; update compatible dependency groups and rerun tests. Do not run `npm audit fix --force` blindly. Audit metadata is time-sensitive, so rerun before implementing upgrades.

### D04. Extra direct packages do not replace vulnerable nested copies

**P2 / P3 | Static dependency inspection**

Sources: [root manifest](../package.json), [API manifest](../apps/api/package.json), [client manifest](../apps/client/package.json).

- API directly installs `avvio@9.3.1`, with no application import; Fastify still uses nested `avvio@8.4.0`.
- API directly installs `esbuild@0.28.2`, with no matching application/build command; Vite still uses nested `esbuild@0.21.5`.
- Root/client directly declare `ajv`, but active application code has no direct imports. Framework use of its own Ajv is a different dependency relationship.

These are cleanup/investigation candidates, not automatic deletions. Confirm why each was added and regenerate/test the lockfile after intentional removal or replacement.

### D05. Lint/format configuration is incomplete

**P2 | Reproduced**

Sources: `apps/api/.eslintrc.js`, [client lint configuration](../apps/client/.eslintrc.js), `apps/api/.prettierrc.js`, [client Prettier configuration](../apps/client/.prettierrc.js).

The API uses an unregistered `vitest` environment. Both Prettier configurations reference an uninstalled import-organizing plugin. Once these blockers are bypassed, client lint includes two test helper files excluded by [its TypeScript configuration](../apps/client/tsconfig.json).

Action: establish a working baseline lint/format command and correct test-project coverage. Review import-organizing changes separately from functional changes.

### D06. Runtime/toolchain expectations are not reproducible enough

**P2 | Static / environment evidence**

The project requires Active LTS, but root `engines.node` is only `>=20.0.0`, accepting unsupported/non-LTS versions. This review ran under Node 26.9.0. Root `packageManager` declares npm 10.0.0; installed npm is 11.19.1.

Action: select and document a supported Active LTS runtime and npm version, then verify from a clean `npm ci`. Semver ranges in manifests are not themselves proof of unpinned installs: the committed lockfile pins resolved versions. A clean installation was not performed during this review.

## 6. Duplication, Unused Code, And Planned Work

### Genuine consolidation candidates

| Area | Evidence | Recommended treatment |
| --- | --- | --- |
| Shared API types duplicated locally | [Common contracts](../common/types/api.types.ts#L73), [client copies](../apps/client/services/api.ts#L155), [queue-local types](../apps/api/src/services/queueService.ts#L7), [answer-local types](../apps/api/src/services/answerService.ts#L6) | Migrate accepted schemas in `common/`, then consume them in both apps. `common/types/api.types.ts` is not currently consumed by the apps. |
| Error shapes and codes | [Common error contract](../common/types/api.types.ts#L14), [backend error shape](../apps/api/src/middleware/errorHandler.ts#L6), [client error casts](../apps/client/services/api.ts#L58) | One shared error contract plus typed server/client helpers. |
| Two validation definitions per route | [Auth JSON Schema and Zod](../apps/api/src/routes/auth.ts#L7), [feed validation](../apps/api/src/routes/feed.ts#L5) | Choose one source for runtime schema/types and adapt it to Fastify. Avoid independently maintained constraints and redundant parsing. |
| Content interfaces repeated in each renderer | [Scheduling example](../apps/client/components/puzzle/SchedulingOrderRenderer.tsx#L6), [shared puzzle types](../common/types/puzzle.types.ts) | Replace obsolete contracts through the planned image-card migration, not another layer of renderer-specific types. |
| Unused parallel theme definition | [theme.ts](../apps/client/constants/theme.ts) has no active imports; screens repeat local styles | Either adopt useful tokens/components or remove the unused parallel definition after owner review. Keep colors/spacing/typography that are actually used. |
| Unused symbols and stored dependencies | Diagnostic lint found 25 unused-symbol diagnostics; several services store an unused Fastify instance | Remove verified unused imports/fields and unnecessary constructor dependencies when touching those modules. |
| Assertions weaken compile-time guarantees | `any` in request access, JSON content, response shaping, and client render dispatch | Validate unknown data and narrow types. Use the existing Fastify request augmentation instead of repeated casts. |

Lower-priority convention drift includes camelCase utility/service filenames where kebab-case is required and missing JSDoc on public functions. Fix these gradually and avoid broad rename/format churn across teammates' work.

JavaScript bootstrap/config files also exist despite the repository's TypeScript-only wording. Framework configuration may require exceptions; document those exceptions instead of mechanically renaming files that the toolchain expects.

### Unused does not necessarily mean removable

| Item | Current state | Classification |
| --- | --- | --- |
| Difficulty adapter/module | [QueueService](../apps/api/src/services/queueService.ts#L254) simply returns the first candidates; recent outcomes are empty | Planned integration is not implemented. Do not describe the feed as adaptive. |
| `UserRating` and `PuzzleSelectionStats` | [Schema](../apps/api/prisma/schema.prisma#L157) defines them, but active services do not use them | Planned rating/selection persistence, not confirmed dead data. |
| Outbox | Answers write `PENDING` events; no worker delivers them | Incomplete integration. Actual use accumulates pending events and never updates difficulty. |
| IMAGE/en/public image-card contract | No active image generator/renderer/storage/media pipeline; client draws the five legacy puzzle types | Accepted migration work, not a cleanup-only refactor. |
| Generic answer schemas/vectors | Accepted shared comparator vectors/runtime schemas are missing | Required contract/test work. |
| Private `neurodivergentMode` setting | Missing from active user schema/profile settings/client | Accepted v1 integration gap. Default false; private, never inferred or used in selection. |
| Dynamic AI hints | No active integration | Correctly deferred; provide an unavailable state rather than fabricated AI output. |
| `common/types/future/` | Deferred contracts are isolated from active imports | Keep isolated. Do not activate or delete them merely because current v1 does not use them. |
| Three seeded puzzles | Small fixture only | Acceptable for early development; not the required final 3,000-slot catalog or a complete validation suite. |
| Rotation scheduling flags | Configuration exists but no scheduler consumes it | Unfinished scheduled rotation, not an enabled working feature. |

The absence of later milestone features is not automatically a regression. Track these as gaps, confirm current milestone/ownership, and agree on scope before implementation.

## 7. Documentation Conflicts

- [contracts.md line 437](contracts.md#L437) and [architecture.md line 409](architecture.md#L409) say the checkout has no app packages, root manifest, or Prisma schema. All are now present.
- [Legacy implementation contract](implementation-contract.md#L16) still specifies `TEENS`, old age bands, old rendering assumptions, and per-type verification. Tasks/reference guidance retain superseded statements. Make the legacy status unmistakable and reconcile active implementation instructions.
- [Shared types](../common/types/puzzle.types.ts#L14) still express older requirements. A type definition is not authority to override accepted v1 decisions.
- The accepted document names answer vectors both directly under [common/test-vectors](contracts.md#L172) and under [common/test-vectors/answers](contracts.md#L456). Choose one location.
- Milestone/task checkboxes do not reflect the implemented fragments. Update the implementation inventory so teammates do not build duplicate versions or mistake stubs for completed work.
- API response examples and active code also differ, including answer, hint, and skip shapes. Resolve the accepted shared schema before wiring teams to independently interpreted examples.

Historical notes and UI mockups are not active requirements. Do not reintroduce Library, sharing, multiple-choice answers, or interactive puzzle features during cleanup.

## 8. Optimization Assessment

No benchmarks, database query plans, bundle-size measurements, or sustained load tests were run. The following are engineering priorities, not measured speedup claims.

| Priority | Opportunity | Why it matters |
| --- | --- | --- |
| First | Fix full-feed invalidation and implement bounded prefetch | Avoids unnecessary requests and losing other in-progress cards. |
| First | Make queue refill/refresh atomic and deduplicated | Prevents duplicate work and inconsistent behavior under concurrency. |
| First | Consolidate shared types and runtime validation | Reduces drift and maintenance effort; speed is secondary. |
| Next | Batch appropriate Redis operations and manage connection shutdown | Several sequential round trips occur per batch; no explicit service `onClose` cleanup exists. Preserve atomicity and error handling. |
| Next | Inspect candidate query plans with representative catalog data | Eligibility includes array membership and age conditions. Measure whether a GIN/other index is worthwhile before adding one. |
| Next | Inspect leaderboard ordering/rank queries and indexes | Correct tie semantics first, then measure query cost at realistic user counts. |
| Next | Virtualize the feed when it actually accumulates cards | The current five-card ScrollView is not by itself proof of a performance problem. Keep future feed memory bounded. |
| Later | Replace repeated `puzzles.find(...)` with an ID map | Current ordering is O(n^2), but feed size is capped at 10; this is a low-impact cleanup. |
| Later | Consolidate repeated styles and remove unused dependencies | Helps consistency and may reduce installation/bundle cost, but measure the effect. |

Keep the local in-process architecture. Nothing found justifies microservices, a new state framework, or cloud infrastructure. The useful simplification is fewer competing contracts and fewer incomplete parallel implementations.

## 9. Recommended Repair Order

These are proposed work items, not authorization to start features outside the current milestone.

1. **Restore reliable checks:** fix lint setup and compiled startup; choose the supported runtime; review dependency compatibility/security upgrades.
2. **Agree on accepted shared contracts:** age policy, public image card, answer comparators, error envelopes, response shapes, and migration rules. Reconcile stale documentation.
3. **Protect privacy and eligibility:** account-cache isolation, authentication/session handling, CORS, configured secrets, and database eligibility enforcement.
4. **Complete one real workflow:** signup -> eligible feed -> server answer -> XP/stats -> hints/skip, with stale-version and failure handling.
5. **Protect persistent state:** interaction replay/concurrency, timezone-safe streaks, queue coordination/recovery, transactional hint/skip accounting, and append-only rotation.
6. **Complete agreed integrations:** image publication/media, difficulty adapter/outbox, and private settings, respecting ownership and milestone scope.
7. **Clean up and measure:** remove proven unused code, consolidate themes/types, run representative query and frontend measurements, then optimize demonstrated bottlenecks.

### Regression checklist

- [ ] Signup boundaries: ages 6, 7, 13, 14, 16, 17, 25, and 26; unsupported/unknown-age migration behavior.
- [ ] Allowed-origin preflight, unauthorized protected requests, expired sessions, and correct rate-limit 429 responses.
- [ ] Public response allowlists recursively exclude verification, private answers, age/audience data, authentication identity, and private settings.
- [ ] Account switch with warm cache and in-flight requests does not expose prior account data.
- [ ] Generic comparator vectors cover valid, wrong, malformed, normalized, and unsupported inputs.
- [ ] Real answer mutation updates XP/stats once; retries replay consistently; changed payload/kind conflicts.
- [ ] Answer, hint, and skip reject stale versions without side effects.
- [ ] Same-day/consecutive-day/missed-day streaks work across host/application timezones and DST.
- [ ] Empty queue/catalog, duplicate refill, selector-invalid IDs, refresh races, and reservation failure recovery.
- [ ] Hint counters remain consistent after failure; skips stay neutral for skill updates.
- [ ] Rotation failure/retry preserves old image/JSON, never overwrites archives, and keeps stable IDs/version rules.
- [ ] Image retry then skip/refill, unavailable media, unsupported presentation, and accessible native text.
- [ ] Leaderboard ties use consistent ordering/ranks, and unsupported dashboard metrics are not fabricated.
- [ ] API routes have success/error integration tests; client workflows have Jest/RNTL tests; web flow has Playwright coverage.
- [ ] Built API starts successfully; clean installation, lint, typecheck, and tests pass on the selected toolchain.

## 10. Limits And Reproduction Notes

Standard checks run from the repository root:

```sh
npm run typecheck
npm test
npm run lint
npm ls --all
npm audit --json --cache /tmp/pikpok-review-npm-cache --fetch-retries=0 --fetch-timeout=15000
npm run build --workspace=apps/api -- --outDir /tmp/pikpok-review-api-build --listEmittedFiles
env DATABASE_URL=postgresql://review:review@localhost:5432/review ./node_modules/.bin/prisma validate --schema apps/api/prisma/schema.prisma
```

Expo compatibility check, from `apps/client`:

```sh
EXPO_OFFLINE=1 node ../../node_modules/expo/bin/cli install --check
```

The placeholder database URL is for schema validation only, not a connection or migration instruction. The parser check used TypeScript `createSourceFile`/`parseDiagnostics` over tracked code files. Diagnostic lint used ESLint's programmatic API without editing configurations.

Not established by this review:

- Full PostgreSQL/Redis integration correctness, migration deployment, or archive crash recovery.
- Native iOS/Android behavior or browser screenshots/layout checks.
- Complete Expo export/native builds, clean dependency installation, or load/bundle measurements.
- Guaranteed absence of all bugs, unused dynamic code, or exploitable dependency paths.

Additional native/web risks to verify, not device-reproduced findings: UUID generation may need a native crypto polyfill; web-oriented React Query Devtools are mounted unconditionally; the logout confirmation uses `Alert.alert`, whose web behavior needs checking.

The existing private verification selection, fixed 10/0 answer XP, transactional answer/outbox write, and atomic Redis reservation are useful foundations. Preserve those intentions while completing the missing contracts and fixing the surrounding failures.
