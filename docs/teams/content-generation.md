# Content Generation Team

## Mandate

**User decision:** Content Generation owns puzzle generation and image generation. It produces certified private puzzle records and versioned images. The generated image is the visual puzzle display in v1.

## Audience and active puzzle coverage

| Puzzle type | Audience | Answer type |
|---|---|---|
| NUMBER_SEQUENCE | CHILDREN, ages 7–13 | NUMBER or NUMBER_LIST |
| MISSING_OPERATOR | CHILDREN, ages 7–13 | OPERATOR, NUMBER, or NUMBER_LIST |
| SCHEDULING_ORDER | YOUNG_ADULTS, ages 17–25 | LABEL_LIST |
| ONE_TRUE_STATEMENT | YOUNG_ADULTS, ages 17–25 | LABEL |
| CONSTRAINED_ROUTE, asking for minimum move count | YOUNG_ADULTS, ages 17–25 | NUMBER |

**Repository fact:** The five-type overview maps the final three types to young adults, while their detailed legacy generation sections map them to teens. **Selected default:** use the five-type overview and the current two-category decision. The detailed legacy mappings are superseded for v1. See [contracts.md](../contracts.md).

Ages 14–16 and ages outside 7–13 and 17–25 are unsupported. Do not assign them to another audience. The private neurodivergentMode setting does not change puzzle eligibility or selection.

## What you own

- Puzzle content and structured visual data for the five active puzzle types.
- A private verification block containing answerType, canonicalAnswer, and acceptedAnswers. All three answer values are strings.
- Deterministic solution checking and certification that each published puzzle has exactly one canonical solution.
- Static hint text and the public accessibilityText describing visual information.
- A deterministic English-only image template registry and image generation.
- Image metadata identifying the template version, image format, and checksum.

## What you output

An internal puzzle record follows the schema in [contracts.md](../contracts.md). The abbreviated example shows the required separation between text, visual data, image accessibility, and private verification.

