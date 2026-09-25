# Domain and Database Design

**Status:** Proposed logical design for review before implementation. It is not a Prisma schema, migration, or deployed database. The design assumes PostgreSQL and Prisma in a modular monolith.

## 1. Design decisions and conventions

- Use UUID primary keys for durable references across exports and future interfaces.
- Use PostgreSQL `DATE` for a user-entered local calendar date and `TIMESTAMPTZ` (stored in UTC) for an exact recorded instant. The owner timezone is an IANA name such as `Europe/Berlin`.
- User-visible ratings and manually assigned song difficulty use nullable integers 1–5. They are subjective, not calculated. UI labels can define the anchors.
- Persist primary current state and narrowly scoped history records. This is not event sourcing: the history rows supplement current rows and do not need replay.
- Do not duplicate derived analytics or timeline events. Calculate them from canonical records.
- All rows belong to the application's single owner. A profile/preferences row stores owner-level settings; there is no premature `user_id` column on every table. Production authentication must protect access before the app is exposed.
- All meaningful foreign keys use `ON DELETE RESTRICT`. Archive referenced content rather than deleting it. Join rows may be removed only when their parent records themselves are eligible for deletion; referenced historical records are retained.
- Unless stated otherwise, mutable entities have `created_at TIMESTAMPTZ NOT NULL` and `updated_at TIMESTAMPTZ NOT NULL`. History/event rows are append-only and have `recorded_at TIMESTAMPTZ NOT NULL`.

## 2. Domain overview

```text
OwnerProfile
 ├─ Category ─ LearningItem ─ Lesson ─ Topic
 │                  └─ informational Prerequisites
 ├─ Song ─ SongSection
 ├─ WeeklyPeriod ─ WeeklyGoal ─ GoalStatusChange
 │                       └─ GoalCarryForward ─ CarryForwardEvent
 ├─ PracticeRecord ── (explicit target links and category)
 ├─ ReviewCycle ─ Review ─ ReviewEntry
 ├─ LoginDay
 ├─ AchievementDefinition ─ AwardedAchievement
 └─ Milestone
```

The diagram is conceptual. The detailed relationships and keys follow. A weekly goal is a dated planning instance; it is not the learning topic's progress state. Repeated work on one topic therefore creates separate weekly goals and practice records against one persistent topic.

## 3. Entities and attributes

Types below are logical PostgreSQL types. `PK` is primary key, `FK` is foreign key. `NULL` means optional. Fields common to all mutable records are described in section 1.

### 3.1 OwnerProfile

**Why:** Stores the one owner's preferences that affect interpretation of dates and cross-device behavior; it is not an authentication table.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK; seed exactly one row |
| `timezone_name` | TEXT | Required IANA timezone; validate against the platform timezone database |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

**Relationships:** Conceptual owner of all application data; no per-row profile FK is needed while there is exactly one owner. If multi-user support is later chosen, introduce explicit ownership and authorization in a deliberate migration.

### 3.2 Category

**Why:** Provides user-managed classification, including the initial catalog and custom categories, without hard-coded category enums.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | Required; unique after trimming/case normalization |
| `description` | TEXT | NULL |
| `is_default` | BOOLEAN | Required, default false; true for the initial seeded categories |
| `archived_at` | TIMESTAMPTZ | NULL; stops normal selection while preserving history |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

Seed the 20 category labels listed in the specification as empty organizational rows. These rows create no learning items, lessons, or topics and are not a curriculum. The user can add custom rows; `is_default` is metadata, not a restriction. **Relationships:** one Category has zero or many LearningItems, Songs, PracticeRecords, and Milestones. The same song or practice record has at most one explicitly selected category. **Indexes:** unique normalized name; index `archived_at` if active-category lists need it.

### 3.3 LearningItem

**Why:** Represents a category-level concept/skill that can exist without a lesson and gives prerequisites a stable, non-blocking target. It avoids forcing every learned concept into a lesson.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `category_id` | UUID | FK → Category, required |
| `title` | TEXT | Required |
| `description` | TEXT | NULL |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`; manually controlled |
| `started_on` | DATE | NULL; user-entered effective date |
| `completed_on` | DATE | NULL; user-entered effective date |
| `time_taken_minutes` | INTEGER | NULL; manually entered non-negative time, if applicable |
| `notes` | TEXT | NULL |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required |

**Constraints:** If both dates are present, completed date must not precede started date; dates are not required solely because status is Completed, so the system never invents an unknown historical date. Duration is non-negative. “Already known” content may be completed with or without a started date. No prerequisite changes status or access. **Relationships:** Category 1:N LearningItem; LearningItem 1:N Lesson; LearningItem N:N LearningItem through `LearningPrerequisite`. **Indexes:** `(category_id, archived_at)` and `(status, completed_on)` for catalog/progress views.

### 3.4 Lesson

**Why:** A lesson is a distinct user-created grouping under a LearningItem. Separate rows allow their own progress dates, status, notes, and history.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `learning_item_id` | UUID | FK → LearningItem, required |
| `title` | TEXT | Required |
| `description` | TEXT | NULL |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`; manually controlled |
| `started_on`, `completed_on` | DATE | NULL, user-entered |
| `time_taken_minutes` | INTEGER | NULL, manually entered, non-negative |
| `notes` | TEXT | NULL |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required; `created_at` is the created date source |

