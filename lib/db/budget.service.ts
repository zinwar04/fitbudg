import { BudgetProfile, CategoryBudget, Transaction } from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
import { getBudgetProfile, updateBudgetProfile } from "@/lib/db/profile.service";
import { createId, nowIso } from "@/lib/utils/formatting";

export interface BudgetData {
  profile: BudgetProfile;
  transactions: Transaction[];
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt" | "recurringId"> & {
  recurringId?: string;
};

export async function getBudgetData(): Promise<BudgetData> {
  const db = getDb();
  const [profile, transactions] = await Promise.all([getBudgetProfile(), db.transactions.orderBy("date").reverse().toArray()]);
  return { profile, transactions };
}

export async function addTransaction(input: TransactionInput) {
  const db = getDb();
  const timestamp = nowIso();
  const transaction: Transaction = {
    ...input,
    id: createId(),
    recurringId: input.isRecurring ? input.recurringId ?? createId() : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.transactions.put(transaction);
  return transaction;
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const db = getDb();
  const existing = await db.transactions.get(id);
  if (!existing) throw new Error("Transaction not found.");
  const updated: Transaction = {
    ...existing,
    ...input,
    recurringId: input.isRecurring ? existing.recurringId ?? createId() : input.isRecurring === false ? undefined : existing.recurringId,
    updatedAt: nowIso(),
  };
  await db.transactions.put(updated);
  return updated;
}

export async function deleteTransaction(id: string) {
  const db = getDb();
  const existing = await db.transactions.get(id);
  await db.transactions.delete(id);
  return existing ?? null;
}

export async function saveCategoryBudgets(categoryBudgets: CategoryBudget[]) {
  return updateBudgetProfile({ categoryBudgets });
}

export async function saveBudgetProfile(input: Partial<Omit<BudgetProfile, "id" | "updatedAt">>) {
  return updateBudgetProfile(input);
}

export function transactionsToCsv(transactions: Transaction[]) {
  const headers = ["id", "type", "amount", "currency", "category", "paymentMethod", "date", "title", "notes", "isRecurring", "createdAt", "updatedAt"];
  const rows = transactions.map((transaction) =>
    [
      transaction.id,
      transaction.type,
      transaction.amount,
      transaction.currency,
      transaction.category,
      transaction.paymentMethod,
      transaction.date,
      transaction.title,
      transaction.notes ?? "",
      transaction.isRecurring,
      transaction.createdAt,
      transaction.updatedAt,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

