"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import { DailyCalorieLog, FoodEntry, FoodLibraryItem, MealTemplate, MealType, WeightEntry } from "@/lib/db/schema";
import { importExternalFood as importExternalFoodToLibrary } from "@/lib/db/external-food.service";
import {
  FoodEntryInput,
  FoodLibraryInput,
  MealTemplateInput,
  WeightInput,
  addFoodEntry,
  addFoodLibraryItem,
  addFoodLibraryItems,
  addMealTemplate,
  addMealTemplates,
  addMealTemplateToLog,
  addWeightEntry,
  deleteFoodEntry,
  deleteFoodLibraryItem,
  deleteMealTemplate,
  deleteWeightEntry,
  duplicateFoodEntry,
  getFoodData,
  moveFoodEntry,
  toggleFoodFavorite,
  updateFoodEntry,
  updateFoodLibraryItem,
  updateMealTemplate,
  updateWeightEntry,
} from "@/lib/db/food.service";
import { NormalizedExternalFood } from "@/lib/food/external";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface FoodState {
  logs: DailyCalorieLog[];
  entries: FoodEntry[];
  library: FoodLibraryItem[];
  mealTemplates: MealTemplate[];
  weights: WeightEntry[];
  hydrated: boolean;
  loading: boolean;
  load: () => Promise<void>;
  addEntry: (input: FoodEntryInput) => Promise<FoodEntry | null>;
  updateEntry: (id: string, input: Partial<FoodEntryInput>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  duplicateEntry: (id: string, date?: string) => Promise<void>;
  moveEntry: (id: string, mealType: MealType) => Promise<void>;
  addFood: (input: FoodLibraryInput) => Promise<FoodLibraryItem | null>;
  importExternalFood: (food: NormalizedExternalFood) => Promise<{ item: FoodLibraryItem; created: boolean } | null>;
  importFoods: (inputs: FoodLibraryInput[]) => Promise<void>;
  updateFood: (id: string, input: Partial<FoodLibraryInput>) => Promise<void>;
  deleteFood: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addTemplate: (input: MealTemplateInput) => Promise<void>;
  importTemplates: (inputs: MealTemplateInput[]) => Promise<void>;
  updateTemplate: (id: string, input: Partial<MealTemplateInput>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addTemplateToLog: (id: string, date: string, mealType: MealType) => Promise<void>;
  addWeight: (input: WeightInput) => Promise<void>;
  updateWeight: (id: string, input: Partial<WeightInput>) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
}

export const useFoodStore = create<FoodState>()(
  immer((set, get) => ({
    logs: [],
    entries: [],
    library: [],
    mealTemplates: [],
    weights: [],
    hydrated: false,
    loading: false,
    load: async () => {
      set((state) => {
        state.loading = true;
      });
      try {
        const data = await getFoodData();
        set((state) => {
          state.logs = data.logs;
          state.entries = data.entries;
          state.library = data.library;
          state.mealTemplates = data.mealTemplates;
          state.weights = data.weights;
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
    addEntry: async (input) => {
      try {
        const entry = await addFoodEntry(input);
        await get().load();
        toast.success("Food logged.");
        return entry;
      } catch (error) {
        toast.error(messageFromError(error));
        return null;
      }
    },
    updateEntry: async (id, input) => {
      try {
        await updateFoodEntry(id, input);
        await get().load();
        toast.success("Food entry updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteEntry: async (id) => {
      try {
        const deleted = await deleteFoodEntry(id);
        await get().load();
        toast.success("Food entry deleted.", {
          action: deleted
            ? {
                label: "Undo",
                onClick: () => {
                  void get().addEntry({
                    date: deleted.date,
                    foodLibraryId: deleted.foodLibraryId,
                    mealTemplateId: deleted.mealTemplateId,
                    name: deleted.name,
                    calories: deleted.calories,
                    servingSize: deleted.servingSize,
                    servingUnit: deleted.servingUnit,
                    quantity: deleted.quantity,
                    protein: deleted.protein,
                    carbs: deleted.carbs,
                    fat: deleted.fat,
                    fiber: deleted.fiber,
                    mealType: deleted.mealType,
                    notes: deleted.notes,
                  });
                },
              }
            : undefined,
        });
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    duplicateEntry: async (id, date) => {
      try {
        await duplicateFoodEntry(id, date);
        await get().load();
        toast.success("Food entry duplicated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    moveEntry: async (id, mealType) => {
      try {
        await moveFoodEntry(id, mealType);
        await get().load();
        toast.success("Food moved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    addFood: async (input) => {
      try {
        const item = await addFoodLibraryItem(input);
        await get().load();
        toast.success("Food saved.");
        return item;
      } catch (error) {
        toast.error(messageFromError(error));
        return null;
      }
    },
    importExternalFood: async (food) => {
      try {
        const result = await importExternalFoodToLibrary(food);
        await get().load();
        return result;
      } catch (error) {
        toast.error(messageFromError(error));
        return null;
      }
    },
    importFoods: async (inputs) => {
      try {
        await addFoodLibraryItems(inputs);
        await get().load();
        toast.success(`${inputs.length} foods imported.`);
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    updateFood: async (id, input) => {
      try {
        await updateFoodLibraryItem(id, input);
        await get().load();
        toast.success("Food updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteFood: async (id) => {
      try {
        await deleteFoodLibraryItem(id);
        await get().load();
        toast.success("Food deleted.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    toggleFavorite: async (id) => {
      try {
        await toggleFoodFavorite(id);
        await get().load();
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    addTemplate: async (input) => {
      try {
        await addMealTemplate(input);
        await get().load();
        toast.success("Meal template saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    importTemplates: async (inputs) => {
      try {
        await addMealTemplates(inputs);
        await get().load();
        toast.success(`${inputs.length} meal templates imported.`);
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    updateTemplate: async (id, input) => {
      try {
        await updateMealTemplate(id, input);
        await get().load();
        toast.success("Meal template updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteTemplate: async (id) => {
      try {
        await deleteMealTemplate(id);
        await get().load();
        toast.success("Meal template deleted.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    addTemplateToLog: async (id, date, mealType) => {
      try {
        await addMealTemplateToLog(id, date, mealType);
        await get().load();
        toast.success("Meal added to log.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    addWeight: async (input) => {
      try {
        await addWeightEntry(input);
        await get().load();
        toast.success("Weight logged.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    updateWeight: async (id, input) => {
      try {
        await updateWeightEntry(id, input);
        await get().load();
        toast.success("Weight updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteWeight: async (id) => {
      try {
        await deleteWeightEntry(id);
        await get().load();
        toast.success("Weight entry deleted.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
  })),
);
