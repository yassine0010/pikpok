# PikPok — Puzzle Generation Engine: Developer Guidelines & Data Schemas

> **Target Audience:** Puzzle Generation Engineer / Module Developer  
> **Status:** Authoritative Specification & Data Contract  
> **Related Documents:** `Age_Difficulty_Generation_Engines_MASTER_Recap.md`, `technical-architecture.md`, `technical-stack-and-implementation.md`

---

## 1. Quick Start & Mental Model

Welcome! As the owner of the **Puzzle Generation Module**, your job is to build the engine that supplies certified, high-quality, and difficulty-calibrated puzzles for PikPok.

### How your module fits into the system:
```text
┌────────────────────────────────────────────────────────┐
│               PUZZLE GENERATION ENGINE                 │
│                                                        │
│  1. Invert Formula: Target Difficulty (800-2000)       │
│     ↳ Compute Structural Parameters (deterministic)    │
│                                                        │
│  2. AI / LLM Enrichment: Themes, Wording, Cosmetics    │
│     ↳ Constrained JSON Prompting                       │
│                                                        │
│  3. System 1 Deterministic Verification:               │
│     ↳ Recompute Answer independently                   │
│     ↳ Prove Unique Solvability                         │
│     ↳ Compute Anti-Duplication Fingerprint             │
│                                                        │
│  4. Emit Certified Puzzle JSON                         │
└───────────────────────────┬────────────────────────────┘
                            │ Certified Puzzles
                            ▼
┌────────────────────────────────────────────────────────┐
│                   PIKPOK BACKEND                       │
│  - Catalog Store (PostgreSQL / 3,000 active slots)     │
│  - Rotation Scheduler (Content updates & snapshots)    │
│  - Server-Side Answer Verification                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Five Cardinal Rules (Non-Negotiable)

1. **The LLM Never Decides Difficulty:**  
   You must **never** ask an LLM: *"generate a hard puzzle"*. Deterministic math code inverts the difficulty formula to pick structural numbers (e.g., `grid_size = 6, obstacles = 3`). The LLM is only given fixed numbers and writes cosmetic skinning (names, story, theme).
2. **The LLM Never Grades Itself:**  
   The LLM can draft the puzzle, but a deterministic solver written in code (JavaScript/Python) must independently recompute the solution and verify uniqueness. If the solver disagrees or finds multiple solutions, **discard the candidate immediately**.
3. **Strict Separation of Public Content vs. Secret Verification:**  
   The player's client only sees `content` and `staticHints`. The `verification` object (containing the canonical answer, intermediate steps, and solver proofs) **must stay secret** on the server.
4. **Structural Anti-Duplication Fingerprinting:**  
   Puzzles must carry a `fingerprintHash` of their underlying mathematical/logical structure. Renaming "Alice & Bob" to "Charlie & Dana" is a cosmetic re-skin, not a new puzzle.
5. **No Medical / Diagnostic Claims:**  
   For neurodivergent/ADHD puzzles, never use words like "diagnose", "treatment", or "ADHD score". Copy must strictly frame them as adaptive cognitive exercises.

---

## 3. Shared Data Models & TypeScript Types

Every puzzle produced by your engine must adhere to the following TypeScript interfaces:

```typescript
// ============================================================================
// Core Enums & Primitive Types
// ============================================================================

export type AudienceCategory = 'CHILDREN' | 'TEENS' | 'NEURODIVERGENT';

export type PuzzleType =
  | 'NUMBER_SEQUENCE'
  | 'MISSING_OPERATOR'
  | 'SCHEDULING_ORDER'
  | 'ONE_TRUE_STATEMENT'
  | 'CONSTRAINED_ROUTE'
  | 'ADHD_TAP_CHALLENGE';

export type DomainCategory =
  | 'math'
  | 'logic'
  | 'spatial'
  | 'pattern'
  | 'deduction'
  | 'sustained_attention';

// ============================================================================
// Static Hints (3-Tier Structure)
// ============================================================================

export interface StaticHint {
  tier: 1 | 2 | 3;
  type: 'guiding_question' | 'strategic_clue' | 'step_walkthrough';
  content: string;
}

// ============================================================================
// Certified Puzzle Record (Output of Generation Module)
// ============================================================================

export interface GeneratedPuzzle<
  TContent = unknown,
  TVerification = unknown,
  TMetadata = unknown
