-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WeeklyGoalKind" AS ENUM ('MAIN', 'EXTRA');

-- CreateEnum
CREATE TYPE "WeeklyGoalStatus" AS ENUM ('NOT_TOUCHED', 'PARTIALLY_COMPLETED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PersonalGoalKind" AS ENUM ('LONG_TERM', 'PRACTICE');

-- CreateEnum
CREATE TYPE "PersonalGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalTargetPeriod" AS ENUM ('WEEK', 'MONTH', 'YEAR', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "CarryForwardState" AS ENUM ('PENDING', 'IN_WEEK', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CarryForwardEventType" AS ENUM ('LEARN_LATER_MARKED', 'CANDIDATE_CREATED', 'OFFERED', 'LATER', 'ADDED', 'AUTO_ADDED_THRESHOLD', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReviewCycleDecision" AS ENUM ('NOT_OFFERED', 'PENDING', 'ACCEPTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewEntryKind" AS ENUM ('TOPIC', 'TASK');

-- CreateTable
CREATE TABLE "owner_profile" (
    "id" UUID NOT NULL,
    "timezone_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_item" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_on" DATE,
    "completed_on" DATE,
    "time_taken_minutes" INTEGER,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "learning_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" UUID NOT NULL,
    "learning_item_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_on" DATE,
    "completed_on" DATE,
    "time_taken_minutes" INTEGER,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_on" DATE,
    "completed_on" DATE,
    "time_taken_minutes" INTEGER,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_prerequisite" (
    "learning_item_id" UUID NOT NULL,
    "prerequisite_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_prerequisite_pkey" PRIMARY KEY ("learning_item_id","prerequisite_item_id")
);

-- CreateTable
CREATE TABLE "song" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "difficulty" INTEGER,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "added_on" DATE NOT NULL,
    "started_on" DATE,
    "completed_on" DATE,
    "rating" INTEGER,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_section" (
    "id" UUID NOT NULL,
    "song_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_on" DATE,
    "completed_on" DATE,
    "rating" INTEGER,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "song_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_period" (
    "id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "start_on" DATE NOT NULL,
    "timezone_name" TEXT NOT NULL,
    "main_goals_completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_goal" (
    "id" UUID NOT NULL,
    "weekly_period_id" UUID NOT NULL,
    "kind" "WeeklyGoalKind" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "WeeklyGoalStatus" NOT NULL DEFAULT 'NOT_TOUCHED',
    "started_on" DATE,
    "completed_on" DATE,
    "rating" INTEGER,
    "learning_item_id" UUID,
    "lesson_id" UUID,
    "topic_id" UUID,
    "song_id" UUID,
    "song_section_id" UUID,
    "personal_goal_id" UUID,
    "review_entry_id" UUID,
    "source_goal_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weekly_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_goal_status_change" (
    "id" UUID NOT NULL,
    "weekly_goal_id" UUID NOT NULL,
    "from_status" "WeeklyGoalStatus",
    "to_status" "WeeklyGoalStatus" NOT NULL,
    "effective_on" DATE,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correction_note" TEXT,

    CONSTRAINT "weekly_goal_status_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_progress_change" (
    "id" UUID NOT NULL,
    "learning_item_id" UUID,
    "lesson_id" UUID,
    "topic_id" UUID,
    "song_id" UUID,
    "song_section_id" UUID,
    "from_status" "ProgressStatus",
    "to_status" "ProgressStatus" NOT NULL,
    "effective_on" DATE,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correction_note" TEXT,

    CONSTRAINT "learning_progress_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_goal" (
    "id" UUID NOT NULL,
    "kind" "PersonalGoalKind" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PersonalGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_on" DATE,
    "target_on" DATE,
    "completed_on" DATE,
    "target_minutes" INTEGER,
    "target_practice_days" INTEGER,
    "target_period" "GoalTargetPeriod",
    "rating" INTEGER,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personal_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_record" (
    "id" UUID NOT NULL,
    "practiced_on" DATE NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "category_id" UUID,
    "learning_item_id" UUID,
    "lesson_id" UUID,
    "topic_id" UUID,
    "song_id" UUID,
    "song_section_id" UUID,
    "rating" INTEGER,
    "notes" TEXT,
    "recording_reference" TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "practice_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_goal_practice_record" (
    "weekly_goal_id" UUID NOT NULL,
    "practice_record_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_goal_practice_record_pkey" PRIMARY KEY ("weekly_goal_id","practice_record_id")
);

-- CreateTable
CREATE TABLE "goal_carry_forward" (
    "id" UUID NOT NULL,
    "origin_goal_id" UUID NOT NULL,
    "current_goal_id" UUID NOT NULL,
    "state" "CarryForwardState" NOT NULL DEFAULT 'PENDING',
    "first_deferred_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goal_carry_forward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_carry_forward_event" (
    "id" UUID NOT NULL,
    "carry_forward_id" UUID NOT NULL,
    "planning_week_id" UUID NOT NULL,
    "event_type" "CarryForwardEventType" NOT NULL,
    "from_goal_id" UUID,
    "to_goal_id" UUID,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_carry_forward_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cycle" (
    "id" UUID NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "first_week_id" UUID NOT NULL,
    "second_week_id" UUID NOT NULL,
    "third_week_id" UUID NOT NULL,
    "goals_completed_at" TIMESTAMPTZ(6),
    "offered_at" TIMESTAMPTZ(6),
    "decision" "ReviewCycleDecision" NOT NULL DEFAULT 'NOT_OFFERED',
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" UUID NOT NULL,
    "review_cycle_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "duration_minutes" INTEGER,
    "status" "ReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_entry" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "kind" "ReviewEntryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "topic_id" UUID,
    "result" TEXT,
    "rating" INTEGER,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "review_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_day" (
    "id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "timezone_name" TEXT NOT NULL,
    "first_login_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "login_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_definition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "evaluator_key" TEXT NOT NULL,
    "rule_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "achievement_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awarded_achievement" (
    "id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "earned_at" TIMESTAMPTZ(6) NOT NULL,
    "definition_snapshot" JSONB NOT NULL,
    "evidence_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "awarded_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "happened_on" DATE NOT NULL,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_archived_at_idx" ON "category"("archived_at");

-- CreateIndex
CREATE INDEX "learning_item_category_id_archived_at_idx" ON "learning_item"("category_id", "archived_at");

-- CreateIndex
CREATE INDEX "learning_item_status_completed_on_idx" ON "learning_item"("status", "completed_on");

-- CreateIndex
CREATE INDEX "lesson_learning_item_id_archived_at_idx" ON "lesson"("learning_item_id", "archived_at");

-- CreateIndex
CREATE INDEX "lesson_status_completed_on_idx" ON "lesson"("status", "completed_on");

-- CreateIndex
CREATE INDEX "topic_status_completed_on_idx" ON "topic"("status", "completed_on");

-- CreateIndex
CREATE UNIQUE INDEX "topic_lesson_id_sort_order_key" ON "topic"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "learning_prerequisite_prerequisite_item_id_learning_item_id_idx" ON "learning_prerequisite"("prerequisite_item_id", "learning_item_id");

-- CreateIndex
CREATE INDEX "song_status_completed_on_idx" ON "song"("status", "completed_on");

-- CreateIndex
CREATE INDEX "song_category_id_status_idx" ON "song"("category_id", "status");

-- CreateIndex
CREATE INDEX "song_section_status_completed_on_idx" ON "song_section"("status", "completed_on");

-- CreateIndex
CREATE UNIQUE INDEX "song_section_song_id_sort_order_key" ON "song_section"("song_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_period_sequence_no_key" ON "weekly_period"("sequence_no");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_period_start_on_key" ON "weekly_period"("start_on");

-- CreateIndex
CREATE INDEX "weekly_period_start_on_idx" ON "weekly_period"("start_on");

-- CreateIndex
CREATE INDEX "weekly_period_main_goals_completed_at_idx" ON "weekly_period"("main_goals_completed_at");

-- CreateIndex
CREATE INDEX "weekly_goal_weekly_period_id_kind_status_idx" ON "weekly_goal"("weekly_period_id", "kind", "status");

-- CreateIndex
CREATE INDEX "weekly_goal_status_completed_on_idx" ON "weekly_goal"("status", "completed_on");

-- CreateIndex
CREATE INDEX "weekly_goal_learning_item_id_idx" ON "weekly_goal"("learning_item_id");

-- CreateIndex
CREATE INDEX "weekly_goal_lesson_id_idx" ON "weekly_goal"("lesson_id");

-- CreateIndex
CREATE INDEX "weekly_goal_topic_id_idx" ON "weekly_goal"("topic_id");

-- CreateIndex
CREATE INDEX "weekly_goal_song_id_idx" ON "weekly_goal"("song_id");

-- CreateIndex
CREATE INDEX "weekly_goal_song_section_id_idx" ON "weekly_goal"("song_section_id");

-- CreateIndex
CREATE INDEX "weekly_goal_personal_goal_id_idx" ON "weekly_goal"("personal_goal_id");

-- CreateIndex
CREATE INDEX "weekly_goal_review_entry_id_idx" ON "weekly_goal"("review_entry_id");

-- CreateIndex
CREATE INDEX "weekly_goal_source_goal_id_idx" ON "weekly_goal"("source_goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_goal_weekly_period_id_id_key" ON "weekly_goal"("weekly_period_id", "id");

-- CreateIndex
CREATE INDEX "weekly_goal_status_change_weekly_goal_id_recorded_at_idx" ON "weekly_goal_status_change"("weekly_goal_id", "recorded_at");

-- CreateIndex
CREATE INDEX "learning_progress_change_learning_item_id_recorded_at_idx" ON "learning_progress_change"("learning_item_id", "recorded_at");

-- CreateIndex
CREATE INDEX "learning_progress_change_lesson_id_recorded_at_idx" ON "learning_progress_change"("lesson_id", "recorded_at");

-- CreateIndex
CREATE INDEX "learning_progress_change_topic_id_recorded_at_idx" ON "learning_progress_change"("topic_id", "recorded_at");

-- CreateIndex
CREATE INDEX "learning_progress_change_song_id_recorded_at_idx" ON "learning_progress_change"("song_id", "recorded_at");

-- CreateIndex
CREATE INDEX "learning_progress_change_song_section_id_recorded_at_idx" ON "learning_progress_change"("song_section_id", "recorded_at");

-- CreateIndex
CREATE INDEX "personal_goal_kind_status_target_on_idx" ON "personal_goal"("kind", "status", "target_on");

-- CreateIndex
CREATE INDEX "practice_record_practiced_on_idx" ON "practice_record"("practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_category_id_practiced_on_idx" ON "practice_record"("category_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_learning_item_id_practiced_on_idx" ON "practice_record"("learning_item_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_lesson_id_practiced_on_idx" ON "practice_record"("lesson_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_topic_id_practiced_on_idx" ON "practice_record"("topic_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_song_id_practiced_on_idx" ON "practice_record"("song_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_song_section_id_practiced_on_idx" ON "practice_record"("song_section_id", "practiced_on");

-- CreateIndex
CREATE INDEX "practice_record_rating_practiced_on_idx" ON "practice_record"("rating", "practiced_on");

-- CreateIndex
CREATE INDEX "weekly_goal_practice_record_practice_record_id_idx" ON "weekly_goal_practice_record"("practice_record_id");

-- CreateIndex
CREATE INDEX "goal_carry_forward_state_created_at_idx" ON "goal_carry_forward"("state", "created_at");

-- CreateIndex
CREATE INDEX "goal_carry_forward_origin_goal_id_idx" ON "goal_carry_forward"("origin_goal_id");

-- CreateIndex
CREATE INDEX "goal_carry_forward_current_goal_id_idx" ON "goal_carry_forward"("current_goal_id");

-- CreateIndex
CREATE INDEX "goal_carry_forward_event_carry_forward_id_recorded_at_idx" ON "goal_carry_forward_event"("carry_forward_id", "recorded_at");

-- CreateIndex
CREATE INDEX "goal_carry_forward_event_planning_week_id_event_type_idx" ON "goal_carry_forward_event"("planning_week_id", "event_type");

-- CreateIndex
CREATE INDEX "goal_carry_forward_event_from_goal_id_idx" ON "goal_carry_forward_event"("from_goal_id");

-- CreateIndex
CREATE INDEX "goal_carry_forward_event_to_goal_id_idx" ON "goal_carry_forward_event"("to_goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycle_cycle_number_key" ON "review_cycle"("cycle_number");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycle_first_week_id_key" ON "review_cycle"("first_week_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycle_second_week_id_key" ON "review_cycle"("second_week_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_cycle_third_week_id_key" ON "review_cycle"("third_week_id");

-- CreateIndex
CREATE INDEX "review_cycle_decision_offered_at_idx" ON "review_cycle"("decision", "offered_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_review_cycle_id_key" ON "review"("review_cycle_id");

-- CreateIndex
CREATE INDEX "review_starts_on_status_idx" ON "review"("starts_on", "status");

-- CreateIndex
CREATE INDEX "review_entry_topic_id_idx" ON "review_entry"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_entry_review_id_sort_order_key" ON "review_entry"("review_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "login_day_local_date_key" ON "login_day"("local_date");

-- CreateIndex
CREATE INDEX "login_day_first_login_at_idx" ON "login_day"("first_login_at");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_definition_key_key" ON "achievement_definition"("key");

-- CreateIndex
CREATE INDEX "achievement_definition_is_active_evaluator_key_idx" ON "achievement_definition"("is_active", "evaluator_key");

-- CreateIndex
CREATE UNIQUE INDEX "awarded_achievement_achievement_definition_id_key" ON "awarded_achievement"("achievement_definition_id");

-- CreateIndex
CREATE INDEX "awarded_achievement_earned_at_idx" ON "awarded_achievement"("earned_at");

-- CreateIndex
CREATE INDEX "milestone_happened_on_idx" ON "milestone"("happened_on");

-- CreateIndex
CREATE INDEX "milestone_category_id_happened_on_idx" ON "milestone"("category_id", "happened_on");

-- AddForeignKey
ALTER TABLE "learning_item" ADD CONSTRAINT "learning_item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_prerequisite" ADD CONSTRAINT "learning_prerequisite_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_prerequisite" ADD CONSTRAINT "learning_prerequisite_prerequisite_item_id_fkey" FOREIGN KEY ("prerequisite_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_section" ADD CONSTRAINT "song_section_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_weekly_period_id_fkey" FOREIGN KEY ("weekly_period_id") REFERENCES "weekly_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_song_section_id_fkey" FOREIGN KEY ("song_section_id") REFERENCES "song_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_personal_goal_id_fkey" FOREIGN KEY ("personal_goal_id") REFERENCES "personal_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_review_entry_id_fkey" FOREIGN KEY ("review_entry_id") REFERENCES "review_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal" ADD CONSTRAINT "weekly_goal_source_goal_id_fkey" FOREIGN KEY ("source_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal_status_change" ADD CONSTRAINT "weekly_goal_status_change_weekly_goal_id_fkey" FOREIGN KEY ("weekly_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress_change" ADD CONSTRAINT "learning_progress_change_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress_change" ADD CONSTRAINT "learning_progress_change_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress_change" ADD CONSTRAINT "learning_progress_change_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress_change" ADD CONSTRAINT "learning_progress_change_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress_change" ADD CONSTRAINT "learning_progress_change_song_section_id_fkey" FOREIGN KEY ("song_section_id") REFERENCES "song_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_record" ADD CONSTRAINT "practice_record_song_section_id_fkey" FOREIGN KEY ("song_section_id") REFERENCES "song_section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal_practice_record" ADD CONSTRAINT "weekly_goal_practice_record_weekly_goal_id_fkey" FOREIGN KEY ("weekly_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goal_practice_record" ADD CONSTRAINT "weekly_goal_practice_record_practice_record_id_fkey" FOREIGN KEY ("practice_record_id") REFERENCES "practice_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward" ADD CONSTRAINT "goal_carry_forward_origin_goal_id_fkey" FOREIGN KEY ("origin_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward" ADD CONSTRAINT "goal_carry_forward_current_goal_id_fkey" FOREIGN KEY ("current_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward_event" ADD CONSTRAINT "goal_carry_forward_event_carry_forward_id_fkey" FOREIGN KEY ("carry_forward_id") REFERENCES "goal_carry_forward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward_event" ADD CONSTRAINT "goal_carry_forward_event_planning_week_id_fkey" FOREIGN KEY ("planning_week_id") REFERENCES "weekly_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward_event" ADD CONSTRAINT "goal_carry_forward_event_from_goal_id_fkey" FOREIGN KEY ("from_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_carry_forward_event" ADD CONSTRAINT "goal_carry_forward_event_to_goal_id_fkey" FOREIGN KEY ("to_goal_id") REFERENCES "weekly_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycle" ADD CONSTRAINT "review_cycle_first_week_id_fkey" FOREIGN KEY ("first_week_id") REFERENCES "weekly_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycle" ADD CONSTRAINT "review_cycle_second_week_id_fkey" FOREIGN KEY ("second_week_id") REFERENCES "weekly_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycle" ADD CONSTRAINT "review_cycle_third_week_id_fkey" FOREIGN KEY ("third_week_id") REFERENCES "weekly_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "review_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_entry" ADD CONSTRAINT "review_entry_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_entry" ADD CONSTRAINT "review_entry_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awarded_achievement" ADD CONSTRAINT "awarded_achievement_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "achievement_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Hand-authored integrity rules which Prisma schema syntax cannot express.
CREATE UNIQUE INDEX "category_name_normalized_key"
    ON "category" (lower(btrim("name")));
ALTER TABLE "category"
    ADD CONSTRAINT "category_name_not_blank_check" CHECK (length(btrim("name")) > 0);

ALTER TABLE "learning_item"
    ADD CONSTRAINT "learning_item_dates_check"
        CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on"),
    ADD CONSTRAINT "learning_item_time_taken_check"
        CHECK ("time_taken_minutes" IS NULL OR "time_taken_minutes" >= 0);

ALTER TABLE "lesson"
    ADD CONSTRAINT "lesson_dates_check"
        CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on"),
    ADD CONSTRAINT "lesson_time_taken_check"
        CHECK ("time_taken_minutes" IS NULL OR "time_taken_minutes" >= 0);

ALTER TABLE "topic"
    ADD CONSTRAINT "topic_dates_check"
        CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on"),
    ADD CONSTRAINT "topic_sort_order_check" CHECK ("sort_order" >= 0),
    ADD CONSTRAINT "topic_time_taken_check"
        CHECK ("time_taken_minutes" IS NULL OR "time_taken_minutes" >= 0);

ALTER TABLE "learning_prerequisite"
    ADD CONSTRAINT "learning_prerequisite_not_self_check"
        CHECK ("learning_item_id" <> "prerequisite_item_id");

ALTER TABLE "song"
    ADD CONSTRAINT "song_difficulty_check"
        CHECK ("difficulty" IS NULL OR "difficulty" BETWEEN 1 AND 5),
    ADD CONSTRAINT "song_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
    ADD CONSTRAINT "song_dates_check"
        CHECK (("started_on" IS NULL OR "added_on" <= "started_on")
            AND ("completed_on" IS NULL OR "started_on" IS NULL OR "completed_on" >= "started_on")
            AND ("completed_on" IS NULL OR "added_on" <= "completed_on"));

ALTER TABLE "song_section"
    ADD CONSTRAINT "song_section_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
    ADD CONSTRAINT "song_section_sort_order_check" CHECK ("sort_order" >= 0),
    ADD CONSTRAINT "song_section_dates_check"
        CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on");

ALTER TABLE "weekly_period"
    ADD CONSTRAINT "weekly_period_sequence_positive_check" CHECK ("sequence_no" > 0);

ALTER TABLE "weekly_goal"
    ADD CONSTRAINT "weekly_goal_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
    ADD CONSTRAINT "weekly_goal_dates_check"
        CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on"),
    ADD CONSTRAINT "weekly_goal_single_target_check"
        CHECK (num_nonnulls("learning_item_id", "lesson_id", "topic_id", "song_id", "song_section_id", "personal_goal_id", "review_entry_id") <= 1),
    ADD CONSTRAINT "weekly_goal_source_not_self_check"
        CHECK ("source_goal_id" IS NULL OR "source_goal_id" <> "id");

CREATE UNIQUE INDEX "weekly_goal_week_learning_item_key"
    ON "weekly_goal" ("weekly_period_id", "learning_item_id") WHERE "learning_item_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_lesson_key"
    ON "weekly_goal" ("weekly_period_id", "lesson_id") WHERE "lesson_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_topic_key"
    ON "weekly_goal" ("weekly_period_id", "topic_id") WHERE "topic_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_song_key"
    ON "weekly_goal" ("weekly_period_id", "song_id") WHERE "song_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_song_section_key"
    ON "weekly_goal" ("weekly_period_id", "song_section_id") WHERE "song_section_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_personal_goal_key"
    ON "weekly_goal" ("weekly_period_id", "personal_goal_id") WHERE "personal_goal_id" IS NOT NULL;
CREATE UNIQUE INDEX "weekly_goal_week_review_entry_key"
    ON "weekly_goal" ("weekly_period_id", "review_entry_id") WHERE "review_entry_id" IS NOT NULL;

ALTER TABLE "learning_progress_change"
    ADD CONSTRAINT "learning_progress_change_single_target_check"
        CHECK (num_nonnulls("learning_item_id", "lesson_id", "topic_id", "song_id", "song_section_id") = 1);

ALTER TABLE "personal_goal"
    ADD CONSTRAINT "personal_goal_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5),
    ADD CONSTRAINT "personal_goal_dates_check"
        CHECK (("starts_on" IS NULL OR "target_on" IS NULL OR "target_on" >= "starts_on")
            AND ("completed_on" IS NULL OR "starts_on" IS NULL OR "completed_on" >= "starts_on")),
    ADD CONSTRAINT "personal_goal_practice_target_check"
        CHECK (("target_minutes" IS NULL OR "target_minutes" > 0)
            AND ("target_practice_days" IS NULL OR "target_practice_days" > 0)
            AND (("kind" = 'PRACTICE' AND ("target_minutes" IS NOT NULL OR "target_practice_days" IS NOT NULL) AND "target_period" IS NOT NULL)
                OR ("kind" = 'LONG_TERM' AND "target_minutes" IS NULL AND "target_practice_days" IS NULL AND "target_period" IS NULL)));

ALTER TABLE "practice_record"
    ADD CONSTRAINT "practice_record_duration_positive_check" CHECK ("duration_minutes" > 0),
    ADD CONSTRAINT "practice_record_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

CREATE UNIQUE INDEX "goal_carry_forward_active_current_goal_key"
    ON "goal_carry_forward" ("current_goal_id") WHERE "state" IN ('PENDING', 'IN_WEEK');

ALTER TABLE "review_cycle"
    ADD CONSTRAINT "review_cycle_number_positive_check" CHECK ("cycle_number" > 0),
    ADD CONSTRAINT "review_cycle_offer_state_check"
        CHECK (("decision" = 'NOT_OFFERED' AND "goals_completed_at" IS NULL AND "offered_at" IS NULL AND "decided_at" IS NULL)
            OR ("decision" = 'PENDING' AND "goals_completed_at" IS NOT NULL AND "offered_at" IS NOT NULL AND "decided_at" IS NULL)
            OR ("decision" IN ('ACCEPTED', 'SKIPPED') AND "goals_completed_at" IS NOT NULL AND "offered_at" IS NOT NULL AND "decided_at" IS NOT NULL));

ALTER TABLE "review"
    ADD CONSTRAINT "review_dates_check"
        CHECK ("ends_on" >= "starts_on" AND "ends_on" <= "starts_on" + 1),
    ADD CONSTRAINT "review_duration_positive_check"
        CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
    ADD CONSTRAINT "review_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

ALTER TABLE "review_entry"
    ADD CONSTRAINT "review_entry_sort_order_check" CHECK ("sort_order" >= 0),
    ADD CONSTRAINT "review_entry_rating_check"
        CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

ALTER TABLE "login_day"
    ADD CONSTRAINT "login_day_instants_check" CHECK ("last_login_at" >= "first_login_at");

ALTER TABLE "milestone"
    ADD CONSTRAINT "milestone_title_not_blank_check" CHECK (length(btrim("title")) > 0);
