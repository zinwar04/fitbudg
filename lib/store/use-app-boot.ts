"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { pullCloudSnapshotToLocal } from "@/lib/db/cloud-sync.service";
import { useAuthStore } from "@/lib/store/auth.store";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { accentColorMap } from "@/lib/utils/constants";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function useAppBoot() {
  const loadAuth = useAuthStore((state) => state.load);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);
  const cloudHydrated = useAuthStore((state) => state.cloudHydrated);
  const markCloudHydrated = useAuthStore((state) => state.markCloudHydrated);
  const loadProfile = useProfileStore((state) => state.load);
  const loadFood = useFoodStore((state) => state.load);
  const loadBudget = useBudgetStore((state) => state.load);
  const loadHabits = useHabitsStore((state) => state.load);
  const settings = useProfileStore((state) => state.settings);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (!authHydrated || !session || cloudHydrated) return;

    let cancelled = false;

    async function hydrateAccount() {
      try {
        await pullCloudSnapshotToLocal();
      } catch (error) {
        toast.error(`Cloud sync failed: ${messageFromError(error)}`);
      }

      if (cancelled) return;
      await Promise.all([loadProfile(), loadFood(), loadBudget(), loadHabits()]);
      if (!cancelled) markCloudHydrated(true);
    }

    void hydrateAccount();

    return () => {
      cancelled = true;
    };
  }, [authHydrated, cloudHydrated, loadBudget, loadFood, loadHabits, loadProfile, markCloudHydrated, session]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = settings.theme === "dark" || (settings.theme === "system" && systemDark);
    root.classList.toggle("dark", shouldUseDark);
    root.style.setProperty("--primary", accentColorMap[settings.accentColor]);
  }, [settings.accentColor, settings.theme]);
}