> {
  /** Unique stable ID (UUID v4 or stable prefix e.g. "puz_seq_001") */
  id: string;

  /** Version of content. New puzzles start at 1. Incremented on rotation. */
  contentVersion: number;

  /** Type of puzzle */
  type: PuzzleType;

  /** Primary skill domain evaluated */
  domain: DomainCategory;

  /** Initial difficulty calculated from structural parameters (800 - 2000 scale) */
  difficultyRating: number;

  /** Breakdown of the structural parameters used in the formula */
  difficultyMetadata: TMetadata;

  /** Age constraints */
  ageFloor: number;
  ageCeiling: number;

  /** Eligible audience buckets */
  audienceCategories: AudienceCategory[];

  /** Structural fingerprint hash (SHA-256) to prevent duplicates */
  fingerprintHash: string;

  /** Client-facing payload (SAFE TO SEND TO MOBILE APP) */
  content: TContent;

  /** Server-only verification payload (NEVER SENT TO CLIENT) */
  verification: TVerification;

  /** 3-tier progressive hints */
  staticHints: StaticHint[];

  /** Timestamp of generation (ISO 8601) */
  createdAt: string;
}

// ============================================================================
// Submission & Verification Interfaces
// ============================================================================

export interface VerifyAnswerInput<TVerification = unknown, TAnswer = unknown> {
  puzzleId: string;
  contentVersion: number;
  verification: TVerification;
  submittedAnswer: TAnswer;
}

