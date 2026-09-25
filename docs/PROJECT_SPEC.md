# Project Specification

**Status:** Finalized product direction for v1 planning. The domain/database design is documented separately; implementation has not started.

## 1. Purpose and principles

The Piano Learning Progress System is a responsive web application, primarily for one person, to record and understand that person's complete self-directed piano-learning journey. The user decides what to learn. The application organizes, records, evaluates, and visualizes that learning; it does not generate curriculum or calculate a fictional overall mastery percentage.

- Core functionality must work without AI.
- Preserve meaningful historical records.
- Keep the application simple, extensible, and independent of any particular UI.
- The user owns their learning data and can export it.

## 2. Users and platform

- One primary owner; the application must be accessible across devices such as a PC, phone, and tablet.
- A single responsive web application is in scope. Native mobile is not a v1 deliverable.
- Cross-device access implies a hosted backend and relational database. Authentication is required before production access but is not part of this design task.
- No social network, teacher account, or multi-user collaboration is required in v1.

## 3. Learning content and progress

### 3.1 User-managed catalog

The user manually creates learning items, lessons, topics/subtopics, songs, song sections, and other learnable content. The initial category names may be provided as empty organizational labels; the user can also create custom categories. The system never generates a curriculum, lesson, topic, or recommendation about what the user should learn.

Initial categories are:

- Keyboard Fundamentals
- Music Theory
- Rhythm
- Technique
- Scales
- Chords
- Arpeggios
- Music Reading
- Sight Reading
- Ear Training
- Repertoire / Songs
- Performance
- Improvisation
- Composition
- Musical Expression
- Pedaling
- Memorization
- Accompaniment
- Styles / Genres
- Advanced Piano Concepts

The user may create custom categories and content. The conceptual hierarchy is Category → Learning Item → Lesson → Topic/Subtopic. This describes organization, not a mandatory sequence.

Prerequisites are informational. They never gate access, study, or completion. The user may mark previously known material complete.

### 3.2 Manual learning progress

The user records progress manually. Learning items, lessons, and topics have a status and may have created, started, and completed dates, notes, and manually entered time taken where appropriate. Completion means the user considers the item complete; it is not a mastery calculation. The user may later study an already completed topic again, and practice records do not reset its completion.

## 4. Weekly planning and goals

- The user manually creates weekly planning periods and their goals.
- Every weekly period is exactly seven local calendar days, represented as a start date plus seven days. The user's configured IANA timezone is stored and used for local date boundaries; a period also retains the timezone in effect when it was created.
- Each week has **Main** and **Extra** goals. Main goals are primary; Extra goals are optional goals for when Main goals finish early.
- Weekly goal status is manually set to **Not Touched**, **Partially Completed**, or **Completed**. Completed means the user says that goal is done.
- A planning period's goals count as completed when it has at least one Main goal and every Main goal is marked Completed. Extra goals are optional and do not prevent a period from counting as completed.
- A goal may have a title, notes, rating, dates, one related learning item/lesson/topic/song/section/personal goal/review task, and links to related practice records.
- An unfinished goal may be offered as a candidate for a later week. An unfinished Extra goal becomes a Main goal if carried forward. The source week's goal is never rewritten or moved.
- A goal/item may be marked **Learn Later**. Deferred work is retained with its origin, decisions, weeks, and deferral history. It is not silently dropped or duplicated.
- On creating a week, pending carry-forward items are handled as follows:
  - **1–3 items:** show each item and let the user choose **Add to this week** or **Later**.
  - **4 or more items:** automatically create Main goals for all pending items in that new week; record that the threshold rule caused the additions.
- Re-adding work creates a new goal instance linked to its prior carry-forward history. It does not alter the earlier week's record. The same typed target cannot be added twice in one week.
- Support long-term goals and practice goals. There is no requirement for monthly learning goals.

## 5. Practice records

Practice is manually recorded after it happens. No automatic timer, stopwatch, practice detection, live session, MIDI/audio analysis, or BPM detection is included.

A practice record may include the local practice date, manually entered duration, explicitly selected category, related learning item/lesson/topic/song/section, related weekly goals, rating, notes, and recording reference (filename, path, or link). The v1 system stores references only, not audio files. Practice duration is aggregated from source records for daily, weekly, monthly, yearly, and lifetime views.

Category analytics do not guess: the practice record's category is explicitly selected or left unclassified. It is not inferred from a goal, lesson, song, or other relation.

