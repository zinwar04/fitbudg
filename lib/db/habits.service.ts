"use client";

import { Habit, HabitEntry } from "@/lib/db/schema";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { requireUserId, stripUserId, stripUserIdArray, withUserId } from "@/lib/db/supabase.service";
import { createId, localDateKey, nowIso } from "@/lib/utils/formatting";

export interface HabitsData {
  habits: Habit[];
  entries: HabitEntry[];
}

export type HabitInput = Omit<Habit, "id" | "streak" | "createdAt">;

export async function getHabitsData(): Promise<HabitsData> {
  const supabase = getSupabaseClient();
  const [habits, entries] = await Promise.all([
    supabase.from("habits").select("*").order("createdAt", { ascending: true }),
    supabase.from("habit_entries").select("*").order("date", { ascending: true }),
  ]);

  if (habits.error) throw habits.error;
  if (entries.error) throw entries.error;

  return { habits: stripUserIdArray(habits.data ?? []), entries: stripUserIdArray(entries.data ?? []) };
}

export async function addHabit(input: HabitInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const habit: Habit = {
    ...input,
    id: createId(),
    streak: 0,
    createdAt: nowIso(),
  };
  const { data, error } = await supabase.from("habits").insert(withUserId("habits", userId, habit)).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function updateHabit(id: string, input: Partial<HabitInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("habits").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Habit not found.");

  const updated: Habit = { ...stripUserId(existing), ...input };
  const { data, error } = await supabase.from("habits").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteHabit(id: string) {
  const supabase = getSupabaseClient();
  const { error: entriesError } = await supabase.from("habit_entries").delete().eq("habitId", id);
  if (entriesError) throw entriesError;
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) throw error;
}

async function recalculateHabitStreak(habitId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("habit_entries").select("*").eq("habitId", habitId);
  if (error) throw error;

  const entries = stripUserIdArray(data ?? []);
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
  const { error: updateError } = await supabase.from("habits").update({ streak }).eq("id", habitId);
  if (updateError) throw updateError;
  return streak;
}

export async function setHabitEntry(habitId: string, date: string, value: number | undefined, completed: boolean, notes?: string) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { data: existing, error } = await supabase.from("habit_entries").select("*").eq("habitId", habitId).eq("date", date).maybeSingle();
  if (error) throw error;

  const entry: HabitEntry = {
    id: existing?.id ?? createId(),
    habitId,
    date,
    value,
    completed,
    notes,
    createdAt: existing?.createdAt ?? nowIso(),
  };
  const { data, error: upsertError } = await supabase
    .from("habit_entries")
    .upsert(withUserId("habit_entries", userId, entry), { onConflict: "user_id,habitId,date" })
    .select("*")
    .single();

  if (upsertError) throw upsertError;
  await recalculateHabitStreak(habitId);
  return stripUserId(data);
}

export async function toggleBooleanHabit(habitId: string, date: string) {
  const supabase = getSupabaseClient();
  const { data: existing, error } = await supabase.from("habit_entries").select("*").eq("habitId", habitId).eq("date", date).maybeSingle();
  if (error) throw error;
  return setHabitEntry(habitId, date, undefined, !(existing?.completed ?? false), existing?.notes);
}

export async function adjustQuantitativeHabit(habit: Habit, date: string, delta: number) {
  const supabase = getSupabaseClient();
  const { data: existing, error } = await supabase.from("habit_entries").select("*").eq("habitId", habit.id).eq("date", date).maybeSingle();
  if (error) throw error;
  const nextValue = Math.max(0, (existing?.value ?? 0) + delta);
  const completed = habit.targetValue ? nextValue >= habit.targetValue : nextValue > 0;
  return setHabitEntry(habit.id, date, nextValue, completed, existing?.notes);
}
