import { Habit, HabitEntry } from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
import { createId, localDateKey, nowIso } from "@/lib/utils/formatting";

export interface HabitsData {
  habits: Habit[];
  entries: HabitEntry[];
}

export type HabitInput = Omit<Habit, "id" | "streak" | "createdAt">;

export async function getHabitsData(): Promise<HabitsData> {
  const db = getDb();
  const [habits, entries] = await Promise.all([db.habits.orderBy("createdAt").toArray(), db.habitEntries.orderBy("date").toArray()]);
  return { habits, entries };
}

export async function addHabit(input: HabitInput) {
  const db = getDb();
  const habit: Habit = {
    ...input,
    id: createId(),
    streak: 0,
    createdAt: nowIso(),
  };
  await db.habits.put(habit);
  return habit;
}

export async function updateHabit(id: string, input: Partial<HabitInput>) {
  const db = getDb();
  const existing = await db.habits.get(id);
  if (!existing) throw new Error("Habit not found.");
  const updated: Habit = { ...existing, ...input };
  await db.habits.put(updated);
  return updated;
}

export async function deleteHabit(id: string) {
  const db = getDb();
  await db.transaction("rw", db.habits, db.habitEntries, async () => {
    await db.habits.delete(id);
    await db.habitEntries.where("habitId").equals(id).delete();
  });
}

async function recalculateHabitStreak(habitId: string) {
  const db = getDb();
  const entries = await db.habitEntries.where("habitId").equals(habitId).toArray();
  const completedDates = new Set(entries.filter((entry) => entry.completed).map((entry) => entry.date));
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 365; index += 1) {
    const date = localDateKey(cursor);
    if (completedDates.has(date)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  const habit = await db.habits.get(habitId);
  if (habit) {
    await db.habits.put({ ...habit, streak });
  }
  return streak;
}

export async function setHabitEntry(habitId: string, date: string, value: number | undefined, completed: boolean, notes?: string) {
  const db = getDb();
  const existing = await db.habitEntries.where("[habitId+date]").equals([habitId, date]).first();
  const entry: HabitEntry = {
    id: existing?.id ?? createId(),
    habitId,
    date,
    value,
    completed,
    notes,
    createdAt: existing?.createdAt ?? nowIso(),
  };
  await db.habitEntries.put(entry);
  await recalculateHabitStreak(habitId);
  return entry;
}

export async function toggleBooleanHabit(habitId: string, date: string) {
  const db = getDb();
  const existing = await db.habitEntries.where("[habitId+date]").equals([habitId, date]).first();
  return setHabitEntry(habitId, date, undefined, !(existing?.completed ?? false), existing?.notes);
}

export async function adjustQuantitativeHabit(habit: Habit, date: string, delta: number) {
  const db = getDb();
  const existing = await db.habitEntries.where("[habitId+date]").equals([habit.id, date]).first();
  const nextValue = Math.max(0, (existing?.value ?? 0) + delta);
  const completed = habit.targetValue ? nextValue >= habit.targetValue : nextValue > 0;
  return setHabitEntry(habit.id, date, nextValue, completed, existing?.notes);
}