**Constraints:** Same progress/date consistency as LearningItem. **Relationships:** LearningItem 1:N Lesson; Lesson 1:N Topic. **Indexes:** `(learning_item_id, archived_at)` and `(status, completed_on)`.

### 3.5 Topic

**Why:** Topics/subtopics are individually learnable and repeatable units. A separate entity supports the example of deferring one topic while preserving the lesson and other topics.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `lesson_id` | UUID | FK → Lesson, required |
| `title` | TEXT | Required |
| `description` | TEXT | NULL |
| `sort_order` | INTEGER | Required, non-negative; ordering only, not curriculum enforcement |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`; manually controlled |
| `started_on`, `completed_on` | DATE | NULL, user-entered |
| `time_taken_minutes` | INTEGER | NULL, manually entered, non-negative |
| `notes` | TEXT | NULL |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required |

**Constraints:** Same progress/date consistency. `(lesson_id, sort_order)` unique; optionally `(lesson_id, normalized title)` unique if the product chooses to reject same-title siblings. **Relationships:** Lesson 1:N Topic. Topic category attribution is explicit via its parent chain Topic → Lesson → LearningItem → Category; do not store a duplicate category on Topic. **Indexes:** `(lesson_id, sort_order)`, `(status, completed_on)`.

### 3.6 LearningPrerequisite

**Why:** Stores the explicitly requested informational prerequisite relationship without a readiness gate.

| Field | Type | Rules |
|---|---|---|
| `learning_item_id` | UUID | PK part; FK → LearningItem, dependent item |
| `prerequisite_item_id` | UUID | PK part; FK → LearningItem, prerequisite |
| `created_at` | TIMESTAMPTZ | Required |

**Constraints:** Composite PK prevents duplicate links; check the two IDs differ. Cycles may be warned about by application validation but never block study/completion. **Cardinality:** LearningItem N:N LearningItem. **Indexes:** PK supports reverse lookup by prerequisite; add `(prerequisite_item_id, learning_item_id)` for that query.

### 3.7 Song

**Why:** Songs have repertoire-specific difficulty and sections; keeping them separate from general LearningItems avoids forcing a song into the lesson hierarchy.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `category_id` | UUID | FK → Category, NULL; user-selected when categorized |
| `title` | TEXT | Required |
| `composer` | TEXT | NULL |
| `difficulty` | SMALLINT | NULL, user-assigned 1–5 |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`; manually controlled |
| `added_on` | DATE | Required; normally the user-visible creation date |
| `started_on`, `completed_on` | DATE | NULL, user-entered |
| `rating` | SMALLINT | NULL, 1–5 subjective rating |
| `notes` | TEXT | NULL |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required |

**Constraints:** Difficulty/rating within 1–5; dates are ordered when present and remain optional rather than being inferred. Song category is explicit, never inferred from composer/genre. **Relationships:** Category 1:N optional Songs; Song 1:N SongSections. **Indexes:** `(status, completed_on)`, `(category_id, status)`.

### 3.8 SongSection

**Why:** Tracks manually defined parts of a song independently while keeping the song-level progress record.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `song_id` | UUID | FK → Song, required |
| `title` | TEXT | Required (e.g. Intro, Verse, Ending) |
| `sort_order` | INTEGER | Required, non-negative |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `started_on`, `completed_on` | DATE | NULL, manually entered |
| `rating` | SMALLINT | NULL, 1–5 |
| `notes` | TEXT | NULL |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required |

**Constraints:** `(song_id, sort_order)` unique; valid date order and rating range. No hand-part tracking. **Relationships:** Song 1:N SongSection. **Indexes:** `(song_id, sort_order)`, `(status, completed_on)`.

### 3.9 WeeklyPeriod

**Why:** Defines an ordered seven-local-day planning period and provides an immutable historical anchor for weekly goals and review cycles.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `sequence_no` | INTEGER | Required, positive, monotonically increasing planning-period number |
| `start_on` | DATE | Required, inclusive local date |
| `timezone_name` | TEXT | Required IANA snapshot from profile at creation |
| `main_goals_completed_at` | TIMESTAMPTZ | NULL until this period's Main goals have all been completed |
| `created_at` | TIMESTAMPTZ | Required |

