import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guestId: text("guest_id").notNull().unique(),
    username: text("username"),
    passwordHash: text("password_hash"),
    displayName: text("display_name").notNull().default("Athlete"),
    equipment: text("equipment").notNull().default("full_gym"),
    units: text("units").notNull().default("kg"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)],
);

export const exercisesTable = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group").notNull(),
    equipment: text("equipment").notNull(),
    description: text("description"),
    formCues: jsonb("form_cues").$type<string[]>().notNull().default([]),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("exercises_user_idx").on(t.userId)],
);

export const planDaysTable = pgTable(
  "plan_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    day: text("day").notNull(),
    label: text("label").notNull(),
    isRest: boolean("is_rest").notNull().default(false),
    exerciseIds: jsonb("exercise_ids").$type<string[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("plan_user_day_idx").on(t.userId, t.day)],
);

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    day: text("day").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
    totalVolume: doublePrecision("total_volume"),
    estimatedCalories: integer("estimated_calories"),
  },
  (t) => [index("sessions_user_started_idx").on(t.userId, t.startedAt)],
);

export const sessionExercisesTable = pgTable(
  "session_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull(),
    exerciseId: uuid("exercise_id").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [
    index("session_exercises_session_idx").on(t.sessionId),
    uniqueIndex("session_exercise_unique").on(t.sessionId, t.exerciseId),
  ],
);

export const setsTable = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionExerciseId: uuid("session_exercise_id").notNull(),
    setNumber: integer("set_number").notNull(),
    weight: doublePrecision("weight").notNull(),
    reps: integer("reps").notNull(),
    difficulty: text("difficulty").notNull().default("moderate"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sets_session_exercise_idx").on(t.sessionExerciseId)],
);

export const bodyweightTable = pgTable(
  "bodyweight",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    weight: doublePrecision("weight").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bodyweight_user_idx").on(t.userId, t.recordedAt)],
);

export const waterTable = pgTable(
  "water_intake",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    date: date("date").notNull(),
    cups: integer("cups").notNull().default(0),
  },
  (t) => [uniqueIndex("water_user_date_idx").on(t.userId, t.date)],
);

export type User = typeof usersTable.$inferSelect;
export type Exercise = typeof exercisesTable.$inferSelect;
export type PlanDay = typeof planDaysTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type SessionExercise = typeof sessionExercisesTable.$inferSelect;
export type SetRow = typeof setsTable.$inferSelect;
export type BodyweightEntry = typeof bodyweightTable.$inferSelect;
export type WaterRow = typeof waterTable.$inferSelect;
