"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import { AppSettings, BudgetProfile, UserProfile } from "@/lib/db/schema";
import {
  completeOnboarding,
  getAppSettings,
  getBudgetProfile,
  getUserProfile,
  updateAppSettings,
  updateBudgetProfile,
  upsertUserProfile,
} from "@/lib/db/profile.service";
import { clearAllData, exportJson, importJson, parseImportJson } from "@/lib/db/data.service";
import { AppExport } from "@/lib/db/schema";
import { loadDemoData } from "@/lib/demo/seed";
import { defaultBudgetProfile, defaultSettings } from "@/lib/utils/constants";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface ProfileState {
  profile: UserProfile | null;
  settings: AppSettings;
  budgetProfile: BudgetProfile;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  saveProfile: (profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> & Partial<Pick<UserProfile, "id" | "createdAt">>) => Promise<void>;
  saveSettings: (settings: Partial<Omit<AppSettings, "id" | "updatedAt">>) => Promise<void>;
  saveBudgetProfile: (budget: Partial<Omit<BudgetProfile, "id" | "updatedAt">>) => Promise<void>;
  finishOnboarding: (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "onboardingComplete">,
    budget: BudgetProfile,
    settings: AppSettings,
  ) => Promise<void>;
  loadDemo: (mode?: "merge" | "replace") => Promise<void>;
  exportAll: () => Promise<AppExport>;
  importAll: (input: unknown, mode: "merge" | "replace") => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  immer((set) => ({
    profile: null,
    settings: defaultSettings,
    budgetProfile: defaultBudgetProfile,
    hydrated: false,
    loading: false,
    error: null,
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const [profile, settings, budgetProfile] = await Promise.all([getUserProfile(), getAppSettings(), getBudgetProfile()]);
        set((state) => {
          state.profile = profile;
          state.settings = settings;
          state.budgetProfile = budgetProfile;
          state.hydrated = true;
          state.loading = false;
        });
      } catch (error) {
        const message = messageFromError(error);
        toast.error(message);
        set((state) => {
          state.error = message;
          state.loading = false;
          state.hydrated = true;
        });
      }
    },
    saveProfile: async (profile) => {
      try {
        const saved = await upsertUserProfile(profile);
        set((state) => {
          state.profile = saved;
        });
        toast.success("Profile saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    saveSettings: async (settings) => {
      try {
        const saved = await updateAppSettings(settings);
        set((state) => {
          state.settings = saved;
        });
        toast.success("Settings saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    saveBudgetProfile: async (budget) => {
      try {
        const saved = await updateBudgetProfile(budget);
        set((state) => {
          state.budgetProfile = saved;
        });
        toast.success("Budget settings saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    finishOnboarding: async (profile, budget, settings) => {
      try {
        const saved = await completeOnboarding(profile, budget, settings);
        set((state) => {
          state.profile = saved;
          state.budgetProfile = budget;
          state.settings = settings;
          state.hydrated = true;
        });
        toast.success("FitBudget is ready.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    loadDemo: async (mode = "replace") => {
      try {
        await loadDemoData(mode);
        const [profile, settings, budgetProfile] = await Promise.all([getUserProfile(), getAppSettings(), getBudgetProfile()]);
        set((state) => {
          state.profile = profile;
          state.settings = settings;
          state.budgetProfile = budgetProfile;
          state.hydrated = true;
        });
        toast.success("Demo data loaded.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    exportAll: async () => {
      try {
        return await exportJson();
      } catch (error) {
        toast.error(messageFromError(error));
        throw error;
      }
    },
    importAll: async (input, mode) => {
      try {
        const data = parseImportJson(input);
        await importJson(data, mode);
        const [profile, settings, budgetProfile] = await Promise.all([getUserProfile(), getAppSettings(), getBudgetProfile()]);
        set((state) => {
          state.profile = profile;
          state.settings = settings;
          state.budgetProfile = budgetProfile;
        });
        toast.success("Data imported.");
      } catch (error) {
        toast.error(messageFromError(error));
        throw error;
      }
    },
    clearAll: async () => {
      try {
        await clearAllData();
        set((state) => {
          state.profile = null;
          state.settings = defaultSettings;
          state.budgetProfile = defaultBudgetProfile;
          state.hydrated = true;
        });
        toast.success("All data cleared.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
  })),
);