`end_on` is derived as `start_on + 7` and is exclusive; do not store a second editable end date. Thus the interval is `[start_on, start_on + 7)` and includes exactly seven local dates. **Constraints:** unique `sequence_no`, unique `start_on`; create periods in order and reject overlapping date ranges in the application transaction. Periods need not be adjacent because an optional one/two-day review period can occur between them. `main_goals_completed_at` is set when there is at least one Main goal and every Main goal is Completed; Extra goals are optional and do not block this marker. It records that the goals reached completion, not that seven dates elapsed, and remains historical if a goal is later reopened. **Relationships:** WeeklyPeriod 1:N WeeklyGoal; each fixed group of three consecutive periods is associated with one ReviewCycle. **Indexes:** `(start_on)`, `(main_goals_completed_at)`; unique sequence index.

### 3.10 WeeklyGoal

**Why:** Represents the user's goal for a particular week. Keeping one row per week means carry-forward never moves or overwrites the prior week's goal.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `weekly_period_id` | UUID | FK → WeeklyPeriod, required |
| `kind` | ENUM | `MAIN`, `EXTRA` |
| `title` | TEXT | Required snapshot/goal wording |
| `notes` | TEXT | NULL |
| `status` | ENUM | `NOT_TOUCHED`, `PARTIALLY_COMPLETED`, `COMPLETED`; manually controlled |
| `started_on`, `completed_on` | DATE | NULL, manually entered |
| `rating` | SMALLINT | NULL, 1–5 |
| `learning_item_id` | UUID | FK → LearningItem, NULL |
| `lesson_id` | UUID | FK → Lesson, NULL |
| `topic_id` | UUID | FK → Topic, NULL |
| `song_id` | UUID | FK → Song, NULL |
| `song_section_id` | UUID | FK → SongSection, NULL |
| `personal_goal_id` | UUID | FK → PersonalGoal, NULL |
| `review_entry_id` | UUID | FK → ReviewEntry, NULL; optional manually chosen follow-up |
| `source_goal_id` | UUID | FK → WeeklyGoal, NULL; prior goal instance copied forward |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

The target columns are deliberate typed optional FKs, not a weak `(target_type, target_id)` polymorphic reference. A database CHECK requires no more than one target FK to be non-NULL; zero means a free-form goal. A linked item is an explicit target and does not change that item's learning status. Source goal is separate from target. `(weekly_period_id, id)` is unique as a composite reference where needed.

**Relationships:** WeeklyPeriod 1:N WeeklyGoal; each goal targets zero or one of LearningItem/Lesson/Topic/Song/SongSection/PersonalGoal/ReviewEntry; a goal may have many related practice records through WeeklyGoalPracticeRecord; a carried goal may point to its prior instance with `source_goal_id`. **Uniqueness:** partial unique indexes per `(weekly_period_id, learning_item_id)` and likewise for each other typed target prevent exact same-type duplicate targets within a week. Application validation should also reject semantically duplicate carry-forward items in the same week. **Constraints:** rating 1–5; dates remain optional and user-entered; if both are present, completed date cannot precede started date; `source_goal_id <> id`; target source and new week must be valid. **Indexes:** `(weekly_period_id, kind, status)`, `(status, completed_on)`, each target FK, `source_goal_id`.

### 3.11 WeeklyGoalStatusChange

**Why:** Preserves meaningful manual completion/reopening/correction history without making the status ledger the source of truth.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `weekly_goal_id` | UUID | FK → WeeklyGoal, required |
| `from_status` | ENUM | NULL only for an initial transition |
| `to_status` | ENUM | Required, same three statuses as WeeklyGoal |
| `effective_on` | DATE | NULL if the user does not know/provide an effective date |
| `recorded_at` | TIMESTAMPTZ | Required actual edit instant |
| `correction_note` | TEXT | NULL |

**Rules:** Append a row and update WeeklyGoal's current status/date in one transaction. Corrected dates/statuses add another row; never rewrite old change rows. The current state on WeeklyGoal is read directly. **Cardinality:** WeeklyGoal 1:N changes. **Indexes:** `(weekly_goal_id, recorded_at)`.

### 3.12 LearningProgressChange

**Why:** Retains Started/Completed/Reopened history for learning items, lessons, topics, songs, and sections while allowing their current status on the primary row.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `learning_item_id` | UUID | FK → LearningItem, NULL |
| `lesson_id` | UUID | FK → Lesson, NULL |
| `topic_id` | UUID | FK → Topic, NULL |
| `song_id` | UUID | FK → Song, NULL |
| `song_section_id` | UUID | FK → SongSection, NULL |
| `from_status` | ENUM | NULL only initially |
| `to_status` | ENUM | Required: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `effective_on` | DATE | NULL if the user does not know/provide an effective date |
| `recorded_at` | TIMESTAMPTZ | Required actual edit instant |
| `correction_note` | TEXT | NULL |

Exactly one target FK must be non-NULL, enforced by a CHECK. Append and update that target's current status/dates transactionally. This typed-reference pattern retains FK integrity without event sourcing. **Cardinality:** each progress target 1:N changes. **Indexes:** one `(target_id, recorded_at)` index for each target column.

