"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Cloud, Download, RefreshCw, Save, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { getCloudSyncStatus, pullCloudSnapshotToLocal, pushLocalSnapshotToCloud } from "@/lib/db/cloud-sync.service";
import { AppSettings, FitnessGoal, UserProfile } from "@/lib/db/schema";
import { useAuthStore } from "@/lib/store/auth.store";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { accentOptions, activityLabels, dashboardWidgetOrder, financialDisclaimer, fitnessGoalLabels, healthDisclaimer } from "@/lib/utils/constants";
import { formatKcal, titleCase } from "@/lib/utils/formatting";

export function ProfileSettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const [draft, setDraft] = useState(profile);
  const targets = useMemo(() => calculateNutritionTargets(draft), [draft]);

  if (!draft) return <MissingProfile />;

  return (
    <>
      <PageHeader title="Profile Settings" description="Edit the body metrics and goals that power calorie and macro targets." />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <InputSetting label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            <InputSetting label="Age" type="number" value={draft.age} onNumber={(value) => setDraft({ ...draft, age: value })} />
            <SelectSetting label="Sex" value={draft.sex} options={["male", "female", "other"]} onChange={(value) => setDraft({ ...draft, sex: value as UserProfile["sex"] })} />
            <SelectSetting label="Units" value={draft.unitSystem} options={["metric", "imperial"]} onChange={(value) => setDraft({ ...draft, unitSystem: value as UserProfile["unitSystem"] })} />
            <InputSetting label="Height (cm)" type="number" value={draft.height} onNumber={(value) => setDraft({ ...draft, height: value })} />
            <InputSetting label="Weight (kg)" type="number" value={draft.weight} onNumber={(value) => setDraft({ ...draft, weight: value })} />
            <InputSetting label="Goal weight (kg)" type="number" value={draft.goalWeight} onNumber={(value) => setDraft({ ...draft, goalWeight: value })} />
            <InputSetting label="Weekly change (kg)" type="number" value={draft.weeklyWeightDelta} onNumber={(value) => setDraft({ ...draft, weeklyWeightDelta: value })} />
            <SelectSetting label="Activity" value={draft.activityLevel} options={Object.keys(activityLabels)} onChange={(value) => setDraft({ ...draft, activityLevel: value as UserProfile["activityLevel"] })} />
            <SelectSetting label="Fitness goal" value={draft.fitnessGoal} options={Object.keys(fitnessGoalLabels)} onChange={(value) => setDraft({ ...draft, fitnessGoal: value as FitnessGoal })} />
            <InputSetting label="Body fat %" type="number" value={draft.bodyFatPercent ?? ""} onNumber={(value) => setDraft({ ...draft, bodyFatPercent: value })} />
            <InputSetting label="Protein override (g)" type="number" value={draft.targetProteinOverride ?? ""} onNumber={(value) => setDraft({ ...draft, targetProteinOverride: value })} />
            <Button className="sm:col-span-2" onClick={() => saveProfile(draft)}>
              <Save className="h-4 w-4" /> Save Profile
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Calculated stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Stat label="BMR" value={formatKcal(targets?.bmr)} />
            <Stat label="TDEE" value={formatKcal(targets?.tdee)} />
            <Stat label="Calorie target" value={formatKcal(targets?.calories)} />
            <Stat label="Protein target" value={`${targets?.protein ?? "--"} g`} />
            <Stat label="BMI" value={targets ? `${targets.bmi.value} (${targets.bmi.category})` : "--"} />
            <Button variant="outline" className="w-full" onClick={() => setDraft({ ...draft })}>Recalculate</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function FitnessSettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const [goal, setGoal] = useState(profile?.fitnessGoal ?? "lose");
  const [weekly, setWeekly] = useState(profile?.weeklyWeightDelta ?? 0.4);
  const [proteinOverride, setProteinOverride] = useState(profile?.targetProteinOverride ?? 0);
  return (
    <>
      <PageHeader title="Fitness Settings" description="Fine-tune calorie and macro behavior." />
      <Card>
        <CardContent className="space-y-4 p-4">
          <SelectSetting label="Goal type" value={goal} options={["lose", "maintain", "gain", "recomp"]} onChange={(value) => setGoal(value as FitnessGoal)} />
          <InputSetting label="Weekly change target (kg)" type="number" value={weekly} onNumber={setWeekly} />
          <InputSetting label="Protein override (g/day)" type="number" value={proteinOverride} onNumber={setProteinOverride} />
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Medical disclaimer</p>
            <p className="mt-1">{healthDisclaimer}</p>
          </div>
          <Button
            onClick={() => {
              if (profile) void saveProfile({ ...profile, fitnessGoal: goal, weeklyWeightDelta: weekly, targetProteinOverride: proteinOverride || undefined });
            }}
          >
            Save Fitness Settings
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function BudgetSettingsPage() {
  const profile = useBudgetStore((state) => state.profile);
  const saveProfile = useBudgetStore((state) => state.saveProfile);
  const [income, setIncome] = useState(profile.monthlyIncome);
  const [budget, setBudget] = useState(profile.monthlyBudget);
  const [currency, setCurrency] = useState(profile.currency);
  return (
    <>
      <PageHeader title="Budget Settings" description="Set income, monthly budget, currency, and weekly calendar defaults." />
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <InputSetting label="Monthly income" type="number" value={income} onNumber={setIncome} />
          <InputSetting label="Monthly budget" type="number" value={budget} onNumber={setBudget} />
          <SelectSetting label="Currency" value={currency} options={["IQD", "USD", "EUR", "TRY"]} onChange={setCurrency} />
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground sm:col-span-2">
            <p className="font-medium text-foreground">Financial disclaimer</p>
            <p className="mt-1">{financialDisclaimer}</p>
          </div>
          <Button className="sm:col-span-2" onClick={() => saveProfile({ monthlyIncome: income, monthlyBudget: budget, currency, currencySymbol: currency })}>
            Save Budget Settings
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function AppearanceSettingsPage() {
  const settings = useProfileStore((state) => state.settings);
  const saveSettings = useProfileStore((state) => state.saveSettings);
  const [draft, setDraft] = useState(settings);
  const move = (index: number, direction: -1 | 1) => {
    const next = [...draft.dashboardWidgetOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDraft({ ...draft, dashboardWidgetOrder: next });
  };
  return (
    <>
      <PageHeader title="Appearance Settings" description="Theme, accent color, dashboard order, calorie display, and units." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-4">
            <SelectSetting label="Theme" value={draft.theme} options={["light", "dark", "system"]} onChange={(value) => setDraft({ ...draft, theme: value as AppSettings["theme"] })} />
            <SelectSetting label="Units" value={draft.unitSystem} options={["metric", "imperial"]} onChange={(value) => setDraft({ ...draft, unitSystem: value as AppSettings["unitSystem"] })} />
            <SelectSetting label="Calorie rounding" value={draft.calorieDisplayRounding} options={["none", "5", "10"]} onChange={(value) => setDraft({ ...draft, calorieDisplayRounding: value as AppSettings["calorieDisplayRounding"] })} />
            <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
              Show decimal calories
              <Switch checked={draft.showDecimalCalories} onCheckedChange={(checked) => setDraft({ ...draft, showDecimalCalories: checked })} />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium">Accent color</p>
              <div className="grid grid-cols-5 gap-2">
                {accentOptions.map((accent) => (
                  <button key={accent.value} type="button" onClick={() => setDraft({ ...draft, accentColor: accent.value })} className={`rounded-lg border p-2 text-xs ${draft.accentColor === accent.value ? "border-primary" : ""}`}>
                    {accent.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => saveSettings(draft)}>Save Appearance</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dashboard widget order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(draft.dashboardWidgetOrder.length ? draft.dashboardWidgetOrder : dashboardWidgetOrder).map((widget, index) => (
              <div key={widget} className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm font-medium">{titleCase(widget)}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function DataSettingsPage() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const exportAll = useProfileStore((state) => state.exportAll);
  const importAll = useProfileStore((state) => state.importAll);
  const clearAll = useProfileStore((state) => state.clearAll);
  const loadDemo = useProfileStore((state) => state.loadDemo);
  const profileLoad = useProfileStore((state) => state.load);
  const foodLoad = useFoodStore((state) => state.load);
  const budgetLoad = useBudgetStore((state) => state.load);
  const habitsLoad = useHabitsStore((state) => state.load);
  const [importPreview, setImportPreview] = useState<string>("No file selected");
  const [importData, setImportData] = useState<unknown>(null);
  const [confirm, setConfirm] = useState("");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);

  const refreshAll = async () => {
    await Promise.all([profileLoad(), foodLoad(), budgetLoad(), habitsLoad()]);
  };

  const refreshCloudStatus = useCallback(async () => {
    try {
      const status = await getCloudSyncStatus();
      setCloudUpdatedAt(status.updatedAt);
    } catch {
      setCloudUpdatedAt(null);
    }
  }, []);

  useEffect(() => {
    void refreshCloudStatus();
  }, [refreshCloudStatus]);

  const pushCloud = async () => {
    setCloudBusy(true);
    try {
      const pushed = await pushLocalSnapshotToCloud();
      if (pushed) toast.success("Cloud snapshot updated.");
      else toast.info("Sign in before syncing to Supabase.");
      await refreshCloudStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cloud sync failed.");
    } finally {
      setCloudBusy(false);
    }
  };

  const pullCloud = async () => {
    setCloudBusy(true);
    try {
      const pulled = await pullCloudSnapshotToLocal();
      if (pulled) {
        await refreshAll();
        toast.success("Cloud snapshot restored to this device.");
      } else {
        toast.info("No cloud snapshot exists for this account yet.");
      }
      await refreshCloudStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cloud restore failed.");
    } finally {
      setCloudBusy(false);
    }
  };

  const downloadJson = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitbudget-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTransactionsCsv = () => {
    const csv = useBudgetStore.getState().exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitbudget-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    setImportData(parsed);
    const keys = typeof parsed === "object" && parsed !== null ? Object.keys(parsed).join(", ") : "Invalid JSON";
    setImportPreview(`Ready to import: ${keys}`);
  };

  return (
    <>
      <PageHeader title="Data Settings" description="Export, import, load demo data, clear local storage, and review disclaimers." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={downloadJson}><Download className="h-4 w-4" /> Export as JSON</Button>
            <Button variant="outline" onClick={downloadTransactionsCsv}><Download className="h-4 w-4" /> Export CSV from ledger</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Import Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept="application/json" onChange={handleImportFile} />
            <p className="text-sm text-muted-foreground">{importPreview}</p>
            <div className="flex gap-2">
              <Button disabled={!importData} onClick={async () => { await importAll(importData, "merge"); await refreshAll(); }}>Merge</Button>
              <Button disabled={!importData} variant="outline" onClick={async () => { await importAll(importData, "replace"); await refreshAll(); }}>Replace</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Supabase Sync</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">{session?.user.email ?? "No account signed in"}</p>
                <p>{cloudUpdatedAt ? `Last cloud update: ${new Date(cloudUpdatedAt).toLocaleString()}` : "No cloud snapshot has been saved yet."}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={pushCloud} disabled={cloudBusy}>
                {cloudBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Push to Supabase
              </Button>
              <Button variant="outline" onClick={pullCloud} disabled={cloudBusy}>
                <RefreshCw className="h-4 w-4" />
                Pull from Supabase
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Demo Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Loads 14 days of realistic food, weight, spending, meals, and habit data.</p>
            <Button onClick={async () => { await loadDemo("replace"); await refreshAll(); router.push("/dashboard"); }}>Load Demo Data</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clear Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">This action is permanent and cannot be undone. Type DELETE to confirm.</p>
            <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <Button variant="destructive" disabled={confirm !== "DELETE"} onClick={async () => { await clearAll(); await refreshAll(); router.push("/onboarding"); }}>
              <Trash2 className="h-4 w-4" /> Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>App Info and Disclaimers</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><Badge>Version 1.0.0</Badge> Built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Dexie, Zustand, Recharts, and Framer Motion.</p>
          <p><span className="font-medium text-foreground">Health Disclaimer:</span> {healthDisclaimer}</p>
          <p><span className="font-medium text-foreground">Financial Disclaimer:</span> {financialDisclaimer}</p>
        </CardContent>
      </Card>
    </>
  );
}

function MissingProfile() {
  return <PageHeader title="Profile missing" description="Complete onboarding to unlock settings." />;
}

function InputSetting({
  label,
  value,
  type = "text",
  onChange,
  onNumber,
}: {
  label: string;
  value: string | number;
  type?: "text" | "number";
  onChange?: (value: string) => void;
  onNumber?: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => {
          if (type === "number") onNumber?.(Number(event.target.value));
          else onChange?.(event.target.value);
        }}
      />
    </label>
  );
}

function SelectSetting({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{titleCase(option)}</option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium data-number">{value}</span>
    </div>
  );
}