## 6. Songs and sections

Songs are manually added; difficulty is assigned by the user. Songs may have sections such as Intro, Verse, Chorus, Bridge, and Ending. Song and section progress is tracked manually, with dates, notes, and ratings as appropriate. Detailed hand tracking and automatic BPM/difficulty are out of scope.

## 7. Reviews and practice periods

After the user completes the goals in the third week of a 3-week cycle, offer an optional 1–2 day review/exam/practice period. A cycle comprises three consecutive weekly planning periods, and each period's Main goals must be completed; optional Extra goals do not block cycle completion. Elapsed dates alone never complete a period or cycle. The review cycle retains its three associated weeks, their goal-completion state, the review offer, and whether the user accepted or skipped it. Actual review/exam/practice records are stored separately.

The next ordinary week can be created whether the user accepts, skips, or completes the review. Skipping a review must not block it. A weak result may inspire a later goal, but never creates one automatically. Review records remain historical.

## 8. Streaks

Streaks are based on successful daily login, not practice. A login is assigned to a calendar day in the user's configured timezone. One missed local calendar day is allowed: logins separated by two dates remain in the same streak, and the streak count includes the grace day. A gap of three or more dates means at least two consecutive days were missed; the next login starts a new streak at one. Current and longest streaks are derived from retained login-day history, not a mutable counter.

## 9. Achievements, milestones, timeline

- Achievements are based on actual recorded data, with extensible definitions; examples include First Practice, First Lesson, First Completed Skill, First Chord, First Song, First Two-Hand Piece, 10/25/50/100 practice hours, 10 Songs Completed, First Review, practice-day milestones, first completed lesson/song/week/review, and streak milestones. These examples do not hard-code the future achievement system.
- Milestones are separate, broader personal events, typically entered by the user: Started Piano, First Song, First Performance, First Classical Piece, First 100 Hours, or Completed Beginner Curriculum. Neither achievements nor milestones control access to learning.
- Timeline views combine dated source events (such as Started Piano, first lesson/chord/song, first review/completed song, progress changes, practice, goals, reviews, awards, and milestones). Avoid storing duplicate timeline rows for events already present in canonical records.

## 10. Dashboard and analytics

The eventual dashboard may show current week, weekly goal completion, unfinished goals, practice time/frequency, completed lessons/topics/songs, most/least practiced categories, difficult areas based on manual ratings/history, current/longest streaks, calendar, and historical timeline. Charts should support daily, weekly, monthly, yearly, and historical ranges.

Analytics should be derived from primary records. Do not store redundant totals as the source of truth, and do not calculate an overall piano percentage.

## 11. Data ownership and export

All learning data belongs to the owner. Future export must include all meaningful user-owned history and metadata, including profile/preferences, catalog, progress history, prerequisites, planning periods/goals, carry-forward history, practice records, songs/sections, reviews, ratings, timeline-source events, achievements, milestones, and login history.

Support JSON and CSV. JSON should be a complete structured snapshot; CSV may use multiple logically related datasets joined by stable IDs. Dedicated backup/restore infrastructure is not required for v1.

## 12. Technical direction and scope

- UI/server: Next.js and TypeScript; Tailwind CSS
- Domain architecture: modular monolith, with application/use-case and domain rules independent of UI and persistence
- Database/ORM: hosted PostgreSQL and Prisma
- Validation: Zod
- Tests: Vitest and Playwright
- Provider recommendation: Neon, subject to current plan limits and deployment choice in [ARCHITECTURE.md](ARCHITECTURE.md)
- Version control and project tracking: Git and GitHub

### V1 non-goals

AI piano teacher/curriculum generation, automatic planning, live piano detection, audio/MIDI analysis, automatic BPM, built-in piano/metronome, automatic practice timers, social network, teacher accounts, multi-user collaboration, complex cloud infrastructure, native mobile app, and audio-file storage.

## 13. Product rules chosen for the design

- Rating and user-assigned song difficulty use an optional integer scale of 1–5; this is a practical schema convention, not an objective score.
- A weekly period stores a local start date and timezone snapshot; its end is exclusive and seven dates after the start.
- A 3-week review cycle is complete only when each of its three periods has at least one Main goal and all Main goals are marked Completed; elapsed dates alone do not count.
- Category attribution for practice is explicit on the practice record; missing category means excluded from category rankings.
- Detailed modeling choices and integrity rules are in [DATABASE_DESIGN.md](DATABASE_DESIGN.md).
