# Development Roadmap

**Status:** Planned sequence. The current task completes requirements and design; implementation has not started.

## Phase 0 — Requirements and design

- Keep the product requirements and modular-monolith direction current.
- Review the logical data model, date/time rules, carry-forward transaction, review cadence, login streak, archive behavior, and export shape.
- Confirm the remaining pre-deployment identity and hosting choices.

**Exit:** The owner accepts the proposed domain model and no unresolved design choice blocks starting implementation.

## Phase 1 — Application foundation

- Scaffold Next.js, TypeScript, and Tailwind only when implementation is authorized.
- Set up a modular monolith with application/use-case, domain, validation, and persistence boundaries.
- Configure Prisma and hosted PostgreSQL, environment secrets, local development database workflow, and migration review.
- Establish Vitest and Playwright according to project testing conventions.
- Add authentication before exposing production access across devices.

**Exit:** A secured, runnable foundation with a verified database connection and migration workflow.

## Phase 2 — User-managed learning catalog and progress

- Add profile timezone preferences, initial category records, custom categories, learning items, lessons, topics, and informational prerequisites.
- Add manually entered statuses/dates/time-taken and append-only learning progress history.
- Add songs, user-assigned difficulty, song sections, and progress.

**Exit:** The user can create and update learning content without generated curriculum, readiness gates, or lost lifecycle history.

## Phase 3 — Practice records and goals

- Add manual practice records, explicit category attribution, notes, ratings, recording references, and related targets.
- Add weekly planning periods of exactly seven local dates, Main/Extra goals, goal status history, and personal long-term/practice goals.
- Add transactional carry-forward decisions and deferral history, including the 1–3 individual decision and 4+ automatic-add rules.

**Exit:** Practice and goal workflows preserve their dates, typed relationships, and source-week history.

## Phase 4 — Reviews, login streak, and achievements

- Offer a review only after all Main goals in each of the three associated planning periods are complete; retain cycle, offer, and accept/skip state separately from review records.
- Keep next-week creation available regardless of review acceptance, skip, or completion.
- Add manually authored reviews, topics/tasks/results, dates, durations, ratings, and notes.
- Record daily login dates in the owner's timezone and derive current/longest streaks.
- Add extensible achievement definitions/awards and manually recorded milestones.

**Exit:** Review cadence, optionality, streak grace-day rules, and awards derive from the agreed data model.

## Phase 5 — Dashboard, calendar, timeline, and analytics

- Build current-week and goal summaries, unfinished goals, practice time/frequency, learning/song completions, ratings, streaks, and historical views.
- Add calendar and timeline from canonical dated events, milestones, and awards.
- Add useful daily, weekly, monthly, yearly, and historical charts with explicit category attribution.
- Avoid a mastery percentage and avoid storing dashboard totals as source data.

**Exit:** Dashboard metrics are explainable from underlying user records and historical dates.

## Phase 6 — Export and release readiness

- Add complete versioned JSON export and CSV logical datasets, including archived and historical records.
- Review responsive behavior, accessibility, privacy, and supported browsers.
- Verify user-owned data export completeness, rollover boundaries, timezone behavior, and restoration from an export if import is later included.
- Document setup, release, and data export procedures on GitHub.

**Exit:** The user can access the app across devices and retrieve a complete copy of their meaningful learning history.

## Later only if desired

- Additional mobile/native interface reusing application/domain logic.
- Actual recording file attachments.
- Optional AI capability isolated from core workflows.

These are future options, not v1 commitments. Do not add live timers, audio/MIDI analysis, social features, teacher accounts, or microservices.