~~~json
{
  "id": "sequence-001",
  "contentVersion": 1,
  "type": "NUMBER_SEQUENCE",
  "presentation": "IMAGE",
  "locale": "en",
  "audienceCategories": ["CHILDREN"],
  "ageFloor": 7,
  "ageCeiling": 13,
  "difficultyRating": 1280,
  "content": {
    "textBlocks": [
      {"role": "prompt", "text": "Find the missing number."}
    ],
    "visualData": {"kind": "sequence", "terms": [4, 7, 10, null, 16]},
    "answerInput": {"kind": "text", "placeholder": "Enter the number"}
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

The image output is an artifact plus a manifest, not an answer-bearing client field:

~~~json
{
  "puzzleId": "sequence-001",
  "contentVersion": 1,
  "mediaType": "image/png",
  "templateId": "number-sequence",
  "templateVersion": 1,
  "sha256": "content-hash",
  "stagingKey": "temporary-render-reference"
}
~~~

## Prompt-text decision

**Recommended default:** deliver prompts, scenarios, and written clues as structured text beside the image. The image template renders only the visual portion, such as the sequence layout, grid, symbols, or labeled objects. It does not rasterize prompt prose, clues, hints, explanations, or answer controls.

Effects:

- **Templates:** use an English-only, deterministic template per puzzle type; select by puzzle type and audience. Locale is always en. No language variants or right-to-left layouts.
- **JSON:** keep textBlocks, visualData, and accessibilityText as distinct fields. Image rendering receives visualData and required display metadata only; it never receives verification or hints.
- **Frontend:** render textBlocks as native text next to the image. Screen readers receive that text and accessibilityText for the visual. The image itself remains the visual puzzle display; there is no app-drawn visual fallback.

The neurodivergentMode settings remain exactly as specified: larger text for hints and the answer box, reduced motion, calmer styling, and no timers. Prompt text stays structured and platform-accessible. The v1 flag does not enlarge prompt text or change puzzle content or selection; the app may honor general platform text scaling.

## What you receive

From the Software Team Backend rotation worker:

- Stable puzzle ID and next contentVersion.
- One of the five active puzzle types and its assigned audience.
- Target difficultyRating within 800–2000.
- English locale.
- Rotation request and generation constraints.

The image renderer receives an allowlisted projection of the generated puzzle: type, audience, locale, visualData, and display dimensions. It does not receive verification, hints, explanations, user data, or telemetry.

## What you must not do

- Do not grade user submissions or implement answer endpoint behavior.
- Do not add puzzle-type-specific answer checkers. Select one shared answerType and provide vectors for its generic comparator.
- Do not put canonical answers, accepted answers, hints, explanations, controls, correctness feedback, difficulty ratings, or user data in an image.
- Do not generate or publish presentation INTERACTIVE in v1.
- Do not choose audience from neurodivergentMode.
- Do not emit a locale other than en.
- Do not store or serve live/archive assets; the Backend owns storage and publication.

## Mocks until other teams deliver

- Use fixed certified fixtures for all five types.
- Use a deterministic placeholder PNG generator that returns a valid image manifest and accessibilityText.
- Use the shared answer test vectors in contracts.md while the Backend comparator is in progress.
- Keep image generation behind an interface so the Backend can use the placeholder manifest until the renderer is ready.

## Definition of done

- Every puzzle passes the shared schema and has presentation IMAGE and locale en.
- The assigned audience, age bounds, rating, and type agree with the contracts.
- A deterministic solver certifies exactly one solution and the private string verification values match it.
- Each answerType has positive and negative shared vectors.
- Image templates render the visual data faithfully and return a checksum and template version.
- The prompt and clues remain structured text; accessibilityText fully describes the visual information needed by a screen reader.
- No private verification or hint text reaches the image renderer or image pixels.
- The output is ready for Backend validation and versioned publication.

## 9. Technical implementation sequence and edge cases

### Planned source locations

For the prototype monorepo, implement these as in-process modules in the planned API workspace:

~~~text
apps/api/src/generation/puzzle/   # builders, type-specific solvers, certification
apps/api/src/generation/image/    # audience/type template map and PNG renderer
apps/api/src/adapters/content-generation.ts
apps/api/src/workers/rotation.ts
common/schemas/
common/mocks/content-generation.ts
~~~

The generator and image renderer remain one team boundary but separate internal modules. Backend invokes them through ContentGenerationAdapter; neither module writes Prisma rows or live/archive files.

### Generator boundary

Define one input type and one output envelope in common. The request should contain only puzzleId, contentVersion, puzzle type, audience, target difficulty, locale en, presentation IMAGE, and optional deterministic seed. The output envelope contains the internal puzzle, uniqueness certification, and an image artifact manifest. Keep transport and local file access out of generator code.

Recommended pipeline:

1. Validate the request against the shared schema.
2. Select a generator implementation by puzzle type. This is puzzle construction, not answer grading.
3. Build candidate visualData and separate textBlocks, accessibilityText, answerInput, and hints.
4. Run the type's solver and count solutions. Accept only a single solution.
5. Convert that solution to a string VerificationBlock and check it against the matching shared answer vector.
6. Compute a structural fingerprint and reject duplicates.
7. Resolve the template from the central type/audience map.
8. Pass a sanitized render input containing visualData and presentation metadata only.
9. Render PNG, compute checksum, validate dimensions and manifest, then return both candidate and artifact reference.

The renderer must not receive the InternalPuzzle object wholesale. Use a render-specific type that has no verification, hints, prompt text, answerInput, or user fields; that makes accidental disclosure harder to introduce.

### Type-specific uniqueness checks

The solvers differ by puzzle family, but their output must converge on the same certificate shape: solutionCount equals one, answerType is one of the five supported values, canonicalAnswer is a string, and acceptedAnswers is a string array. Preserve family-specific proof data privately for diagnostics if needed. Do not make the Backend understand those proofs.

For route puzzles in v1, certify the minimum move count and store that count as a NUMBER string. Do not return the path as a LABEL_LIST. Scheduling order uses stable labels; one-true puzzles return one stable label. If the only way to represent a puzzle answer requires an unlisted answerType, stop generation and request a contract decision.

### Deterministic template rendering

Keep a versioned manifest for each template. Visual layout changes that can affect interpretation require a templateVersion increment and new puzzle contentVersion. The template map selects a template by puzzle type and audience; it does not inspect profile settings. Test that the same seed, input, and template version generate the same geometry and checksum under the chosen rendering stack.

A template may draw numbers, symbols, labels, a route grid, or other diagram elements from visualData. It must not draw the prompt, written scenario/clues, hint text, explanation, answer, input placeholder, or feedback. AccessibilityText is authored separately and checked against the same visualData fixture.

### Local development scenarios

- If Backend uses the placeholder generator, its fixture must still have a valid visualData object and placeholder PNG manifest. This verifies the entire publication path.
- If a real candidate is unique but too dense for the selected template, reject rendering and regenerate or simplify the candidate; never clip away a clue.
- If template selection is ambiguous, reject with TEMPLATE_NOT_FOUND instead of choosing a random template.
- If accessibilityText and rendered visual disagree, fail fixture review before publication.
- If Backend times out after generation, a repeated rotation request should use the same deterministic seed/job identity or produce a new candidate under a new request ID; never publish a half-response.

## 10. Main-codebase PR contents

Once the common workspace exists, implement generator code under apps/api/src/generation/puzzle/ and image rendering under apps/api/src/generation/image/. Split the handoff into two reviewable changes:

1. Shared contract/fixture change: schema, types, test data, and sample InternalPuzzle plus image manifest.
2. Generator/renderer change: pure generation pipeline behind the adapter interface, deterministic local renderer, uniqueness checks, and failure codes.

The first change should merge before the second. The Content Generation PR must import common; it should not edit API routes, Prisma models, live/archive files, or the Frontend. Backend can merge its integration adapter against the stub before this team implementation arrives, then switch the adapter implementation without changing feed contracts.

## 11. Expanded definition of done

In addition to the checklist above, a reviewer can trace one fixture through: generation request → unique solver result → private VerificationBlock → sanitized renderer input → PNG checksum/manifest → Backend schema validation. The trace must show that the exact prompt text, accepted answer list, hints, profile settings, and answer control never enter the renderer.

