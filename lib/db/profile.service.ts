"use client";

import { AppSettings, BudgetProfile, UserProfile } from "@/lib/db/schema";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { requireUserId, stripUserId, withUserId } from "@/lib/db/supabase.service";
import { defaultBudgetProfile, defaultSettings } from "@/lib/utils/constants";
import { createId, nowIso } from "@/lib/utils/formatting";

export async function getUserProfile() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("user_profiles").select("*").order("updatedAt", { ascending: false }).limit(1).maybeSingle();

  if (error) throw error;
  return data ? stripUserId(data) : null;
}

export async function upsertUserProfile(profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> & Partial<Pick<UserProfile, "id" | "createdAt">>) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const existing = profile.id ? await getProfileById(profile.id) : await getUserProfile();
  const timestamp = nowIso();
  const record: UserProfile = {
    ...profile,
    id: profile.id ?? existing?.id ?? createId(),
    createdAt: profile.createdAt ?? existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const { data, error } = await supabase.from("user_profiles").upsert(withUserId("user_profiles", userId, record), { onConflict: "user_id,id" }).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

async function getProfileById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? stripUserId(data) : null;
}

export async function getAppSettings() {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", "1").maybeSingle();

  if (error) throw error;
  if (data) return stripUserId(data);

  const record: AppSettings = { ...defaultSettings, updatedAt: nowIso() };
  const { data: inserted, error: insertError } = await supabase.from("app_settings").upsert(withUserId("app_settings", userId, record), { onConflict: "user_id,id" }).select("*").single();
  if (insertError) throw insertError;
  return stripUserId(inserted);
}

export async function updateAppSettings(input: Partial<Omit<AppSettings, "id" | "updatedAt">>) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const settings = await getAppSettings();
  const updated: AppSettings = { ...settings, ...input, id: "1", updatedAt: nowIso() };
  const { data, error } = await supabase.from("app_settings").upsert(withUserId("app_settings", userId, updated), { onConflict: "user_id,id" }).select("*").single();

  if (error) throw error;
  return stripUserId(data);
}

export async function getBudgetProfile() {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("budget_profiles").select("*").eq("id", "1").maybeSingle();

  if (error) throw error;
  if (data) return stripUserId(data);

  const record: BudgetProfile = { ...defaultBudgetProfile, updatedAt: nowIso() };
  const { data: inserted, error: insertError } = await supabase.from("budget_profiles").upsert(withUserId("budget_profiles", userId, record), { onConflict: "user_id,id" }).select("*").single();
  if (insertError) throw insertError;
  return stripUserId(inserted);
}

export async function updateBudgetProfile(input: Partial<Omit<BudgetProfile, "id" | "updatedAt">>) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const profile = await getBudgetProfile();
  const updated: BudgetProfile = { ...profile, ...input, id: "1", updatedAt: nowIso() };
  const { data, error } = await supabase.from("budget_profiles").upsert(withUserId("budget_profiles", userId, updated), { onConflict: "user_id,id" }).select("*").single();

  if (error) throw error;
  return stripUserId(data);
}

export async function completeOnboarding(profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "onboardingComplete">, budget: BudgetProfile, settings: AppSettings) {
  const record = await upsertUserProfile({ ...profile, onboardingComplete: true });
  await updateBudgetProfile({
    monthlyIncome: budget.monthlyIncome,
    monthlyBudget: budget.monthlyBudget,
    currency: budget.currency,
    currencySymbol: budget.currencySymbol,
    categoryBudgets: budget.categoryBudgets,
  });
  await updateAppSettings({
    theme: settings.theme,
    accentColor: settings.accentColor,
    unitSystem: settings.unitSystem,
    currency: settings.currency,
    firstDayOfWeek: settings.firstDayOfWeek,
    showDecimalCalories: settings.showDecimalCalories,
    calorieDisplayRounding: settings.calorieDisplayRounding,
    dashboardWidgetOrder: settings.dashboardWidgetOrder,
  });
  return record;
}
