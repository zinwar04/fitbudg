"use client";

import { useProfileStore } from "@/lib/store/profile.store";
import { accentColorMap } from "@/lib/utils/constants";

export function useChartTheme() {
  const settings = useProfileStore((state) => state.settings);
  const isDark = settings.theme === "dark" || (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return {
    primary: accentColorMap[settings.accentColor],
    muted: isDark ? "#52525b" : "#a1a1aa",
    background: isDark ? "#18181b" : "#ffffff",
    goal: isDark ? "#3f3f46" : "#e4e4e7",
    positive: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };
}

