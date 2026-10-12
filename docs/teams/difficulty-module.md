# Difficulty Module Team

## Mandate

**User decision:** The Difficulty Module owns age eligibility policy, difficulty ratings, candidate selection, and rating updates. The Backend enforces the age policy in catalog queries before candidate metadata reaches difficulty ranking.

## Audience rules

| Age in completed years | Result |
|---|---|
| 7–13 | CHILDREN |
| 17–25 | YOUNG_ADULTS |
| 14–16 | AGE_NOT_SUPPORTED |
| Under 7 or over 25 | AGE_NOT_SUPPORTED |

Do not reclassify unsupported ages. The age-policy function accepts an integer age at onboarding and returns the category or AGE_NOT_SUPPORTED. **Recommended privacy default:** persist the derived audienceCategory, not date of birth or exact age. Do not expose audienceCategory in feed cards or public profiles.

The profile flag neurodivergentMode is private and does not change eligibility, puzzle types, ranking, or selection. The Difficulty Module does not receive that flag.

## Puzzle coverage

| Puzzle type | Audience |
|---|---|
| NUMBER_SEQUENCE | CHILDREN |
| MISSING_OPERATOR | CHILDREN |
| SCHEDULING_ORDER | YOUNG_ADULTS |
| ONE_TRUE_STATEMENT | YOUNG_ADULTS |
| CONSTRAINED_ROUTE | YOUNG_ADULTS |

**Repository fact:** The detailed legacy generation schemas call the last three types teen content, while the five-type overview maps them to young adults. **Selected default:** use the overview mapping with the new audience contract; the older detailed mappings are superseded. The conflict is recorded in [contracts.md](../contracts.md).

## Difficulty defaults

**Recommended default for v1:**

- Catalog puzzle difficultyRating: integer from 800 through 2000.
- New user/domain rating: 1400.
- Glicko-2 rating deviation: 350.
- Glicko-2 volatility: 0.06.
- Glicko-2 tau: 0.5.
- Update rating state after each accepted answer event, matching the existing per-answer product flow.
- Keep raw Glicko state mathematically unbounded. Clamp the target used for selection to 800–2000 and reject catalog puzzle ratings outside that range.
- Use the 1400-centered conversion: mu = (rating - 1400) / 173.7178; phi = RD / 173.7178. Convert back with rating = 173.7178 × mu + 1400.

The 800–2000 range is the product difficulty scale for catalog puzzles and selection targets. Formula baselines such as 1200 remain valid if the calibrated result stays in range. Do not restore the earlier 400–2800 bounds or 1500 center.

## What you own

- Age classification and AGE_NOT_SUPPORTED outcome.
- Applying audience and age eligibility policy before difficulty selection.
- Glicko-2 state per user and domain, cold-start initialization, and outcome updates.
- Thompson Sampling statistics per puzzle ID and contentVersion.
- Candidate ranking, exploration, safety limits, diversity, and selection fallback metadata.
- Contracts for eligible-candidate input and ordered puzzle ID output.

## What you receive

From the Software Team Backend:

- Age-policy request at onboarding or feed refill.
- Candidate metadata only after Backend has applied the age filter.
- Puzzle ID, contentVersion, audience eligibility, domain, difficultyRating, recent IDs, and verified outcome events.
- No puzzle text, visual data, image bytes, hints, verification block, exact age after eligibility resolution, or neurodivergentMode flag.

Example selection request and response:

~~~json
{
  "targetRating": 1400,
  "batchSize": 5,
  "candidates": [
    {
      "puzzleId": "sequence-001",
      "contentVersion": 1,
      "type": "NUMBER_SEQUENCE",
      "domain": "math",
      "difficultyRating": 1280
    }
  ]
}
~~~

~~~json
{
  "orderedPuzzleIds": ["sequence-001"]
}
~~~

## What you must not do

- Do not serve content for ages 14–16, under 7, or over 25.
- Do not infer neurodivergence or use neurodivergentMode for puzzle selection.
- Do not receive answers or verify solutions.
- Do not change a puzzle rating outside 800–2000; request regeneration or calibration if the rating is out of range.
- Do not send age-ineligible puzzle metadata to ranking.
- Do not persist date of birth or exact age in this module.

## Mocks until other teams deliver

