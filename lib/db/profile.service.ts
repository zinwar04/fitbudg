import { AppSettings, BudgetProfile, UserProfile } from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
import { defaultBudgetProfile, defaultSettings } from "@/lib/utils/constants";
import { createId, nowIso } from "@/lib/utils/formatting";

export async function getUserProfile() {
  const db = getDb();
  return (await db.userProfiles.toCollection().first()) ?? null;
}

export async function upsertUserProfile(profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> & Partial<Pick<UserProfile, "id" | "createdAt">>) {
  const db = getDb();
  const existing = profile.id ? await db.userProfiles.get(profile.id) : await getUserProfile();
  const timestamp = nowIso();
  const record: UserProfile = {
    ...profile,
    id: profile.id ?? existing?.id ?? createId(),
    createdAt: profile.createdAt ?? existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await db.userProfiles.put(record);
  return record;
}

export async function getAppSettings() {
  const db = getDb();
  const settings = await db.appSettings.get("1");
  if (settings) return settings;
  const record: AppSettings = { ...defaultSettings, updatedAt: nowIso() };
  await db.appSettings.put(record);
  return record;
}

export async function updateAppSettings(input: Partial<Omit<AppSettings, "id" | "updatedAt">>) {
  const db = getDb();
  const settings = await getAppSettings();
  const updated: AppSettings = { ...settings, ...input, id: "1", updatedAt: nowIso() };
  await db.appSettings.put(updated);
  return updated;
}

export async function getBudgetProfile() {
  const db = getDb();
  const profile = await db.budgetProfiles.get("1");
  if (profile) return profile;
  const record: BudgetProfile = { ...defaultBudgetProfile, updatedAt: nowIso() };
  await db.budgetProfiles.put(record);
  return record;
}

export async function updateBudgetProfile(input: Partial<Omit<BudgetProfile, "id" | "updatedAt">>) {
  const db = getDb();
  const profile = await getBudgetProfile();
  const updated: BudgetProfile = { ...profile, ...input, id: "1", updatedAt: nowIso() };
  await db.budgetProfiles.put(updated);
  return updated;
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

