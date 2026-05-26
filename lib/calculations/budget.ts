import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
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
  dayOfMonth: number;
  daysInMonth: number;
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

export function currentMonthRange(date = new Date()) {
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export function filterTransactionsByDate(transactions: Transaction[], start: string, end: string) {
  return transactions.filter((transaction) => transaction.date >= start && transaction.date <= end);
}

export function calculateBudgetSummary(profile: BudgetProfile, transactions: Transaction[], date = new Date()): BudgetSummary {
  const range = currentMonthRange(date);
  const monthTransactions = filterTransactionsByDate(transactions, range.start, range.end);
  const expenses = monthTransactions.filter((transaction) => transaction.type === "expense");
  const incomeTransactions = monthTransactions.filter((transaction) => transaction.type === "income");
  const spent = sum(expenses.map((transaction) => transaction.amount));
  const income = sum(incomeTransactions.map((transaction) => transaction.amount));
  const remaining = profile.monthlyBudget - spent;
  const dayOfMonth = date.getDate();
  const daysInMonth = endOfMonth(date).getDate();
  const spentRatio = profile.monthlyBudget > 0 ? spent / profile.monthlyBudget : 0;
  const timeRatio = dayOfMonth / daysInMonth;
  const paceRatio = timeRatio > 0 ? spentRatio / timeRatio : 0;
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);
  const safeDailySpend = Math.max(0, remaining / daysLeft);
  const averageDailySpend = average(groupDailySpend(expenses).map((day) => day.spent));
  const largestExpense =
    expenses.length > 0 ? [...expenses].sort((a, b) => b.amount - a.amount)[0] : null;
  const categorySpend = profile.categoryBudgets.map((budget) => ({
    category: budget.category,
    limit: budget.limit,
    spent: sum(expenses.filter((transaction) => transaction.category === budget.category).map((transaction) => transaction.amount)),
  }));
  const topCategory = categorySpend.length > 0 ? [...categorySpend].sort((a, b) => b.spent - a.spent)[0] : null;

  return {
    spent,
    income,
    net: income - spent,
    remaining,
    dayOfMonth,
    daysInMonth,
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

