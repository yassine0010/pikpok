# M4 — Puzzle API boundary

## Goal

Prepare the app to connect to the future puzzle service without building puzzle logic now.

## Work

- Define how the feed requests puzzle cards from the future endpoint.
- Define how submitted answers are sent to the future answer-checking endpoint.
- Keep the feed cards empty until the puzzle service is available.
- Show clear loading, empty, and unavailable states around these API calls.

## Done when

- The client has a clear integration point for fetching puzzles and submitting answers.
- No puzzle generation or answer checking is implemented in this milestone.
