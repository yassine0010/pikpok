# M5 — Interactive Puzzle Feed & Solving

## Goal

Display real puzzle cards (prompts, images, badges) in the scrolling feed and enable interactive typed answer solving verified by the backend API.

## Work

- **Backend (Fastify & PostgreSQL):**
  - Add database schema and storage for puzzles once the puzzle data schema is provided.
  - Host and serve puzzle images/assets as static files or URLs.
  - Add `GET /puzzles` feed endpoint returning paginated puzzle cards tailored to the chosen data format (excluding answers for client security).
  - Add `POST /puzzles/:id/answer` endpoint for server-side answer validation according to the chosen puzzle format.

- **Client (Expo & React Native):**
  - Upgrade feed card from placeholder to interactive `PuzzleCard` reflecting `docs/ui/README.md` and reference UI.
  - Display puzzle content, badges, and illustration images according to the provided puzzle data format.
  - Add typed text input field with submit button on each puzzle card.
  - Implement instant feedback states (correct, incorrect, loading/submitting).
  - Add hint trigger displaying progressive hints if supported by the puzzle data.

## Done when

- The mobile feed displays real puzzles with their associated images and content.
- Users can type an answer and submit it.
- The server validates the answer and returns immediate correct/incorrect feedback to the card UI.