### 3.13 PersonalGoal

**Why:** Separates longer-horizon personal and practice objectives from week-specific goal instances.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `kind` | ENUM | `LONG_TERM`, `PRACTICE` |
| `title` | TEXT | Required |
| `notes` | TEXT | NULL |
| `status` | ENUM | `ACTIVE`, `COMPLETED`, `PAUSED`, `CANCELLED`; manually controlled |
| `starts_on`, `target_on`, `completed_on` | DATE | NULL |
| `target_minutes` | INTEGER | NULL, for a practice time target |
| `target_practice_days` | INTEGER | NULL, for a practice frequency target |
| `target_period` | ENUM | NULL or `WEEK`, `MONTH`, `YEAR`, `ALL_TIME`; practice goal only |
| `rating` | SMALLINT | NULL, 1–5 |
| `archived_at` | TIMESTAMPTZ | NULL |
| common timestamps |  | Required |

Practice goals require at least one positive target measure and a target period; long-term goals leave practice target fields NULL. If both measures are supplied, both apply. For practice-goal measurements and general practice summaries, `WEEK` means Monday through Sunday in the configured timezone; this calendar reporting week is distinct from a user-started `WeeklyPeriod`, which always contains exactly seven dates. This keeps the review-day practice records in calendar summaries. This supports common time/frequency goals without a general configurable-metric engine. **Relationships:** PersonalGoal may be targeted by many WeeklyGoals. **Indexes:** `(kind, status, target_on)`.

### 3.14 PracticeRecord

**Why:** Stores a manually entered record after practice. It is not a live practice session or timer.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `practiced_on` | DATE | Required local calendar date entered by user |
| `duration_minutes` | INTEGER | Required positive manually entered duration |
| `category_id` | UUID | FK → Category, NULL; explicit manual attribution only |
| `learning_item_id` | UUID | FK → LearningItem, NULL |
| `lesson_id` | UUID | FK → Lesson, NULL |
| `topic_id` | UUID | FK → Topic, NULL |
| `song_id` | UUID | FK → Song, NULL |
| `song_section_id` | UUID | FK → SongSection, NULL |
| `rating` | SMALLINT | NULL, 1–5 |
| `notes` | TEXT | NULL |
| `recording_reference` | TEXT | NULL; filename/path/link/note, not file bytes |
| `recorded_at` | TIMESTAMPTZ | Required actual entry instant |
| `updated_at` | TIMESTAMPTZ | Required |

Several target FKs may be set together to express a practice record that spans related material (e.g. a topic and a song section); each FK is valid independently. Parent consistency (Topic belongs to selected Lesson; Section belongs to selected Song; Lesson belongs to selected LearningItem) is checked in the application transaction. Category is deliberately not inferred from any target. An unclassified practice record is excluded from category rankings. **Relationships:** Category 1:N optional practice records; a record may target learning/song records and may relate to many weekly goals through the join table. **Indexes:** `(practiced_on)`, `(category_id, practiced_on)`, each target/date pair, and `(rating, practiced_on)` where weak-area views use it.

### 3.15 WeeklyGoalPracticeRecord

**Why:** Lets one manually entered practice record support several goals and one goal collect several records without duplicating duration or notes.

| Field | Type | Rules |
|---|---|---|
| `weekly_goal_id` | UUID | PK part; FK → WeeklyGoal |
| `practice_record_id` | UUID | PK part; FK → PracticeRecord |
| `created_at` | TIMESTAMPTZ | Required |

Composite PK prevents duplicate association. **Cardinality:** WeeklyGoal N:N PracticeRecord.

### 3.16 GoalCarryForward

**Why:** Tracks one continuous piece of unfinished/deferred goal work across week-specific goal instances, retaining the original and current instance.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `origin_goal_id` | UUID | FK → WeeklyGoal, required; first weekly instance, never changed |
| `current_goal_id` | UUID | FK → WeeklyGoal, required; latest instance |
| `state` | ENUM | `PENDING`, `IN_WEEK`, `RESOLVED`, `DISMISSED` |
| `first_deferred_at` | TIMESTAMPTZ | NULL until explicitly marked Learn Later; immutable once set |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

Create the row when the user marks a goal Learn Later or when an elapsed period yields an unfinished candidate. `origin_goal_id` preserves the source week; `current_goal_id` points to the current instance. A CHECK requires origin and current to be valid goal rows; application transaction validates that cloned goals preserve target/title and sequence forward in time. At most one active (`PENDING`/`IN_WEEK`) carry-forward per current goal, enforced by a partial unique index. **Indexes:** `(state, created_at)`, `origin_goal_id`, `current_goal_id`.

### 3.17 GoalCarryForwardEvent