export interface VerifyAnswerResult {
  result: 'correct' | 'incorrect';
  message?: string;
}
```

---

## 4. The 6 Puzzle Types: Schemas, Formulas & Examples

---

### Type 1: Number Sequence (`NUMBER_SEQUENCE`)

* **Audience:** `CHILDREN` (Age 7–13)
* **Domain:** `pattern` / `math`
* **Interaction:** Single text input box (e.g., `"13"`).
* **Difficulty Formula (Scale: 800–2000):**
  $$\text{difficulty} = 1200 + (\text{formulaComplexity} \times 180) + ((\text{operandSize} - 5) \times 30) - ((\text{exampleCount} - 3) \times 60)$$
  * `formulaComplexity`: `0` = linear ($+k, -k$), `1` = geometric ($\times k$) or alternating ($+a, -b$), `2` = two-step or quadratic ($n^2$, Fibonacci-style).
  * `operandSize`: Maximum number magnitude (e.g., 10 to 100).
  * `exampleCount`: Number of terms shown before the missing one (3 to 6).

#### JSON Schema & Example
```json
{
  "id": "puz_seq_001",
  "contentVersion": 1,
  "type": "NUMBER_SEQUENCE",
  "domain": "pattern",
  "difficultyRating": 1110,
  "difficultyMetadata": {
    "formulaComplexity": 0,
    "operandSize": 16,
    "exampleCount": 4,
    "ruleName": "arithmetic_addition",
    "step": 3
  },
  "ageFloor": 7,
  "ageCeiling": 13,
  "audienceCategories": ["CHILDREN"],
  "fingerprintHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "content": {
    "prompt": "Find the missing number in the sequence.",
    "sequence": [4, 7, 10, null, 16],
    "displayFormat": "4, 7, 10, ?, 16",
    "inputPlaceholder": "Type the missing number"
  },
  "verification": {
    "canonicalAnswer": 13,
    "acceptedAnswers": ["13"],
    "ruleDescription": "Add 3 to each previous number.",
    "formula": "n_k = n_{k-1} + 3"
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "Look at how much the numbers increase between 4, 7, and 10."
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "Each number is 3 greater than the one before it."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "Start at 10 and add 3: 10 + 3 = 13. Check: 13 + 3 = 16, which matches the last number!"
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

### Type 2: Missing Numbers or Operators (`MISSING_OPERATOR`)

* **Audience:** `CHILDREN` (Age 7–13)
* **Domain:** `math`
* **Interaction:** Single text input box (e.g. `"x"` or `"*"` or `"3"`).
* **Difficulty Formula:**
  $$\text{difficulty} = 1200 + ((\text{stepCount} - 1) \times 120) + (\text{operatorComplexity} \times 100) + (\text{operandMagnitude} \times 20)$$
  * `stepCount`: `1` (single operation: `8 □ 3 = 24`), `2` (two operations: `4 □ 2 + 1 = 9`).
  * `operatorComplexity`: `0` ($+, -$), `1` ($\times$), `2` ($\div$ with integer results).
  * `operandMagnitude`: Scale factor based on digit size.

#### JSON Schema & Example
```json
{
  "id": "puz_math_001",
  "contentVersion": 1,
  "type": "MISSING_OPERATOR",
  "domain": "math",
  "difficultyRating": 1300,
  "difficultyMetadata": {
    "stepCount": 1,
    "operatorComplexity": 1,
    "missingType": "operator",
    "operandMagnitude": 1
  },
  "ageFloor": 7,
  "ageCeiling": 13,
  "audienceCategories": ["CHILDREN"],
  "fingerprintHash": "9f83c604b901a8303e481b4b1a26d7f02d098e1a12e3e5a329486c8f9b9a6789",
  "content": {
    "prompt": "Which math sign belongs in the box?",
    "equation": "8 □ 3 = 24",
    "allowedSymbols": ["+", "-", "×", "÷"],
    "inputPlaceholder": "Type +, -, x, or /"
  },
  "verification": {
    "canonicalAnswer": "×",
    "acceptedAnswers": ["x", "X", "×", "*"],
    "explanation": "8 multiplied by 3 equals 24."
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "Is 24 larger or smaller than 8? Does that eliminate subtraction?"
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "Think about your multiplication times tables for 8."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "8 + 3 = 11, which is too small. 8 × 3 = 24. Therefore, the missing symbol is ×."
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

### Type 3: Scheduling / Order Puzzle (`SCHEDULING_ORDER`)

* **Audience:** `TEENS` (Age 13–17)
* **Domain:** `logic` / `deduction`
* **Interaction:** Ordered labels string (e.g. `"BACD"` or `"B, A, C, D"`).
* **Difficulty Formula:**
  $$\text{difficulty} = 1200 + ((\text{itemCount} - 3) \times 140) + (\text{constraintComplexity} \times 110)$$
  * `itemCount`: Number of elements to arrange (4 to 6).
  * `constraintComplexity`: `1` = simple direct relative clues ("A before B"), `2` = immediate adjacency ("B is directly after A"), `3` = negative/positional boundaries ("D is not first", "at least two slots between C and A").

#### JSON Schema & Example
```json
{
  "id": "puz_ord_001",
  "contentVersion": 1,
  "type": "SCHEDULING_ORDER",
  "domain": "logic",
  "difficultyRating": 1450,
  "difficultyMetadata": {
    "itemCount": 4,
    "constraintComplexity": 2,
    "items": ["A", "B", "C", "D"]
  },
  "ageFloor": 13,
  "ageCeiling": 17,
  "audienceCategories": ["TEENS"],
  "fingerprintHash": "4a5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef01234",
  "content": {
    "prompt": "Determine the exact order in which four speakers (A, B, C, D) give their presentations.",
    "items": [
      {"id": "A", "label": "Speaker A"},
      {"id": "B", "label": "Speaker B"},
      {"id": "C", "label": "Speaker C"},
      {"id": "D", "label": "Speaker D"}
    ],
    "clues": [
      "Speaker A speaks before Speaker C.",
      "Speaker B speaks immediately after Speaker A.",
      "Speaker C speaks before Speaker D.",
      "Speaker D is not first."
    ],
    "inputPlaceholder": "Enter order (e.g. ABCD)"
  },
  "verification": {
    "canonicalOrder": ["A", "B", "C", "D"],
    "acceptedAnswers": ["ABCD", "A, B, C, D", "A B C D", "A-B-C-D"],
    "deductionChain": [
      "A is before C and B is immediately after A -> [A, B] block exists before C.",
      "C is before D -> [A, B] ... C ... D.",
      "With 4 slots total, the only valid placement is 1: A, 2: B, 3: C, 4: D."
    ],
    "uniqueSolutionVerified": true
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "Since B is immediately after A, treat [A, B] as a single linked block."
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "The [A, B] block must come before C, and C must come before D."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "Put [A, B] in slots 1 and 2. Slot 3 must be C because it comes before D. Slot 4 is D. The complete order is ABCD."
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

### Type 4: One-True-Statement Deduction (`ONE_TRUE_STATEMENT`)

* **Audience:** `TEENS` (Age 13–17)
* **Domain:** `deduction`
* **Interaction:** Single character/label string (e.g. `"D"`).
* **Difficulty Formula:**
  $$\text{difficulty} = 1200 + ((\text{entityCount} - 3) \times 150) + ((\text{inferenceDepth} - 1) \times 150)$$
  * `entityCount`: Number of options (3, 4, or 5).
  * `inferenceDepth`: `1` = simple direct contradiction, `2` = compound/disjunctive statements ("in A or B"), `3` = second-order truth assertions.

#### JSON Schema & Example
```json
{
  "id": "puz_ots_001",
  "contentVersion": 1,
  "type": "ONE_TRUE_STATEMENT",
  "domain": "deduction",
  "difficultyRating": 1500,
  "difficultyMetadata": {
    "entityCount": 4,
    "inferenceDepth": 2,
    "truthRule": "EXACTLY_ONE_TRUE"
  },
  "ageFloor": 13,
  "ageCeiling": 17,
  "audienceCategories": ["TEENS"],
  "fingerprintHash": "c2b1a39f88d4e56a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
  "content": {
    "scenario": "A gold coin is hidden in one of four locked boxes: A, B, C, or D. Each box has an inscription, but EXACTLY ONE inscription is true. The other three are false.",
    "statements": [
      {"label": "Box A", "text": "The coin is in Box A or Box B."},
      {"label": "Box B", "text": "The coin is in Box B or Box C."},
      {"label": "Box C", "text": "The coin is in Box C or Box D."},
      {"label": "Box D", "text": "The coin is in Box A."}
    ],
    "question": "Which box contains the coin?",
    "inputPlaceholder": "Type the box letter (A, B, C, or D)"
  },
  "verification": {
    "canonicalAnswer": "D",
    "acceptedAnswers": ["D", "Box D", "d"],
    "analysisPerLocation": {
      "coin_in_A": {"trueStatements": ["Box A", "Box D"], "valid": false},
      "coin_in_B": {"trueStatements": ["Box A", "Box B"], "valid": false},
      "coin_in_C": {"trueStatements": ["Box B", "Box C"], "valid": false},
      "coin_in_D": {"trueStatements": ["Box C"], "valid": true}
    },
    "uniqueSolutionVerified": true
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "Test each box one by one. If the coin were in Box A, how many statements would be true?"
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "Notice that if the coin is in A, B, or C, at least two statements are immediately true, violating the rule."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "If the coin is in D: Box A is False, Box B is False, Box D is False, and Box C ('C or D') is True. Exactly one statement is true, so the coin is in Box D."
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

### Type 5: Constrained Route Planning (`CONSTRAINED_ROUTE`)

* **Audience:** `TEENS` (Age 13–17)
* **Domain:** `spatial`
* **Display:** App draws grid from structured cells (no bitmap images!).
* **Interaction:** Numeric input of shortest distance (e.g. `"4"`).
* **Difficulty Formula:**
  $$\text{difficulty} = 1200 + ((\text{gridSize} - 6) \times 50) + (\text{obstacleCount} \times 40) + (\text{branchPoints} \times 60)$$

#### JSON Schema & Example
```json
{
  "id": "puz_route_001",
  "contentVersion": 1,
  "type": "CONSTRAINED_ROUTE",
  "domain": "spatial",
  "difficultyRating": 1340,
  "difficultyMetadata": {
    "gridRows": 3,
    "gridCols": 3,
    "gridSize": 6,
    "obstacleCount": 3,
    "branchPoints": 1
  },
  "ageFloor": 13,
  "ageCeiling": 17,
  "audienceCategories": ["TEENS"],
  "fingerprintHash": "789abcde0123456789abcdef0123456789abcdef0123456789abcdef01234567",
  "content": {
    "prompt": "Find the minimum number of moves to navigate from Start (S) to Exit (E). You can only move up, down, left, or right. You cannot pass through blocked cells (#).",
    "grid": {
      "rows": 3,
      "cols": 3,
      "cells": [
        ["S", ".", "#"],
        ["#", ".", "."],
        ["#", ".", "E"]
      ]
    },
    "legend": {
      "S": "Start",
      "E": "Exit",
      ".": "Open Path",
      "#": "Blocked Wall"
    },
    "inputPlaceholder": "Enter number of moves"
  },
  "verification": {
    "minimumMoves": 4,
    "acceptedAnswers": ["4", "4 moves"],
    "canonicalPathCoordinates": [
      {"r": 0, "c": 0},
      {"r": 0, "c": 1},
      {"r": 1, "c": 1},
      {"r": 2, "c": 1},
      {"r": 2, "c": 2}
    ],
    "bfsDistanceVerified": true
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "From 'S' at (0,0), notice the cell below is blocked. Where must your first move go?"
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "Your first step must be right to (0,1). From there, you must step down into the open corridor."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "Move (0,0) -> (0,1) [1 move], -> (1,1) [2 moves], -> (2,1) [3 moves], -> (2,2) [4 moves]. The minimum number of moves is 4."
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

### Type 6: ADHD Target / Distractor Tap Challenge (`ADHD_TAP_CHALLENGE`)

* **Audience:** `NEURODIVERGENT` profile (Available for both children & teens)
* **Domain:** `sustained_attention`
* **Interaction:** Client streams tap timestamps during a trial sequence; verifier scores rule matching.
* **Difficulty Formula:**
  $$\text{difficulty} = 1200 + (\text{similarityLevel} \times 100) + (\text{distractorDensity} \times 80) - (\text{targetFrequency} \times 60) + (\text{ruleSwitchCount} \times 90) - (\text{responseWindowMs} / 50)$$
  * Range: approx 1000 (easy) to 1900 (hard).
  * **Critical Rule:** Modify **one dimension at a time** when tuning difficulty.

#### JSON Schema & Example
```json
{
  "id": "puz_adhd_001",
  "contentVersion": 1,
  "type": "ADHD_TAP_CHALLENGE",
  "domain": "sustained_attention",
  "difficultyRating": 1200,
  "difficultyMetadata": {
    "similarityLevel": 1,
    "distractorDensity": 2,
    "targetFrequency": 3,
    "ruleSwitchCount": 0,
    "responseWindowMs": 1500,
    "totalTrials": 10
  },
  "ageFloor": 7,
  "ageCeiling": 17,
  "audienceCategories": ["NEURODIVERGENT"],
  "fingerprintHash": "3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
  "content": {
    "instructions": "Tap every BLUE STAR as soon as it appears. Ignore RED STARS.",
    "responseWindowMs": 1500,
    "interStimulusIntervalMs": 500,
    "stimuli": [
      {"trialIndex": 0, "shape": "star", "color": "blue", "isTarget": true},
      {"trialIndex": 1, "shape": "star", "color": "red", "isTarget": false},
      {"trialIndex": 2, "shape": "star", "color": "blue", "isTarget": true},
      {"trialIndex": 3, "shape": "star", "color": "red", "isTarget": false},
      {"trialIndex": 4, "shape": "star", "color": "blue", "isTarget": true},
      {"trialIndex": 5, "shape": "star", "color": "red", "isTarget": false},
      {"trialIndex": 6, "shape": "star", "color": "blue", "isTarget": true},
      {"trialIndex": 7, "shape": "star", "color": "blue", "isTarget": true},
      {"trialIndex": 8, "shape": "star", "color": "red", "isTarget": false},
      {"trialIndex": 9, "shape": "star", "color": "blue", "isTarget": true}
    ]
  },
  "verification": {
    "scoringRule": "REALTIME_MATCH",
    "targetTrialIndices": [0, 2, 4, 6, 7, 9],
    "distractorTrialIndices": [1, 3, 5, 8],
    "passingAccuracy": 0.8,
    "maxFalsePositiveAllowed": 1
  },
  "staticHints": [
    {
      "tier": 1,
      "type": "guiding_question",
      "content": "Keep your finger centered and watch for color before tapping."
    },
    {
      "tier": 2,
      "type": "strategic_clue",
      "content": "Only tap on BLUE stars. Take a breath and let the red stars pass without tapping."
    },
    {
      "tier": 3,
      "type": "step_walkthrough",
      "content": "Look for the blue color tone. When blue appears, tap once. When red appears, hold your finger still."
    }
  ],
  "createdAt": "2026-09-29T12:00:00.000Z"
}
```

---

## 5. Verification & Anti-Duplication Engine ("System 1")

Before any generated puzzle is certified and added to the database catalog, it must pass a **5-step deterministic verification pipeline**:

```text
[Generated Candidate]
         │
         ▼
 1. Schema Validation (Zod schema checking all required fields)
         │
         ▼
 2. Deterministic Re-solver (BFS pathfinder / SAT solver / Equation solver)
    ↳ Did it find a solution? If NO -> DISCARD.
    ↳ Is the answer UNIQUE? If NO -> DISCARD.
    ↳ Does solver answer match candidate verification? If NO -> DISCARD.
         │
         ▼
 3. Formula Calibration Check
    ↳ Recompute difficultyRating = Formula(difficultyMetadata).
    ↳ Must match candidate difficultyRating.
         │
         ▼
 4. Structural Fingerprint Hash
    ↳ Hash(canonical mathematical representation).
    ↳ If hash already exists in DB -> DISCARD (Cosmetic duplicate).
         │
         ▼
 5. Hint Verification
    ↳ Verify Tier 1, 2, and 3 hints do not contradict the canonical solution.
         │
         ▼
  [CERTIFIED PUZZLE READY FOR CATALOG]
```

### Implementing the Structural Fingerprint

To prevent cosmetic duplicates (e.g. changing names or symbols), create a normalized string of the underlying structure before hashing:

```typescript
import { createHash } from 'crypto';

export function computeSequenceFingerprint(sequence: (number | null)[]): string {
  // Normalize sequence differences
  return createHash('sha256')
    .update(`SEQ:${sequence.map(n => n === null ? '?' : n).join(',')}`)
    .digest('hex');
}

export function computeGridFingerprint(grid: string[][]): string {
  return createHash('sha256')
    .update(`GRID:${grid.map(row => row.join('')).join('|')}`)
    .digest('hex');
}
```

---

## 6. AI Prompting Guidelines & Guardrails

When using an LLM (e.g. Gemini 1.5 Pro / GPT-4o) to generate candidate wording:

### Strict System Prompt Rule
* Instruct the LLM that it is a **pure JSON generator**.
* Provide the exact structural parameters generated by your code in the prompt.
* Forbid the LLM from changing or deciding numbers.

### Example Generation Prompt Template:
```text
You are an expert puzzle author for PikPok.
Your task is to create cosmetic story text and theme for a Logic Scheduling Puzzle.

STRICT STRUCTURAL PARAMETERS (DO NOT CHANGE):
- Items to arrange: exactly 4 items (Labels: A, B, C, D)
- Constraint 1: A is before C
- Constraint 2: B is immediately after A
- Constraint 3: C is before D
- Constraint 4: D is not first
- Unique Solution: A, B, C, D

OUTPUT FORMAT:
Emit ONLY a valid JSON object matching the Schema. No conversational text.
Ensure hints progress from gentle nudge (Tier 1) to strategic clue (Tier 2) to full solution (Tier 3).
```

---

## 7. How to Deliver Your Puzzles to the Backend

When exporting generated batches for seed ingestion or rotation updates:

1. **Batch File Format:** Export arrays of `GeneratedPuzzle` objects saved as `.json` files:
   ```text
   seed-puzzles-number-sequence.json
   seed-puzzles-scheduling-order.json
   seed-puzzles-adhd-tap.json
   ```
2. **Initial Catalog Volume:**
   The backend needs **3,000 total live puzzles** in the initial catalog. Recommended split across the 6 launch types:
   * `NUMBER_SEQUENCE`: 600 puzzles (spread evenly from 800 to 1800 rating)
   * `MISSING_OPERATOR`: 600 puzzles (spread evenly from 800 to 1800 rating)
   * `SCHEDULING_ORDER`: 600 puzzles (spread evenly from 1000 to 2000 rating)
   * `ONE_TRUE_STATEMENT`: 500 puzzles (spread evenly from 1100 to 2000 rating)
   * `CONSTRAINED_ROUTE`: 400 puzzles (spread evenly from 1000 to 1900 rating)
   * `ADHD_TAP_CHALLENGE`: 300 puzzles (spread across 1000 to 1800 rating)

---

## 8. Summary Checklist for the Puzzle Generation Engineer

- [ ] **Step 1:** Implement parameter generator functions that invert the difficulty formulas to produce fixed structural parameters for any target rating.
- [ ] **Step 2:** Build deterministic solvers in code for each type to independently verify existence and uniqueness of solutions.
- [ ] **Step 3:** Implement structural fingerprinting functions (`sha256`) to reject duplicate puzzle skeletons.
- [ ] **Step 4:** Integrate LLM call to populate cosmetic themes and story elements while keeping structural numbers locked.
- [ ] **Step 5:** Package certified puzzle records into the exact `GeneratedPuzzle` JSON schema specified above.
- [ ] **Step 6:** Export the initial batch of 3,000 certified puzzles for database seed insertion.
