# PikPok — Age Engine, Difficulty Engine & Puzzle Generation: Full Technical Recap

**Purpose of this document:** a complete, implementation-ready reference
covering the Age Engine, the Difficulty Engine, and the Puzzle Generation
Engine that supplies both of them. This consolidates every design decision,
formula, and workflow discussed, in the order needed to understand and build
the system.

---

## 1. Introduction — what these engines are, and how they relate

This document covers three engines that work together in sequence:

| Engine | Runs | Answers |
|---|---|---|
| Age Engine | Once, at signup | "Who is this person, what's appropriate for them?" |
| Difficulty Engine | After every puzzle | "What's their current skill, what should come next?" |
| Puzzle Generation Engine | Continuously, in the background | "What puzzles need to exist, at what difficulty, to serve the above?" |

They sit downstream of, and depend on, a separate system: **puzzle
correctness and duplication verification** (covered in a companion document,
"System 1"). By the time a puzzle reaches the Age or Difficulty Engine, it
has already been proven correct, unique, and non-duplicate. None of what
follows re-checks that — these engines only decide **which certified puzzle
a specific user sees, and when**, and **what new puzzles need to be produced
to keep that possible.**

The full relationship:

Puzzle Generation Engine produces candidate puzzles → System 1 verifies and
certifies them → certified pool → Age Engine filters by appropriateness →
Difficulty Engine selects the best match from what remains → served to the
user → outcome feeds back to update both the user's skill rating and the
puzzle's difficulty rating.

---

## 2. The problems being solved

**Age/policy problems:**
- Different ages need different content, tone, and difficulty starting points.
- Age-appropriateness must never depend on a learning algorithm getting it right — a bug in a statistical system should never be able to expose a child to inappropriate content.

**Difficulty/learning problems:**
- Users differ in skill, and skill differs by domain even within one user.
- A handful of puzzle attempts isn't enough to know someone's "true" skill — you need to track confidence, not just an estimate.
- Always picking the "best known" puzzle for a difficulty band creates staleness — new and under-tested puzzles never get a fair trial.
- A statistically "correct" choice can still feel bad to a real person (too hard, too easy, breaks a streak unfairly).

**Generation/supply problems:**
- Puzzles need to exist at the right difficulty, for the right puzzle type, before the Difficulty Engine can select them — someone has to decide what to generate and at what difficulty.
- At production scale, this can't depend on hand-authoring every puzzle type and every variant (themes for schools, accessibility adaptations) — that doesn't scale.

---

## 3. The Age Engine (policy layer)

### 3.1 Step 1 — Age band declaration

- The user (or parent) explicitly declares an age band: **under 13 / 13–17 / 18+**.
- Never inferred from behavior — required by both the underlying research and compliance (COPPA and equivalents).
- This declaration sets a **tone token** used later by hint/explanation generation:
  - `child` → colorful, reward-driven, simple explanations
  - `teen` → fast, competitive, social framing
  - `adult` → thorough, detailed walkthroughs

### 3.2 Step 2 — Starting skill priors per domain (cold-start calibration)

- New users do **not** start at one flat rating (e.g. 1200 for everyone).
- Instead, use the **median rating of other users in the same age band**, independently for each of five skill domains (logic, spatial, math, word, pattern).
- A 9-year-old's starting math rating differs from their own starting word rating, and differs again from a 15-year-old's starting math rating — 5 domains × 3 age bands = 15 independent starting points.
- Before enough population data exists (roughly the first 30 days), these priors are hand-set from developmental research; after that, updated weekly from a rolling median of real user data.

### 3.3 Step 3 — Hard filter at query time (database layer)

- Every puzzle in the catalog carries two fields: `age_floor` and `age_ceiling`.
- Example: `age_floor: 13, age_ceiling: 99` means "13 and up, no upper limit." `age_floor: 6, age_ceiling: 12` means "children only."
- The query that supplies candidates to the Difficulty Engine always includes this filter: puzzle rating within the target band **AND** `age_floor <= user_age <= age_ceiling`.
- **Critical design point:** the Difficulty Engine never sees age-inappropriate puzzles — it doesn't know they exist. This is a compliance safeguard and a personalization mechanism at the same time, and it makes auditing trivial: "why did this user see this puzzle" reduces to "check the age filter, check the difficulty band."

