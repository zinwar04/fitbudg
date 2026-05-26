"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import { Habit, HabitEntry } from "@/lib/db/schema";
import { scheduleCloudPush } from "@/lib/db/cloud-sync.service";
import {
  HabitInput,
  addHabit,
  adjustQuantitativeHabit,
  deleteHabit,
  getHabitsData,
  toggleBooleanHabit,
  updateHabit,
} from "@/lib/db/habits.service";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface HabitsState {
  habits: Habit[];
  entries: HabitEntry[];
  hydrated: boolean;
  loading: boolean;
  load: () => Promise<void>;
  addHabit: (input: HabitInput) => Promise<void>;
  updateHabit: (id: string, input: Partial<HabitInput>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleBoolean: (habitId: string, date: string) => Promise<void>;
  adjustQuantitative: (habit: Habit, date: string, delta: number) => Promise<void>;
}

export const useHabitsStore = create<HabitsState>()(
  immer((set, get) => ({
    habits: [],
    entries: [],
    hydrated: false,
    loading: false,
    load: async () => {
      set((state) => {
        state.loading = true;
      });
      try {
        const data = await getHabitsData();
        set((state) => {
          state.habits = data.habits;
          state.entries = data.entries;
          state.hydrated = true;
          state.loading = false;
        });
      } catch (error) {
        toast.error(messageFromError(error));
        set((state) => {
          state.loading = false;
          state.hydrated = true;
        });
      }
    },
    addHabit: async (input) => {
      try {
        await addHabit(input);
        await get().load();
        scheduleCloudPush();
        toast.success("Habit added.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    updateHabit: async (id, input) => {
      try {
        await updateHabit(id, input);
        await get().load();
        scheduleCloudPush();
        toast.success("Habit updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteHabit: async (id) => {
      try {
        await deleteHabit(id);
        await get().load();
        scheduleCloudPush();
        toast.success("Habit deleted.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    toggleBoolean: async (habitId, date) => {
      try {
        await toggleBooleanHabit(habitId, date);
        await get().load();
        scheduleCloudPush();
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    adjustQuantitative: async (habit, date, delta) => {
      try {
        await adjustQuantitativeHabit(habit, date, delta);
        await get().load();
        scheduleCloudPush();
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
  })),
);
