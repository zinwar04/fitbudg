"use client";

import { BudgetProfile, CategoryBudget, Transaction } from "@/lib/db/schema";
import { getBudgetProfile, updateBudgetProfile } from "@/lib/db/profile.service";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { requireUserId, stripUserId, stripUserIdArray, withUserId } from "@/lib/db/supabase.service";
import { createId, nowIso } from "@/lib/utils/formatting";

export interface BudgetData {
  profile: BudgetProfile;
  transactions: Transaction[];
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt" | "recurringId"> & {
  recurringId?: string;
};

export async function getBudgetData(): Promise<BudgetData> {
  const supabase = getSupabaseClient();
  const [profile, transactions] = await Promise.all([
    getBudgetProfile(),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
  ]);

  if (transactions.error) throw transactions.error;
  return { profile, transactions: stripUserIdArray(transactions.data ?? []) };
}

export async function addTransaction(input: TransactionInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const transaction: Transaction = {
    ...input,
    id: createId(),
    recurringId: input.isRecurring ? input.recurringId ?? createId() : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const { data, error } = await supabase.from("transactions").insert(withUserId("transactions", userId, transaction)).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Transaction not found.");

  const current = stripUserId(existing);
  const updated: Transaction = {
    ...current,
    ...input,
    recurringId: input.isRecurring ? current.recurringId ?? createId() : input.isRecurring === false ? undefined : current.recurringId,
    updatedAt: nowIso(),
  };
  const { data, error } = await supabase.from("transactions").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteTransaction(id: string) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  return existing ? stripUserId(existing) : null;
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
