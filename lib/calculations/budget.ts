import { addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO, subDays } from "date-fns";
import { BudgetProfile, Transaction, TransactionCategory } from "@/lib/db/schema";
import { average, sum } from "@/lib/utils/formatting";

export interface CategorySpend {
  category: TransactionCategory;
  spent: number;
  limit: number;
}

export interface BudgetSummary {
  spent: number;
  income: number;
  net: number;
  remaining: number;
  cycleStart: string;
  cycleEnd: string;
  dayInCycle: number;
  daysInCycle: number;
  daysLeftInCycle: number;
  paceRatio: number;
  pacing: "onTrack" | "spendingFast" | "overBudget";
  safeToSpendToday: number;
  safeDailySpend: number;
  averageDailySpend: number;
  largestExpense: Transaction | null;
  topCategory: CategorySpend | null;
  categorySpend: CategorySpend[];
  dailySpend: { date: string; spent: number }[];
}

export interface BudgetCycleRange {
  start: string;
  end: string;
  startDate: Date;
  endDate: Date;
}

export function normalizeBudgetCycleStartDay(day: number | undefined) {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.round(day as number)));
}

function cycleAnchor(year: number, monthIndex: number, desiredDay: number) {
  return new Date(year, monthIndex, Math.min(desiredDay, getDaysInMonth(new Date(year, monthIndex, 1))));
}

export function currentBudgetCycleRange(profile: BudgetProfile, date = new Date()): BudgetCycleRange {
  const desiredDay = normalizeBudgetCycleStartDay(profile.monthStartDay);
  const thisMonthStart = cycleAnchor(date.getFullYear(), date.getMonth(), desiredDay);
  const startDate =
    date.getDate() >= thisMonthStart.getDate()
      ? thisMonthStart
      : cycleAnchor(date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear(), date.getMonth() === 0 ? 11 : date.getMonth() - 1, desiredDay);
  const nextCycleMonth = addMonths(startDate, 1);
  const nextStartDate = cycleAnchor(nextCycleMonth.getFullYear(), nextCycleMonth.getMonth(), desiredDay);
  const endDate = subDays(nextStartDate, 1);
  return {
    start: format(startDate, "yyyy-MM-dd"),
    end: format(endDate, "yyyy-MM-dd"),
    startDate,
    endDate,
  };
}

export function previousBudgetCycleRange(profile: BudgetProfile, date = new Date()): BudgetCycleRange {
  return currentBudgetCycleRange(profile, subDays(currentBudgetCycleRange(profile, date).startDate, 1));
}

export function filterTransactionsByDate(transactions: Transaction[], start: string, end: string) {
  return transactions.filter((transaction) => transaction.date >= start && transaction.date <= end);
}

export function calculateBudgetSummary(profile: BudgetProfile, transactions: Transaction[], date = new Date()): BudgetSummary {
  const range = currentBudgetCycleRange(profile, date);
  const cycleTransactions = filterTransactionsByDate(transactions, range.start, range.end);
  const expenses = cycleTransactions.filter((transaction) => transaction.type === "expense");
  const incomeTransactions = cycleTransactions.filter((transaction) => transaction.type === "income");
  const spent = sum(expenses.map((transaction) => transaction.amount));
  const income = sum(incomeTransactions.map((transaction) => transaction.amount));
  const remaining = profile.monthlyBudget - spent;
  const dayInCycle = differenceInCalendarDays(date, range.startDate) + 1;
  const daysInCycle = differenceInCalendarDays(range.endDate, range.startDate) + 1;
  const daysLeftInCycle = Math.max(0, differenceInCalendarDays(range.endDate, date));
  const daysRemainingIncludingToday = Math.max(1, daysInCycle - dayInCycle + 1);
  const spentRatio = profile.monthlyBudget > 0 ? spent / profile.monthlyBudget : 0;
  const timeRatio = dayInCycle / daysInCycle;
  const paceRatio = timeRatio > 0 ? spentRatio / timeRatio : 0;
  const safeDailySpend = Math.max(0, remaining / daysRemainingIncludingToday);
  const averageDailySpend = average(groupDailySpend(expenses).map((day) => day.spent));
  const largestExpense =
    expenses.length > 0 ? [...expenses].sort((a, b) => b.amount - a.amount)[0] : null;
  const knownCategories = new Set(profile.categoryBudgets.map((budget) => budget.category));
  const missingCategorySpend = expenses
    .filter((transaction) => !knownCategories.has(transaction.category))
    .reduce<Record<string, number>>((record, transaction) => {
      record[transaction.category] = (record[transaction.category] ?? 0) + transaction.amount;
      return record;
    }, {});
  const categorySpend = [
    ...profile.categoryBudgets.map((budget) => ({
      category: budget.category,
      limit: budget.limit,
      spent: sum(expenses.filter((transaction) => transaction.category === budget.category).map((transaction) => transaction.amount)),
    })),
    ...Object.entries(missingCategorySpend).map(([category, spent]) => ({
      category,
      limit: 0,
      spent,
    })),
  ];
  const topCategory = categorySpend.length > 0 ? [...categorySpend].sort((a, b) => b.spent - a.spent)[0] : null;

  return {
    spent,
    income,
    net: income - spent,
    remaining,
    cycleStart: range.start,
    cycleEnd: range.end,
    dayInCycle,
    daysInCycle,
    daysLeftInCycle,
    paceRatio,
    pacing: spent > profile.monthlyBudget ? "overBudget" : paceRatio > 1.25 ? "overBudget" : paceRatio > 1.1 ? "spendingFast" : "onTrack",
    safeToSpendToday: safeDailySpend,
    safeDailySpend,
    averageDailySpend,
    largestExpense,
    topCategory,
    categorySpend,
    dailySpend: groupDailySpend(expenses),
  };
}

export function groupDailySpend(transactions: Transaction[]) {
  const grouped = new Map<string, number>();
  transactions.forEach((transaction) => {
    grouped.set(transaction.date, (grouped.get(transaction.date) ?? 0) + transaction.amount);
  });
  return Array.from(grouped.entries())
    .map(([date, spent]) => ({ date, spent }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function compareWeekSpend(transactions: Transaction[], reference = new Date()) {
  const currentEnd = format(reference, "yyyy-MM-dd");
  const currentStart = format(new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 6), "yyyy-MM-dd");
  const lastEndDate = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 7);
  const lastStartDate = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 13);
  const lastStart = format(lastStartDate, "yyyy-MM-dd");
  const lastEnd = format(lastEndDate, "yyyy-MM-dd");
  const current = sum(
    filterTransactionsByDate(transactions, currentStart, currentEnd)
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount),
  );
  const previous = sum(
    filterTransactionsByDate(transactions, lastStart, lastEnd)
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount),
  );
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return { current, previous, percentChange };
}

export function monthKeyFromDateKey(dateKey: string) {
  const parsed = parseISO(`${dateKey}T00:00:00`);
  return format(parsed, "yyyy-MM");
}