### 3.4 Why this design, specifically

- Separates legal/policy concerns (age gating) from algorithmic concerns (difficulty) — a mistake in the learning algorithm can never leak into an age-inappropriate puzzle, because age filtering happens at a layer the difficulty algorithm doesn't control and doesn't see past.

---

## 4. The Difficulty Engine (learning layer)

Mental model: each user has five invisible skill scores (one per domain).
After every puzzle, those scores update based on performance. The engine
then picks the next puzzle based on the updated scores.

### 4.1 Component 1 — Glicko-2 rating system

**What it is:** an evolution of the Elo rating system (used in chess).
Instead of one number, it tracks three per user per domain:

| Number | Meaning |
|---|---|
| `rating` | best estimate of current skill (0–3000 scale, typical range 800–2000) |
| `RD` (Rating Deviation) | uncertainty/confidence — high RD (e.g. 350) = very uncertain; low RD (e.g. 60) = very certain. Starts high for new users, shrinks with consistent play, grows during inactivity |
| `volatility` | how erratically performance fluctuates — low = consistent performer, high = unpredictable |

**Why Glicko-2 instead of plain Elo:** plain Elo gives one number with no
confidence bound — you can't tell if a 1200 is a "true" 1200 or noise from a
small sample. Glicko-2's RD naturally handles cold-start (wide net when
uncertain, tight targeting when confident) with no separate tuning
parameter, and RD also naturally models inactivity (forgetting increases
uncertainty over time).