**Why:** Captures the user's decision and every deferral/re-add without overwriting earlier weeks or reducing Learn Later to a boolean.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `carry_forward_id` | UUID | FK → GoalCarryForward |
| `planning_week_id` | UUID | FK → WeeklyPeriod; week in which decision/candidate event happened |
| `event_type` | ENUM | `LEARN_LATER_MARKED`, `CANDIDATE_CREATED`, `OFFERED`, `LATER`, `ADDED`, `AUTO_ADDED_THRESHOLD`, `RESOLVED`, `DISMISSED` |
| `from_goal_id` | UUID | FK → WeeklyGoal, NULL |
| `to_goal_id` | UUID | FK → WeeklyGoal, NULL; set for add events |
| `recorded_at` | TIMESTAMPTZ | Required |

Rows are append-only. `LATER` is an explicit deferral action. Number of deferrals is derived by counting `LEARN_LATER_MARKED` plus `LATER` events; `CANDIDATE_CREATED` does not increment that count because it is system identification, not a user choice. Every event records the week and relevant goal instance. An `ADDED`/`AUTO_ADDED_THRESHOLD` event points to the newly created WeeklyGoal. **Indexes:** `(carry_forward_id, recorded_at)`, `(planning_week_id, event_type)`; application logic makes one decision per carry-forward per planning operation idempotent.

### 3.18 ReviewCycle

**Why:** Represents one fixed set of three planning periods and separately records whether their goals were completed, whether a review was offered, and whether the user accepted or skipped it.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `cycle_number` | INTEGER | Required, positive; periods 1–3 are cycle 1, 4–6 cycle 2, etc. |
| `first_week_id` | UUID | FK → WeeklyPeriod, required and unique |
| `second_week_id` | UUID | FK → WeeklyPeriod, required and unique |
| `third_week_id` | UUID | FK → WeeklyPeriod, required and unique |
| `goals_completed_at` | TIMESTAMPTZ | NULL until all three periods' Main goals are complete |
| `offered_at` | TIMESTAMPTZ | NULL until cycle goal completion; then records the offer instant |
| `decision` | ENUM | `NOT_OFFERED`, `PENDING`, `ACCEPTED`, `SKIPPED` |
| `decided_at` | TIMESTAMPTZ | NULL until accepted or skipped |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

Create the row when the third planning period in its fixed group is created, associating its three consecutive periods by `sequence_no`. The cycle becomes goal-complete only when each WeeklyPeriod has a non-NULL `main_goals_completed_at`; date passage alone never changes eligibility. Set `goals_completed_at` and `offered_at` when the last of those three periods reaches Main-goal completion, and set `decision=PENDING`. The user then chooses ACCEPTED or SKIPPED. A completed Review is represented by its own Review status, not by overwriting the decision. **Constraints:** unique `cycle_number` and unique week FKs; application invariant that the three week sequence numbers are consecutive; before goal completion, `offered_at` must be NULL and decision `NOT_OFFERED`; after goal completion, offer and decision state must be present. **Relationships:** one ReviewCycle has zero or one Review. **Indexes:** unique week FKs/cycle number, `(decision, offered_at)`.

### 3.19 Review

**Why:** Holds a manually created review/exam/practice period and its shared dates, duration, rating, and notes.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `review_cycle_id` | UUID | FK → ReviewCycle, required and unique |
| `starts_on` | DATE | Required |
| `ends_on` | DATE | Required, inclusive; same day or next day only (one or two calendar days) |
| `duration_minutes` | INTEGER | NULL, manually entered positive total if applicable |
| `status` | ENUM | `IN_PROGRESS`, `COMPLETED` |
| `rating` | SMALLINT | NULL, 1–5 |
| `notes` | TEXT | NULL |
| common timestamps |  | Required |

**Constraints:** `ends_on >= starts_on` and at most one date after; duration positive when set. A Review may only be created after its cycle was accepted; completing it changes Review status while the ReviewCycle retains the accepted decision. **Relationships:** ReviewCycle 1:0..1 Review; Review 1:N ReviewEntry. **Indexes:** `(starts_on, status)`.

### 3.20 ReviewEntry

**Why:** Represents manually entered review topics/tasks and their results without separate tables for each short free-form list.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `review_id` | UUID | FK → Review, required |
| `kind` | ENUM | `TOPIC`, `TASK` |
| `title` | TEXT | Required |
| `topic_id` | UUID | FK → Topic, NULL; optional link to catalog topic |
| `result` | TEXT | NULL; user-entered outcome, including what went well/poorly |
| `rating` | SMALLINT | NULL, 1–5 |
| `sort_order` | INTEGER | Required, non-negative |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

**Constraints:** `(review_id, sort_order)` unique; a topic-kind entry may optionally reference a Topic; tasks may also link a Topic if useful. A weak result is informational. A user may deliberately create a new WeeklyGoal linked through `review_entry_id`; no goal is forced. **Indexes:** `(review_id, sort_order)`, `(topic_id)`.

### 3.21 LoginDay