- Use a pure deterministic age policy fixture covering ages 6, 7, 13, 14, 16, 17, 25, and 26.
- Use a selector stub that orders candidate IDs by absolute distance from targetRating.
- Use fixed outcome events and puzzle ratings in the shared contract examples.
- Use the standard Glicko-2 defaults above until product telemetry supports calibration.

## Definition of done

- Age classification matches the exact boundaries and returns AGE_NOT_SUPPORTED for every unsupported age.
- Age filtering occurs before ranking and is tested at the Backend boundary.
- Puzzle ratings and target ratings obey 800–2000.
- New-user and per-answer rating behavior matches the stated defaults.
- Selection inputs contain metadata only and never expose puzzle text, verification, hints, or neurodivergentMode.
- The Backend can replace the selector mock without changing the shared contract.

## 11. Technical implementation detail and scenarios

### Keep the module pure

Suggested functions are classifyAge, initializeRating, updateRating, clampSelectionTarget, and selectCandidates. They accept JSON-like values and return JSON-like results. Keep clocks, random sources, and persistence injectable so contract fixtures are deterministic. If selection uses randomness, accept an explicit seed or random source and test deterministic behavior.

The Backend remains responsible for the database transaction that creates a User, stores UserRating, fetches catalog candidates, persists an update, and reserves feed cards. The module owns only the calculations and ordering rules.

### Candidate-selection input discipline

Backend must filter candidates before calling the selector by:

- stored audience category and catalog age bounds;
- published state and active IMAGE presentation;
- locale en;
- current image key plus verified image availability;
- supported active puzzle type and valid rating.

The selector may return an ordering and optional internal scores for IDs in the input. Backend verifies each ID appears at most once and exists in its input. Unknown IDs, duplicates, or module exceptions trigger deterministic Backend fallback; they must never widen the candidate pool.

### Rating update lifecycle

The outcome event is generated only after Backend has committed the answer result. It contains stable eventId, domain, current rating state, puzzle rating, and correct/incorrect result. Do not include submittedAnswer, canonicalAnswer, hint content, audience category, exact age, or neurodivergentMode.

If the outbox retries the same event, the update must not apply twice. The simplest in-process prototype can store processed event IDs in Backend persistence and make the adapter call idempotent; if idempotency lives inside this module instead, define the durable boundary explicitly before implementation. A skipped or failed image is not an incorrect outcome.

### Example scenarios

| Input/event | Expected module behavior |
|---|---|
| Age 13 | Return CHILDREN. |
| Age 14 or 16 | Return AGE_NOT_SUPPORTED; no closest-band mapping. |
| Age 17 or 25 | Return YOUNG_ADULTS. |
| New math domain | Initialize at rating 1400, RD 350, volatility 0.06. |
| Target computes to 2050 | Clamp selector target to 2000; retain raw Glicko state separately. |
| Catalog puzzle rating is 2001 | Backend rejects it before selector; module also reports invalid candidate metadata if directly tested. |
| Selector receives only CHILDREN candidates | It can reorder those IDs but cannot add a YOUNG_ADULTS candidate. |
| Correct committed answer | Apply one outcome update; duplicate event does not apply twice. |
| Skip, hint, or media error | No rating update. |
| Module throws during feed | Backend fallback sorts eligible candidates by absolute target distance and stable puzzle ID. |

## 12. Main-codebase PR contents

First merge common age/rating/selector types and vectors. Then merge the module implementation into the planned apps/api/src/difficulty area with no Fastify or Prisma imports. The Software Team Backend owns DifficultyAdapter and swaps its mock for this module.

The handoff PR should include:

- exact input/output interfaces and typed error codes;
- age boundary vectors;
- initialization/conversion/update vectors;
- deterministic selector fixtures;
- duplicate event behavior;
- confirmation that unsupported candidate IDs are rejected;
- one integration example with the Backend mock and one with the module.

Do not bundle edits to feed routes, profile database code, puzzle schemas, or client settings into the Difficulty Module PR.

## 13. Expanded definition of done

A reviewer should be able to call every function from a small fixture without starting the database or API server. The same input and seed yields the same ordered IDs. Every supported/unsupported age boundary matches the contract. An outcome replay has no second effect, and no module input contains the neurodivergentMode flag.

