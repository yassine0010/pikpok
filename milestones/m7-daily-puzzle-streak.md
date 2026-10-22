# M7 — Daily Puzzle & Streak Engine

## Goal

Introduce a dedicated Daily Puzzle tab and an automated daily streak engine that increments user streak on consecutive daily solves based on UTC calendar days.

## Work

- **Backend (Fastify & PostgreSQL):**
  - Add Daily Puzzle rotation logic: assign or feature a distinct daily puzzle for each UTC calendar date.
  - Add endpoint `GET /puzzles/daily` returning today's daily puzzle along with the current user's daily completion status.
  - Implement Streak Engine rules:
    - Daily solves reset at 00:00 UTC globally.
    - If user solved yesterday's daily puzzle (UTC date = today - 1), increment `streak = streak + 1`.
    - If user solved today's daily puzzle already, keep current streak.
    - If user missed yesterday's daily puzzle, reset streak to `1` upon solving today's puzzle.
    - Atomically update `streak` and `last_daily_solve_at` in the `users` table.

- **Client (Expo & React Native):**
  - Add dedicated "Daily" navigation tab (to be refined once dedicated UI reference is provided).
  - Display daily puzzle card with a "Daily Challenge" indicator and time remaining until next UTC reset.
  - Show "Completed for today" state with celebration banner once solved.
  - Display user streak count ("🔥 X") in the TopBar and on the Stats screen, updating immediately upon completion.

## Done when

- Users can access and solve a distinct Daily Puzzle in the dedicated tab each UTC day.
- Solving the daily puzzle increments the user streak on consecutive days and resets to 1 if a day was skipped.
- The streak count displays accurately in the TopBar and Stats screen in real time.
