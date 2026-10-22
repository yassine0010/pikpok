# M6 — Real-Time XP Synchronization

## Goal

Award XP upon correctly solving puzzles and keep user XP seamlessly synchronized in real time across the feed, top bar, profile, and leaderboard.

## Work

- **Backend (Fastify & PostgreSQL):**
  - Track user puzzle completion history to verify first-time solves.
  - Calculate and award XP upon successful solve (scaled by difficulty once the puzzle data format is finalized), preventing repeat XP farming.
  - Atomically update user `xp` in PostgreSQL upon correct solve within a database transaction.
  - Return updated user XP and solve status in the answer submission response payload.

- **Client (Expo & React Native):**
  - Update user auth and session context automatically upon receiving updated XP from the answer response.
  - Immediately reflect new XP in the TopBar, Stats/Growth screen, and Profile without requiring app refresh or screen reloads.
  - Reflect updated scores when navigating to the Leaderboard tab.
  - Visual celebration effect (e.g., XP gain pill or pulse) when earning XP on a card.

## Done when

- Solving a new puzzle awards XP reliably.
- Repeatedly solving an already completed puzzle does not award additional XP.
- User XP updates instantly across all views (Feed header, Profile, Stats, Leaderboard).
