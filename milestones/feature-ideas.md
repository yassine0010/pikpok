# Feature Ideas & Backlog

These items represent planned future features and exploratory modules that will be converted into numbered milestones once their designs, models, and specifications are finalized.

---

## 1. App Presentation Carousel & Mascot Avatar (Richard)

### Concept
An engaging onboarding walkthrough carousel introducing PikPok with an illustrated mascot character named **Richard**.

### Proposed Scope
- **Walkthrough Carousel**: Multi-slide horizontal swipe carousel highlighting:
  1. Micro-puzzle vertical feed.
  2. Meet Richard (your cognitive coach).
  3. Daily challenge and streak tracking.
  4. Cognitive domain skill metrics.
  5. Leaderboard and rankings.
- **Mascot Avatar (Richard)**: Expressive illustrations (welcome, thinking, celebrating, coach) guiding users throughout the onboarding.
- **Controls**: "Skip" and "Get Started" CTAs, first-launch completion tracking in local storage, and replay option in user Profile.

---

## 2. Cognitive Skills Engine & Adaptive Matching

### Concept
Dynamic puzzle recommendation using **Glicko-2** and **Thompson Sampling**, with tailored experience pools for **Children** vs. **Young Adults**.

### Proposed Scope
- **Age Cohorts**:
  - *Children Category* (Age $\le 12$): Friendly visual puzzles, simplified vocabulary, age-appropriate cognitive benchmarks.
  - *Young Adults Category* (Age $> 12$): Standard competitive logic, abstract deduction, advanced difficulty tiers.
- **Adaptive Matching Engine**:
  - **Glicko-2 Rating System**: Track player rating ($r$), rating deviation ($RD$), and volatility ($\sigma$) across cognitive domains (Math, Logic, Patterns, Memory, Reaction). Calibrates both player and puzzle ratings upon solve/fail.
  - **Thompson Sampling**: Multi-armed bandit balancing exploration (sampling new domains) and exploitation (serving puzzles right at the player's optimal challenge threshold).
- **Stats Integration**: Connect the Stats/Growth screen to live domain radar charts, progress curves, and accuracy metrics.

---

## 3. In-App AI Cognitive Chatbot (Richard)

### Concept
An interactive conversational AI tutor coached by mascot Richard, providing real-time pedagogical hints and puzzle explanations without spoiling answers.

### Proposed Scope
- **Persona & Prompting**: Encouraging, witty, pedagogical cognitive coach with strict anti-spoiler rules (Socratic questioning rather than giving answers).
- **Context-Aware Assistance**: Injects active puzzle prompt, user skill rating, age cohort, and recent attempt history into the prompt.
- **UI & Safety**:
  - Conversational chat drawer or floating modal in the feed.
  - Quick action suggestion chips (*"Can I have a subtle hint?"*, *"Explain the logic"*, *"Why was my answer wrong?"*).
  - Child-safe content moderation guardrails.
