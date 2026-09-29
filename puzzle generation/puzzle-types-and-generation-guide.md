# PikPok: Five Puzzle Types and Generation Guide

This guide collects the five puzzle types discussed for PikPok: **number sequences**, **scheduling/order**, **missing numbers or operators**, **one-true-statement deduction**, and **constrained route planning**.

## At a glance

| Puzzle type | Intended audience | Needs a visual puzzle asset? | Simple answer interaction |
|---|---|---|---|
| Number sequence | Children, 7–13 | No; render as text | Type the missing number(s) |
| Scheduling/order | Young adults, 17–25 | No; a text list or simple timeline is enough | Type the ordered labels |
| Missing numbers/operators | Children, 7–13 | No; render as text/math | Type the missing value(s) or operator(s) |
| One-true-statement deduction | Young adults, 17–25 | No; text is enough | Type the box/person label |
| Constrained route planning | Young adults, 17–25 | Needs a visual map/grid; draw it from structured data | Type the shortest move count |

“Needs a visual puzzle asset” means the puzzle needs a diagram on screen. Route puzzles do **not** need AI-generated bitmap images: store grid cells in JSON and render them consistently in the app. The other four can also have optional illustrations or themes, but those are decoration rather than puzzle content.

## 1. Number sequence

**Audience:** Children, 7–13  
**Display:** Text or a simple row of numbers; no image required.  
**Answer:** One missing number or a short list of missing numbers.

**Example:** `4, 7, 10, ?, 16` — answer: `13`.

**Difficulty variation:**

- Easy: add/subtract a constant; one missing value.
- Medium: multiply or divide by a small number; alternating two simple rules.
- Harder: interleaved sequences, changing differences, or two-step rules, with several terms needed to infer the pattern.
- Adjust number size and whether negative numbers or fractions are allowed for the intended sublevel.

**Generation and validation:** Generate from a named rule, then calculate the answer independently. Reject sequences that fit several plausible simple rules unless the puzzle explicitly provides enough terms to distinguish them. Store the rule in internal solution data so hints can explain the intended pattern.

## 2. Scheduling/order puzzle

**Audience:** Young adults, 17–25  
**Display:** Text clues and labeled slots or a simple timeline; no image required.  
**Answer:** The complete order as labels, entered in one text answer.

**Example:** “A, B, C, and D happen in four different time slots. A is before C. B is immediately after A. C is before D. D is not first.” The puzzle asks for the order.

**Difficulty variation:**

- Easy: 3–4 items, direct before/after clues, and one deduction chain.
- Medium: 4–5 items, immediate-neighbor and position clues, with several clues needed together.
- Harder: 5–6 items and more interacting constraints, while keeping the solution deducible without guessing.
- Vary the theme (events, tasks, trips) without changing the underlying answer rules.

**Generation and validation:** Treat the puzzle as a constraint problem. Enumerate valid orders and keep only puzzles with exactly one solution. The answer checker should normalize harmless formatting differences but compare the final order exactly.

## 3. Missing numbers or operators

**Audience:** Children, 7–13  
**Display:** A text equation; no image required.  
**Answer:** The missing number, operator, or short combination of them.

**Example:** `8 □ 3 = 24` — answer: `×`.

**Difficulty variation:**

- Easy: one blank, small positive integers, and one operation.
- Medium: a missing number with two operations or a missing operator among `+`, `−`, and `×`.
- Harder: longer expressions, division with whole-number results, or parentheses, introduced only when suitable for the age sublevel.
- Avoid creating multiple valid answers unless the instructions ask for all of them.

**Generation and validation:** Evaluate the equation using a defined arithmetic convention, including precedence and parentheses. Brute-force the allowed values/operators to verify that the intended answer is valid and that the answer is unique.

## 4. One-true-statement deduction

**Audience:** Young adults, 17–25  
**Display:** A short text scenario; no image required.  
**Answer:** A single label, such as a box or person name, entered as text.

**Example:** A coin is in one of boxes A, B, C, or D. Exactly one statement is true:

- A: “The coin is in A or B.”
- B: “The coin is in B or C.”
- C: “The coin is in C or D.”
- D: “The coin is in A.”

Answer: `D`.

**Difficulty variation:**

- Easy: 3 possible locations and 3 short statements.
- Medium: 4 locations, with negation or “either/or” statements.
- Harder: 4–5 locations and several statement relationships, such as “exactly two statements are true,” while maintaining a unique answer and readable wording.
- Vary the entities and story setting, but keep the truth rule explicit.

**Generation and validation:** Enumerate every possible hidden location, evaluate every statement, and retain only puzzles with exactly one location satisfying the stated truth condition. Generate hints from eliminations the solver can verify. Avoid relying on subtle wording or unstated assumptions.

## 5. Constrained route planning

**Audience:** Young adults, 17–25  
**Display:** A static grid/map with a start, finish, blocked cells, and optional markers. Render from structured data; no bitmap image is required.  
**Answer:** The minimum number of moves, entered as one number. One move is one step to an adjacent cell; no diagonal moves.

**Example:** Find the shortest route from S to E:

```text
S . #
# . .
# . E
```

Answer: `4` moves.

**Difficulty variation:**

- Easy: small grid, walls only, short route.
- Medium: larger grid with more dead ends or a required checkpoint.
- Harder: visit checkpoints in order, follow a one-way arrow, or use a gate under a clearly stated rule. Add one rule at a time before combining them.
- Increase route-choice density and reasoning depth rather than only making the grid larger.

**Generation and validation:** Use a pathfinding solver to confirm that a route exists and compute the minimum distance. Since the submitted answer is the distance, more than one shortest path can be acceptable; if hints show a specific route, ensure it is valid and has the stated length. Keep the grid static in the app so solving does not require tapping each cell.

## Shared generation rules

1. **Separate audience fit from difficulty.** Audience eligibility controls reading level, themes, and permitted concepts. Difficulty controls the reasoning work. Ages 7–13 cover a wide range, so tune number sizes, reading load, and rule count within that audience.
2. **Use the AI to propose structured puzzles, not certify them.** The generator may draft puzzle content and hints, but deterministic validators must recompute answers, check uniqueness where required, and reject malformed puzzles.
3. **Keep solutions private.** Store canonical solutions and validation data in the trusted backend. The player-facing response should contain only puzzle content and permitted static hints.
4. **Track real variation.** Fingerprint normalized puzzle structures and avoid counting cosmetic relabeling as a new puzzle. A large content pool comes from varied rule combinations, not just randomized wording.
5. **Derive hints from the solution path.** Each hint should reveal the next useful deduction without contradicting the actual generated puzzle.
6. **Keep the app interaction simple.** These formats use a short typed answer. Route puzzles display a diagram, but the player does not select from answer options or manipulate a dense board.

## Audience-category note

The current project overview lists `CHILDREN`, `TEENS`, and `NEURODIVERGENT` audience categories. If 17–25 is a separate product audience, add and define a young-adult eligibility category before assigning these puzzles to it. The project’s numeric `difficultyRating` scale is also still undecided; keep type-specific difficulty features available until that scale is agreed.