**Update mechanism:** telemetry is batched and flushed every 5 seconds; the
Glicko-2 update formula runs per user per domain on that batch, updating all
three numbers simultaneously. This is deterministic, published math (Mark
Glickman's original formula) — not a black box.

**Outcome scoring — 0 to 1 scale, not binary:**

| Outcome value | Meaning |
|---|---|
| 1.0 | solved correctly, no hints needed |
| 0.7 | solved correctly, used hint tier 1 |
| 0.5 | solved correctly, used hint tier 2 |
| 0.4 | solved correctly, used hint tier 3 (full walkthrough) |
| 0.2 | couldn't solve, but stayed and retried (learning signal) |
| 0.0 | swiped away / abandoned without trying |

A user who needed a hint still learned something — this richer signal
captures that difference, instead of collapsing everything into pass/fail.

**Worked example:** two new users both start at rating 1200, RD 350.
- User A: 10 logic puzzles, 7/10 correct, consistent timing → ends at rating 1280, RD 240, volatility 0.06. System is confident; gets tightly-targeted difficulty going forward.
- User B: same 7/10, but erratic (right/wrong/right/right/wrong…) → ends at rating 1240, RD 220, volatility 0.15. System is less confident; gets a wider range of difficulty (higher RD = wider net).

### 4.2 Component 2 — Thompson Sampling puzzle selector

**The problem it solves:** once Glicko-2 narrows the target to "around
1250," there are still many candidate puzzles in that band. Naively always
picking the single highest-win-rate puzzle causes staleness — the same
handful of puzzles get shown forever, and new/untested puzzles never get a
fair trial.

**How it works, mechanically:**
- Each puzzle keeps two counters: `α` (count of good outcomes) and `β` (count of bad outcomes). These are tracked **per individual puzzle**, not per domain or per difficulty band — domain/difficulty already narrowed the candidate pool before Thompson Sampling runs; its job is choosing the best *specific* puzzle among options that are already equally difficulty-appropriate.
- These two counters describe a range of plausible "true" success rates for that puzzle (a Beta distribution) — more data (higher α+β) means a narrower, more confident range; little data means a wide, uncertain range.
- **Selection step:** for each candidate puzzle in the target band, draw one random sample from its own range. Show whichever puzzle's draw came out highest this time.
- High-performing, well-tested puzzles usually win the draw (narrow, high range). Under-tested puzzles occasionally win by chance (wide range), giving them a fair trial. As they accumulate data, their ranges narrow and the system's confidence in them grows.

**Worked example — 5 puzzles in a difficulty band:**

| Puzzle | Solves | Correct | Win % | Interpretation |
|---|---|---|---|---|
| A | 100 | 85 | 85% | proven, shown often |
| B | 50 | 42 | 84% | nearly as proven |
| C | 10 | 9 | 90% | looks great, small sample — worth a try |
| D | 1000 | 500 | 50% | clearly broken — rarely picked |
| E | 0 | 0 | — | untested — occasionally given a chance |

**Simple update example (short walkthrough):**
- Start: Puzzle X has α=1, β=1 (no history, wide-open range).
- Round 1: shown, succeeds → α=2, β=1 (range shifts up and narrows slightly).
- Round 2: shown, fails → α=2, β=2 (range shifts back down).
- After many rounds, say α=8, β=2 → narrow range centered around ~80% — the puzzle now wins the draw reliably, but still isn't "locked in" absolutely.

**Why Thompson Sampling over alternatives:**

| Algorithm | How it works | Downside |
|---|---|---|
| Epsilon-greedy | best 90%, random 10% | the random 10% wastes time on puzzles already known to be bad |
| UCB | best + optimism bonus | over-explores early, over-commits late, needs manual tuning |
| Deep Q-Learning | neural net learns a policy | needs 10k+ data points, overkill for this problem |
| Thompson Sampling | sample from Beta distributions | mathematically elegant, self-balances explore/exploit, no tuning, data-efficient |

### 4.3 Component 3 — Safety net (non-negotiable rules)

Even a perfectly working statistical system can occasionally produce a
choice that feels bad to a real person. These rules sit on top and cannot be
overridden by any algorithm:

- **Difficulty ceiling:** never serve a puzzle rated more than `+400` above the user's rating (a cognitive wall — the difference between "hard but doable" and "give up").
- **Difficulty floor:** never serve a puzzle rated more than `-500` below the user's rating (feels insulting/patronizing).
- **Domain diversity:** never the same domain three times in a row — explicitly enforced, not left to chance.
- **Streak protection (under-18):** one free missed day per week; no shame language ("you lost your streak").

These exist because the algorithms are powerful but not infallible — they
catch edge cases and keep every decision explainable to a parent, teacher,
or regulator.

### 4.4 Component 4 — Cold-start & calibration

- New users play **6–8 hand-crafted, hand-rated diagnostic puzzles** before entering the normal feed loop, deliberately spanning the difficulty range (one trivially easy, one very hard, spread between).
- The next ~10 puzzles deliberately sample from a wide band (±2 difficulty bands around the initial estimate) — an "exploration bonus" that refines the estimate quickly. RD typically shrinks from ~350 to ~200 within these 10 puzzles.
- After that, normal targeting resumes.
- Without calibration, the first 20 puzzles would effectively be random difficulty; with it, RD converges to a usable confidence within about 8 puzzles — important for retention, since the app should feel personalized quickly.

### 4.5 Component 5 — Telemetry contract (exactly 6 signals)

Every puzzle attempt sends exactly six fields:

| Field | Purpose |
|---|---|
| `userId` | identifies the user |
| `puzzleId` | identifies the puzzle |
| `domain` | one of: logic, spatial, math, word, pattern |
| `outcome` | 0–1 scale (see 4.1) |
| `latencyMs` | time taken |
| `hintTierUsed` | 0=none, 1=guiding question, 2=strategic clue, 3=walkthrough, 4=LLM explanation |
| `attempt_count` | wrong tries before success |
| `abandoned_ms` | if swiped away, dwell time before swiping (else null) |

**Rule governing this list:** don't collect a signal unless there's already
a clear hypothesis for how the algorithm uses it. (Example of a signal
deliberately excluded: `time_to_first_interaction_ms` — it's ambiguous
whether it means "thinking hard" or "confused," so it's not collected until
that ambiguity is resolved.) This keeps the system privacy-conscious and
prevents telemetry sprawl.

Signals are queued locally on the client, flushed every 5 seconds (or on app
backgrounding), and trigger an immediate Glicko-2 update server-side
(<100ms latency from receipt to update) — the next puzzle (already
prefetched several cards ahead) reflects the updated skill vector.

### 4.6 Where personal data actually lives, and where it doesn't

- Glicko-2 and Thompson Sampling both run entirely on your own backend server, as plain deterministic math — **no external AI/LLM API is involved in either**, and therefore no data is sent to a third-party AI provider at this stage.
- The only data Glicko-2 touches is small, abstracted skill numbers (rating, RD, volatility) and a 0–1 outcome score — not raw behavioral logs, not identifying content.
- Passing Glicko-2's output into Thompson Sampling is an internal, in-process/same-server data flow — not a network boundary crossing, so it carries no "leak" risk.
- External LLM calls in this overall system happen elsewhere — specifically in puzzle **generation** (Section 6) and in Tier-4 hint explanations — not in the difficulty/rating math itself. Any privacy review should focus there, not on Glicko-2/Thompson Sampling.

### 4.7 Algorithm upgrade path

| Version | Trigger | What changes |
|---|---|---|
| v1 (now) | — | Glicko-2 + Thompson Sampling + hard rules. ~300 lines of code, no ML framework overhead, works with zero historical data, <50ms inference latency. |
| v2 | 10k+ user-sessions | Add Bayesian Knowledge Tracing (e.g. `pyBKT`) — estimates mastery probability, distinguishing "got lucky" from "actually learned the skill." |
| v3 | 100k+ sessions | Sequence-aware deep learning (e.g. AKT, Deep-IRT) — order of attempts matters, not just aggregate performance. |

v1 is a deliberate, defensible starting point — not a placeholder to be
embarrassed about — chosen specifically because it's fully auditable and
requires no data to bootstrap.

**Federated learning — considered and explicitly not recommended for now.**
Federated learning would let a v2/v3 model train using on-device updates
instead of centralizing raw behavioral data. It was discussed and rejected
for the current roadmap because: (1) the system already collects minimal,
abstracted data by design (Section 4.5), leaving little sensitive raw data
for FL to protect; (2) it adds real engineering and device-resource cost
that only pays off once a complex model and large user base exist, neither
of which v1 has. It remains a legitimate future option, but only if a
specific compliance or partnership requirement (e.g. "no child behavioral
data may leave the device") emerges later — that requirement, not a data
volume threshold, would be the trigger.

---

## 5. Puzzle difficulty ratings — how a puzzle gets its number

A puzzle's difficulty rating is **not** assigned by a human per puzzle, and
**not** decided by the LLM that generates it. It comes from two sources,
used together:

### 5.1 Source 1 — a starting estimate from structural parameters

Each puzzle type has a **difficulty formula**, written once (during that
type's Track A setup — see the companion System 1 document), that computes
a starting rating directly from the same structural parameters used to
generate the puzzle. These formulas are simple, additive, and designed to
land on the same 800–2000 scale Glicko-2 already uses for user skill, so
puzzles and users are directly comparable.

**Design principle for all formulas:** base value of 1200 (matching
Glicko-2's typical default), with each structural factor's coefficient
scaled so the realistic range of that field keeps the total within roughly
800–2000.

**Five example formulas, with worked difficulty tiers:**

*River crossing:*
`difficulty = 1200 + (item_count − 3) × 120 − (capacity − 2) × 100 + forbidden_pairs × 60`

| Tier | item_count | capacity | forbidden_pairs | Result |
|---|---|---|---|---|
| Easy | 3 | 3 | 0 | 1100 |
| Medium | 4 | 2 | 2 | 1440 |
| Hard | 6 | 2 | 4 | 1800 |

*Logic grid / deduction:*
`difficulty = 1200 + (entity_count − 3) × 150 + (inference_depth − 1) × 150`

| Tier | entities | inference_depth | Result |
|---|---|---|---|
| Easy | 3 | 1 | 1200 |
| Medium | 4 | 2 | 1500 |
| Hard | 6 | 3 | 1950 |

*Polynomial / algebra:*
`difficulty = 1200 + (degree − 2) × 200 + root_nature × 120 + (step_count − 2) × 60`
(`root_nature`: 0 = clean integer roots, 1 = irrational, 2 = complex)

| Tier | degree | root_nature | step_count | Result |
|---|---|---|---|---|
| Easy | 2 | 0 | 2 | 1200 |
| Medium | 2 | 1 | 4 | 1440 |
| Hard | 3 | 2 | 6 | 1880 |

*Memory match:*
`difficulty = 1200 + (pair_count − 6) × 70 + distractor_density × 100 − symmetry_bonus × 80`
(`symmetry_bonus`: 1 if an easy-to-notice board symmetry exists, else 0)

| Tier | pairs | distractors | symmetry | Result |
|---|---|---|---|---|
| Easy | 4 | 0 | 1 | 980 |
| Medium | 8 | 1 | 0 | 1440 |
| Hard | 12 | 2 | 0 | 1820 |

*Maze / pathfinding:*
`difficulty = 1200 + (grid_size − 6) × 50 + obstacle_count × 40 + branch_points × 60`

| Tier | grid_size | obstacles | branch_points | Result |
|---|---|---|---|---|
| Easy | 4 | 0 | 0 | 1100 |
| Medium | 6 | 2 | 1 | 1340 |
| Hard | 10 | 8 | 4 | 1960 |

*Hidden formula sequence (e.g. "4+4=8, 5+5=15, 6+6=24, 9+9=?" — a pattern-recognition puzzle, not real arithmetic; the visible operator is a decoy and the real rule is a hidden formula, here `n² − 2n`):*
`difficulty = 1200 + formula_complexity × 180 + (operand_size − 5) × 30 − (example_count − 3) × 60`
(`formula_complexity`: 0 = linear, 1 = quadratic, 2 = multi-step/piecewise; more worked examples shown = easier, hence the minus sign)

| Tier | formula_complexity | operand_size | example_count | Result |
|---|---|---|---|---|
| Easy | 0 | 4 | 4 | 1110 |
| Medium | 1 | 6 | 3 | 1410 |
| Hard | 2 | 9 | 2 | 1950 |

**Cross-type alignment check** — the actual point of having a shared target
scale:

| Type | Easy | Medium | Hard |
|---|---|---|---|
| River crossing | 1100 | 1440 | 1800 |
| Logic grid | 1200 | 1500 | 1950 |
| Polynomial | 1200 | 1440 | 1880 |
| Memory match | 980 | 1440 | 1820 |
| Maze/pathfinding | 1100 | 1340 | 1960 |
| Hidden formula sequence | 1110 | 1410 | 1950 |

Every "easy" tier clusters near 1000–1200, "medium" near 1400–1500, "hard"
near 1800–1960 — despite each formula using completely different input
fields. This clustering doesn't happen automatically from the math alone; it
requires deliberate calibration (see 5.3).

**Important caveat:** these six formulas and their coefficients are a
well-reasoned starting scaffold for illustration, not validated production
values. Before shipping, calibrate against a small internal playtest, the
same way puzzle cold-start is already handled elsewhere in this system
(hand-rating an initial pool).

### 5.2 Source 2 — refinement from real player performance

The starting estimate is a first guess, not a final answer. Every time a
real user plays a puzzle, the puzzle's own rating updates using the same
Elo-style math as the user's skill rating, just pointed at the puzzle
instead of the person: if users consistently outperform the puzzle's
current rating, it nudges down; if they consistently struggle, it nudges
up. Over time, a puzzle's difficulty rating converges to reflect how hard
it's actually proving to be, independent of the formula's initial guess.

### 5.3 Cross-type calibration, concretely

Since each type's formula is independent, getting them to genuinely mean
the same thing on the shared scale requires either:
- **Anchor puzzles:** a small set of hand-tested puzzles across all types, rated by human testers first, used to tune each formula's coefficients so its output matches those anchors.
- **Real player data over time:** since all ratings self-correct from actual performance (5.2), even an imperfect initial calibration converges toward accuracy — if "easy" puzzles of one type are proving harder than "easy" puzzles of another, their ratings will drift apart from real data until genuinely comparable.

---

## 6. The Puzzle Generation Engine

### 6.1 Purpose

The Difficulty Engine needs certified puzzles available at specific
difficulty targets, for specific types, at all times. The Generation Engine
is responsible for making sure that supply exists — working **backward**
from a difficulty target to the parameters that will produce it, rather than
generating arbitrarily and hoping the result lands somewhere useful.

### 6.2 Two operating modes

**Mode A — Background stocking (default, always running).** For each
puzzle type and each difficulty band, continuously generate instances using
parameter combinations known to land in that band, maintaining a healthy
buffer (e.g. "always keep 50+ certified puzzles per type per band"). This
runs independently of any specific user request.

**Mode B — Targeted on-demand generation (fallback, rare).** Triggered only
when the Difficulty Engine requests a band that's running low on stock for
a given type. Generation Engine picks parameters known to hit that band,
generates a batch, certifies them, tops up the pool.

This two-mode split keeps real puzzle-serve requests fast (Mode A already
has stock ready) while self-healing when a specific band/type combination
runs thin.

### 6.3 The inversion step — the core mechanism

Because the difficulty formulas (Section 5.1) are simple and additive,
they're easy to invert: given a target difficulty, solve directly for
parameter combinations that land near it, rather than searching blindly.

Worked example (logic grid, target 1500):
`1500 = 1200 + (entity_count − 3) × 150 + (inference_depth − 1) × 150`
→ multiple valid combinations satisfy this: `entity_count=4,
inference_depth=2`; or `entity_count=5, inference_depth=1`; or
`entity_count=3, inference_depth=3` — all land at exactly 1500.

**This multiplicity is deliberately useful, not incidental.** Rotating
across several valid parameter combinations that all land in the same
target band adds structural variety within that band, reinforcing the
duplication defenses from System 1 rather than working against them.

### 6.4 Critical design rule — the LLM never chooses the parameters

The parameter values that determine difficulty must be computed by
deterministic code (solving the inverted formula), **never** requested from
the LLM as an open-ended instruction like "pick values that feel hard." An
LLM asked to hit a target range has no reliable way to verify its own
choice actually lands there, and this would reintroduce the "AI grading its
own work" problem this whole architecture exists to avoid.

Correct flow:
1. Your backend code inverts the type's difficulty formula and computes exact parameter values for the target band.
2. Those fixed values are sent to the LLM as hard constraints (e.g. "generate a river-crossing instance with exactly item_count=6, capacity=2, forbidden_pairs=4").
3. The LLM's only task is filling in cosmetic content within those fixed numbers — theme, names, wording.
4. The instance proceeds through the full System 1 verification pipeline (schema → witness → existence → uniqueness → render round-trip → fingerprint/duplication).
5. The puzzle's starting difficulty rating is computed from the exact same parameters used to generate it — consistent by construction, not a separate estimate.
6. Certified, enters the pool; rating self-corrects with real play (5.2).

### 6.5 Scaling to production without proportional manual work

At production scale, personalization needs (school clients, neurodivergent
accessibility, themes, languages) must not translate into "one new puzzle
type per client" — that doesn't scale. The key distinction:

| Need | Actually requires |
|---|---|
| New fundamental puzzle mechanic | A new puzzle type — genuinely rare |
| Different theme/branding | A cosmetic (Q3) override — no new type needed |
| Difficulty cap, content filter | A selection policy override in the Difficulty Engine — no new type needed |
| Simplified wording, reduced distractors, no timing pressure | Usually a parameter-range restriction within an existing formula, or a presentation-layer override — rarely a new type |

**Layer 1 — Profiles/policies (highest leverage, build first).** A profile
is a named bundle of overrides applied on top of existing certified puzzle
types: allowed types, difficulty cap, theme, vocabulary, accessibility
toggles (e.g. force `distractor_density = 0`, disable countdown timers,
use simplified wording templates). Profiles compose (e.g. a school profile
can layer on top of a base "elementary, ages 6–11" profile and an
accessibility toggle). Adding a new client mostly means selecting and
combining existing profile options — a product/support task, not new
engineering.

**Layer 2 — Meta-templates (build gradually).** Group puzzle types by
shared underlying mechanism rather than authoring each in isolation. For
example, a "resource-constrained sequencing" meta-template
(item_set/constraint_type/capacity_rule parameters) can express both river
crossing and Tower of Hanoi as configurations of one engine, rather than two
separate from-scratch builds. New variants within a meta-template are cheap;
they reuse the verifier and fingerprint logic already built for that family.

**Layer 3 — Genuinely new engine (rare, same cost as today).** Reserved for
mechanics that share nothing with any existing meta-template. AI assistance
belongs here specifically as a **proposal** step — searching existing
meta-templates/types for the closest fit and drafting a fit assessment for
an engineer to confirm — never as the final authority deciding whether a
new engine is actually needed or judging its own correctness.

---

## 7. Full end-to-end loop, summarized

1. **Generation Engine** selects a puzzle type and target difficulty band (from background stocking targets, or an on-demand gap-fill trigger).
2. It inverts that type's difficulty formula to compute exact structural parameters landing in that band.
3. Those fixed parameters are sent to the LLM as a one-shot, constrained generation call — cosmetic content only.
4. The candidate instance passes through **System 1's** full verification and duplication pipeline; if it fails any check, it's discarded for free and generation retries.
5. On success, a certificate is issued, including a starting difficulty rating computed from the same parameters used to generate it.
6. The puzzle enters the certified pool.
7. A specific user requests a puzzle → **Age Engine** filters the pool to age-appropriate, policy-compliant candidates (including any active client profile overrides) → **Difficulty Engine** (Glicko-2) narrows to the user's target difficulty band → **Thompson Sampling** selects the best specific puzzle among remaining candidates → **safety-net rules** perform a final override check → puzzle is served.
8. The outcome (0–1 scored) updates the user's Glicko-2 rating for that domain, and the puzzle's own difficulty rating, via the same Elo-style math on both sides.
9. Sampled human review (per System 1's dial mechanism) periodically checks certified puzzles for issues no algorithm can catch (confusing wording, tone mismatches) — feeding back into Track A revisions when needed, never into an automated self-correction loop.

---

## 8. Metrics to track

**Per-user:** RD convergence speed (target <150 by puzzle 20); rating
accuracy against held-out performance (target R² > 0.7); domain diversity
(target 80%+ of users see all 5 domains within their first 50 puzzles).

**Population:** retention by calibration quality (RD<100 cohort vs.
RD>200 cohort); learning transfer to rarely-seen domains; streak completion
rate as a wellbeing signal, not just a raw engagement number.

**System:** Thompson exploration rate over time (expected to fall from
~10% toward ~1% as a user/puzzle pool matures); safety-net engagement rate
(should stay under 5% for well-calibrated users — frequent triggering
signals a miscalibrated difficulty model, not a healthy safety net);
per-type certification rate and rejection rate (from Generation Engine
output, feeding Track A revision decisions); per-band pool depth (stock
health for Mode A background generation).

---

## 9. Key open questions for implementation

- Final coefficients for each puzzle type's difficulty formula need calibration against real or pilot playtest data before launch — the values in Section 5.1 are illustrative starting points, not validated.
- Cross-type anchor calibration (Section 5.3) needs an initial hand-tested puzzle set across all launch types before relying on self-correction alone.
- Profile composition rules (Section 6.5) — how conflicting overrides between stacked profiles resolve — need a defined precedence order.
- Minimum buffer thresholds per type/band for Mode A background stocking need to be set based on expected traffic per band, not guessed uniformly.
- The BKT/deep-learning upgrade triggers (Section 4.7) are session-count thresholds; confirm these against actual expected user growth timelines rather than treating them as fixed dates.