**Why:** Stores enough immutable day-level login history to derive the current/longest grace-day streak and answer historical questions without trusting a counter.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `local_date` | DATE | Required date of successful login in the then-configured timezone |
| `timezone_name` | TEXT | Required IANA timezone snapshot |
| `first_login_at` | TIMESTAMPTZ | Required successful login instant |
| `last_login_at` | TIMESTAMPTZ | Required; >= first login |

One row per local calendar date; repeated logins that date update `last_login_at`, not add streak days. Unique `local_date` because the app has one owner. **Indexes:** unique `local_date`; `(first_login_at)` if needed for audit.

### 3.22 AchievementDefinition

**Why:** Stores editable, extendable achievement metadata/configuration separately from earned achievements; avoids embedding every example as a schema enum.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `key` | TEXT | Required unique stable identifier |
| `name`, `description` | TEXT | Required name; description nullable |
| `evaluator_key` | TEXT | Required identifier handled by domain evaluator code |
| `rule_config` | JSONB | Required parameters such as threshold; data only, never executable code |
| `is_active` | BOOLEAN | Required, default true |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

The initial achievement definitions are data seeded by the application; extensibility means new evaluator strategies/definitions can be added later, not arbitrary user-authored executable rules. **Relationships:** Definition 1:N AwardedAchievement (one-time award per definition in v1). **Indexes:** unique `key`, `(is_active, evaluator_key)`.

### 3.23 AwardedAchievement

**Why:** Preserves that an achievement was earned and what supported it, even if a definition is later renamed or its rule changes.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `achievement_definition_id` | UUID | FK → AchievementDefinition |
| `earned_at` | TIMESTAMPTZ | Required |
| `definition_snapshot` | JSONB | Required snapshot of key/name/rule version at earning time |
| `evidence_snapshot` | JSONB | Required/nullable compact references and observed values used to award |
| `created_at` | TIMESTAMPTZ | Required |

Unique `achievement_definition_id` prevents duplicate one-time awards; threshold tiers are separate definitions. Re-evaluation is idempotent and awards only when source data satisfies a definition. Do not use an award to gate learning. **Indexes:** `(earned_at)`, unique definition FK.

### 3.24 Milestone

**Why:** Records a broad personal event that differs from a rule-derived achievement.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | Required, manually entered |
| `description` | TEXT | NULL |
| `happened_on` | DATE | Required, user-entered local date |
| `category_id` | UUID | FK → Category, NULL, explicit optional attribution |
| `created_at`, `updated_at` | TIMESTAMPTZ | Required |

Examples include Started Piano, First Performance, and First Classical Piece. Milestones do not change achievement state or access. **Indexes:** `(happened_on)`, `(category_id, happened_on)`.

## 4. Relationships and cardinality summary

| Relationship | Cardinality / rule |
|---|---|
| Category → LearningItem | 1 to many; each LearningItem has exactly one Category |
| LearningItem → Lesson → Topic | 1 to many at each level; lesson/topic is separate and user-created |
| LearningItem ↔ LearningItem prerequisite | many-to-many via LearningPrerequisite; informational only |
| Category → Song | 1 to many; Song category optional and explicit |
| Song → SongSection | 1 to many |
| WeeklyPeriod → WeeklyGoal | 1 to many; each goal is one immutable week-specific instance |
| WeeklyGoal → target | zero or one typed target FK; free-form goal allowed |
| WeeklyGoal ↔ PracticeRecord | many-to-many via WeeklyGoalPracticeRecord |
| WeeklyGoal → GoalCarryForward | one active carry-forward thread at most per current goal; thread retains origin/current instances |
| GoalCarryForward → GoalCarryForwardEvent | 1 to many append-only events |
| WeeklyPeriod ↔ ReviewCycle | each cycle is associated with exactly three consecutive periods; each period belongs to at most one cycle |
| ReviewCycle → Review | zero or one; skipped or accepted-but-not-started cycles need no Review row |
| Review → ReviewEntry | 1 to many |
| AchievementDefinition → AwardedAchievement | one-to-many over future definition versions; one award per definition in v1 |

## 5. Weekly goal and Learn Later workflow

### 5.1 Distinct state concepts

- `WeeklyGoal.status` describes the user's progress on that week's goal only.
- `LearningItem`/`Lesson`/`Topic` status describes the user's broader current learning progress and is not changed when a weekly goal is added or completed.
- `GoalCarryForward.state` describes whether a particular piece of goal work is pending, currently assigned in a week, resolved, or dismissed.
- A topic can remain Completed while appearing in later practice records or weekly goals. Re-practice does not reopen it unless the user explicitly changes its learning status.

### 5.2 Create-week transaction

When the user creates the next week, the application performs one transaction:

1. Validate a unique, sequential period start and capture the current profile timezone.
2. Find elapsed prior periods and create `GoalCarryForward` rows for uncompleted goals not already represented; explicit Learn Later rows already exist. Original goals and periods are not modified.
3. Collect every `PENDING` carry-forward thread. This count includes deferred items and ordinary unfinished candidates.
5. If count is 4+, create a new Main WeeklyGoal for every pending thread in the same transaction; append `AUTO_ADDED_THRESHOLD` for each; update each thread to point at its new goal and `IN_WEEK`. No item-by-item decisions are requested for this operation.
6. When an active goal completes, append `RESOLVED` and set the thread `RESOLVED`. If that goal remains unfinished at a later period boundary, it becomes pending again with a `CANDIDATE_CREATED` event. A future explicit Learn Later marking or `Later` response is counted as a deferral.

`origin_goal_id` never changes. Each added weekly goal is a new row, so Week 1 remains intact after Week 2 or later rollover. Deferral count is derived by counting `LEARN_LATER_MARKED` and `LATER` events; the event rows identify the dates/weeks and resulting goal instance. Unique target-per-week indexes plus transaction-level validation prevent duplicates. Goal creation and its carry-forward event/state update must commit or roll back together.

The week-creation flow resolves/prepopulates accepted carry-forward items before accepting additional manual goals. The same target is rejected if already present in that week. To defer one subtopic independently, create a weekly goal targeted at that Topic; a goal targeted at the parent Lesson is a separate, broader goal and is not silently split into topic goals.

## 6. Review-cycle model

Planning periods have monotonic `sequence_no` values and are grouped in fixed sets of three: 1–3, 4–6, 7–9, and so on. Create a ReviewCycle when its third period is created, linking all three weeks. Each period's goals count as completed when it has at least one Main goal and every Main goal is Completed; Extra goals are optional. Record each period's `main_goals_completed_at` when that becomes true. Only when all three linked periods have that marker is the cycle complete and the review offered. The offer can happen before a seven-day interval ends if the goals are completed early. Elapsed dates alone never create the offer.

- Cycle goal completion, offer time, user decision, and actual review records are separate facts.
- The user may accept or skip. Acceptance may be followed by a manually created Review spanning one or two local dates, with duration and entries recorded manually.
- A skipped cycle has no Review row; an accepted-but-not-started cycle may also have no Review row.
- Creating the next normal period is never conditional on goal completion, review acceptance, skip, or review completion. Unfinished goals remain available to the existing carry-forward workflow.
- If a completed review has a weak result, the user may create a goal linked to the relevant ReviewEntry; the database does not generate it.

## 7. Streak calculation

Successful login inserts or updates one `LoginDay` for the current local date in `OwnerProfile.timezone_name`, storing the timezone snapshot and UTC instants. No mutable streak counter is authoritative.

Sort `LoginDay.local_date` ascending. Consecutive login rows are in the same streak run when their date difference is at most two days. A two-day difference means exactly one missed local date and contributes both calendar days to the streak length. A difference of three or more breaks the run; the new run begins at length one on that login date. The streak length for a run is `last_login_date - first_login_date + 1`, so allowed grace days count. **Longest streak** is the largest run span. For the live **current streak**, keep the latest run active while the latest login is no more than two dates before the current local date; the displayed count extends through today, including the single grace date. Once two complete consecutive dates have passed without a login, the next login is after a gap of at least three and starts at one. On a login after a gap of three or more local dates, the newly created run is one.

Login-day uniqueness makes repeated logins in one local day count once. A timezone preference change applies prospectively; the old LoginDay rows and snapshots are not rewritten. If a date is already present when the zone changes, retain that row rather than creating a duplicate local day.

## 8. Category attribution and analytics

- Each LearningItem belongs to one Category. Lessons/topics derive their category through the parent chain for display; do not copy the category onto each child.
- Songs may have one manually selected Category.
- PracticeRecord has its own nullable, manually selected `category_id`. Analytics group only records with this value; absent category is “uncategorized,” not guessed.
- Goals can show target context but do not assign a practice category.
- Most/least practiced category is calculated from `SUM(duration_minutes)` grouped by explicit PracticeRecord.category_id for the selected date range. Daily/monthly/yearly buckets use local calendar dates; weekly practice reporting uses Monday–Sunday in the configured timezone. Weekly goal-completion reporting uses the custom `WeeklyPeriod` boundaries. Define tie/no-data presentation in UI; do not persist rank or total.
- Practice totals, practice frequency, goal completion rates, completion counts, ratings, and streak values are queries/projections over the canonical rows.

## 9. Status and date integrity

- Progress statuses on learning items, lessons, topics, songs, and sections are `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`.
- Weekly goal statuses are exactly `NOT_TOUCHED`, `PARTIALLY_COMPLETED`, `COMPLETED`.
- Completion is always user-controlled; no readiness, prerequisite, rating, or achievement changes it automatically.
- `completed_on` is optional even when current status is `COMPLETED`; never fabricate a date for previously known material. If an item is reopened, retain old LearningProgressChange and clear the current completion date; later completion adds another history row.
- `started_on`/`completed_on` are user-entered effective dates; `recorded_at` is when the application learned of a change. Backdated entries are valid.
- `created_at` is the system creation instant. User-visible local creation day can be rendered in the configured timezone; explicit `added_on` is retained for Songs.
- All durations are stored as integer minutes, never inferred from timestamps. Reject zero/negative values where a duration is required.
- Enforce 1–5 for rating/difficulty values. NULL means not rated, not zero.

