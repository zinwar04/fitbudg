"use client";

import { useProfileStore } from "@/lib/store/profile.store";
import { accentColorMap } from "@/lib/utils/constants";

export function useChartTheme() {
  const settings = useProfileStore((state) => state.settings);
  const isDark = settings.theme === "dark" || (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const styles = typeof window !== "undefined" ? window.getComputedStyle(document.documentElement) : null;

  return {
    primary: styles?.getPropertyValue("--primary").trim() || accentColorMap[settings.accentColor],
    muted: isDark ? "#6d7a75" : "#8a9691",
    background: styles?.getPropertyValue("--popover").trim() || (isDark ? "#151b19" : "#ffffff"),
    goal: styles?.getPropertyValue("--border").trim() || (isDark ? "#293530" : "#dce5df"),
    positive: styles?.getPropertyValue("--success").trim() || "#10a37f",
    warning: styles?.getPropertyValue("--warning").trim() || "#d98d18",
    danger: styles?.getPropertyValue("--danger").trim() || "#d94848",
  };
}
