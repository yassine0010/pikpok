# PikPok — Project Overview

## What PikPok is

PikPok is a puzzle app that gives each person a feed of puzzles suited to their selected audience and their past answers. It is planned for web and Android. People can answer puzzles, skip them, use built-in hints, and follow their progress.

## What using the app looks like

1. A person signs in and chooses one audience category: **Children**, **Teens**, or **Neurodivergent**.
2. PikPok prepares a small batch of puzzles for them.
3. They answer a puzzle or skip it. PikPok checks answers on the server, so the correct solution is not sent to the app in advance.
4. The person sees whether an answer was correct or incorrect. In the first version, an incorrect answer does not automatically reveal the solution.
5. Their progress, points, streak, and leaderboard position update from saved results.

## How puzzle matching works

PikPok uses a separate difficulty component to choose which puzzles to offer. It first respects the person's audience category, then uses past correct and incorrect answers to help choose an appropriate difficulty. Skipping a puzzle is recorded, but does not count as a right or wrong answer for learning the person's skill in the first version.

If the difficulty component is temporarily unavailable, PikPok can still provide a non-personalized batch. It must continue respecting audience eligibility, use current puzzle content, avoid recently seen puzzles when possible, and return to personalized selection after recovery.

## How puzzle content changes

The live catalog is planned to contain **3,000 current puzzle slots**. A puzzle-generation engine will supply replacement content. When a puzzle is replaced, PikPok keeps its stable ID, saves the outgoing version in a separate archive, and updates the current version. If a person submits an answer for an old version, PikPok rejects it as expired rather than checking it against the new answer.

After five successful content updates, PikPok refreshes only puzzles that are still waiting in a person's server-side feed. Cards already sent to the app are left alone. The rotation frequency is still to be decided.

## Points, hints, and privacy

- A correct answer earns **10 XP**. An incorrect answer or a skipped puzzle earns **0 XP**. There are no XP multipliers in the first version.
- A daily streak uses one configured application time zone.
- The leaderboard is global and all-time. It shows a display name, XP, rank, and optionally the current streak.
- Audience category, login identity, and private answer history are not public.
- Built-in static hints are part of puzzle content. AI-generated dynamic hints are not designed yet; the app will show an unavailable placeholder for that feature.

## What is still undecided

The project still needs decisions about the age rule for neurodivergent users, the puzzle difficulty scale, the first puzzle format and answer rules, the rotation interval, exact API details, and some infrastructure providers. The dynamic-hint design is intentionally left blank. These open items are collected in [open-decisions.md](open-decisions.md).

## Technical foundation

The planned app uses Expo and React Native for web and Android. A central Node.js/Fastify backend handles accounts, puzzles, answers, and progress. PostgreSQL stores durable information; Redis holds each person's ready-to-serve puzzle IDs. Full system details are in [technical-architecture.md](technical-architecture.md), [technical-stack-and-implementation.md](technical-stack-and-implementation.md), and [development-checklist-two-teammates.md](development-checklist-two-teammates.md).