## 10. History, corrections, and deletion/archive policy

- LearningProgressChange and WeeklyGoalStatusChange append transitions; current state stays on its subject row for simple reads.
- GoalCarryForwardEvent is append-only, with explicit decision type, planning week, time, and source/created goal references.
- Review records, practice records, login days, milestone dates, goal instances, and completed historical records are retained.
- Correcting an effective progress/status date appends a change record with corrected value and optional reason while updating the current row in one transaction. Do not edit away the original change. A correction to text, title, category assignment, duration, or rating updates the current record; no generic field-by-field audit log is proposed.
- Archive categories, catalog items, songs, sections, and personal goals using `archived_at`. Existing FKs and exports remain. Do not cascade-delete meaningful records.
- Hard delete is limited to an accidental, never-referenced draft before it has history; otherwise archive/correct. The exact user-facing delete policy should be documented before implementation.

## 11. Constraints and indexes summary

In addition to table-specific constraints:

- Use PK UUIDs and real FKs; default FK deletion is RESTRICT.
- Check nonnegative/positive durations, 1–5 ratings/difficulty, ordered dates, valid enums, and non-self prerequisites.
- Add a CHECK on WeeklyGoal to allow at most one typed target FK and on LearningProgressChange to require exactly one target FK.
- Use partial unique indexes on `(weekly_period_id, target_fk)` for each non-null WeeklyGoal target; enforce same-week carry-forward semantic duplicate prevention in the transactional domain service.
- Unique week sequence/start date; reject overlapping seven-day ranges in the creation use case with concurrency-safe transaction/locking.
- Unique category normalized name, lesson topic order, song section order, review entry order, and login local date.
- Index foreign keys used in joins, week/status/date lookups, practice date/category/date, progress completion date, and event chronology as listed above.
- No speculative full-text/search, time-series, partitioning, or redundant summary tables in v1.

## 12. Export design

The export is a versioned data contract independent of the UI:

- **JSON:** one snapshot envelope with `formatVersion`, `exportedAt`, `timezone`, and arrays keyed by entity. Include stable UUIDs, all FKs, archived records, enum values, source/current goal IDs, history/event rows, review cycles (including skipped), full login-day history, achievement definition/evidence snapshots, and timestamps. Include all meaningful profile preferences. Do not export authentication secrets.
- **CSV:** multiple UTF-8 logical datasets (for example categories, learning items, lessons, topics, progress changes, weeks, goals, carry-forward threads/events, practice, goal-practice links, songs, sections, review cycles/reviews/entries, login days, achievement definitions/awards, milestones). Use UUID columns to preserve relationships; document dates, timezone, enums, and empty values.
- Export from a consistent database snapshot/transaction so concurrent edits do not create dangling relationships. Include archived rows. Preserve event rows in original recorded order.
- Do not include derived analytics as authoritative data. The timeline is reconstructed from source dates/events and milestones; a separate timeline table is unnecessary.
- Restore/import is not a v1 requirement. Keep stable identifiers and format versioning so a later import can be designed without changing the export's meaning.

## 13. Why this model is intentionally bounded

- Lesson and Topic are distinct because both have independent progress and topics must be individually deferred/tracked.
- LearningItem is retained for category-level skills, lesson grouping, prerequisites, goals, and completion without requiring a lesson.
- A typed goal target avoids a generic polymorphic FK with no database integrity. A single target is enough for one weekly goal; related practices use a join table.
- Songs and sections are separate because song-specific difficulty and section progress differ from lesson content.
- Two narrow status-history tables and one carry-forward event table preserve explicitly requested history; the design is not general event sourcing.
- No Rating table, analytics aggregate tables, separate timeline event table, backup metadata, recording-file table, auth tables, or generic content plugin layer is added without a concrete v1 need.

## 14. Decisions still needed

No product/domain decision blocks implementation of the proposed model. The remaining choices are operational and should be settled before public production access:

1. Select the sign-in/session and account-recovery method. Keep database access behind server-side authorization until this exists.
2. Select the web-application hosting provider and confirm its deployment region can reach the recommended Neon Frankfurt region securely.

Database defaults are otherwise explicit: Neon Free in Frankfurt (`eu-central-1`) initially, with a usage-based paid Neon plan if free-tier sleep/quota behavior becomes unacceptable; weekly start dates are entered when creating sequential periods; periods may have a 1–2 day review gap; ratings/difficulty use 1–5; a review is offered only after the Main goals in all three associated periods are complete; missing practice category is excluded from rankings; archive referenced content; weak reviews only inform user-created goals.
