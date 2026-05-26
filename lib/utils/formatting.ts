import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function localDateKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function formatDateKey(dateKey: string, pattern = "MMM d, yyyy") {
  const parsed = parseISO(`${dateKey}T00:00:00`);
  return isValid(parsed) ? format(parsed, pattern) : dateKey;
}

export function formatRelativeDate(dateKey: string) {
  const parsed = parseISO(`${dateKey}T00:00:00`);
  return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : dateKey;
}

export function formatCurrency(amount: number, currency = "IQD", symbol = currency) {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${symbol} ${rounded.toLocaleString("en-US")}`;
}

export function formatKcal(value: number | undefined | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "--";
  return `${Math.round(value).toLocaleString("en-US")} kcal`;
}

export function formatNumber(value: number | undefined | null, digits = 0) {
  if (value === undefined || value === null || !Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatWeight(value: number | undefined | null, unit = "kg") {
  if (value === undefined || value === null || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)} ${unit}`;
}

export function formatOrdinalDay(value: number) {
  if (!Number.isFinite(value)) return "--";
  const day = Math.round(value);
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  const mod10 = day % 10;
  if (mod10 === 1) return `${day}st`;
  if (mod10 === 2) return `${day}nd`;
  if (mod10 === 3) return `${day}rd`;
  return `${day}th`;
}

export function titleCase(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function average(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? sum(clean) / clean.length : 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
