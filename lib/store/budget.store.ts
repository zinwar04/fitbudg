"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import { BudgetProfile, CategoryBudget, Transaction } from "@/lib/db/schema";
import {
  TransactionInput,
  addTransaction,
  deleteTransaction,
  getBudgetData,
  saveBudgetProfile,
  saveCategoryBudgets,
  transactionsToCsv,
  updateTransaction,
} from "@/lib/db/budget.service";
import { defaultBudgetProfile } from "@/lib/utils/constants";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface BudgetState {
  profile: BudgetProfile;
  transactions: Transaction[];
  hydrated: boolean;
  loading: boolean;
  load: () => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, input: Partial<TransactionInput>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveProfile: (input: Partial<Omit<BudgetProfile, "id" | "updatedAt">>) => Promise<void>;
  saveCategoryBudgets: (categoryBudgets: CategoryBudget[]) => Promise<void>;
  exportCsv: () => string;
}

export const useBudgetStore = create<BudgetState>()(
  immer((set, get) => ({
    profile: defaultBudgetProfile,
    transactions: [],
    hydrated: false,
    loading: false,
    load: async () => {
      set((state) => {
        state.loading = true;
      });
      try {
        const data = await getBudgetData();
        set((state) => {
          state.profile = data.profile;
          state.transactions = data.transactions;
          state.hydrated = true;
          state.loading = false;
        });
      } catch (error) {
        toast.error(messageFromError(error));
        set((state) => {
          state.hydrated = true;
          state.loading = false;
        });
      }
    },
    addTransaction: async (input) => {
      try {
        await addTransaction(input);
        await get().load();
        toast.success("Transaction added.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    updateTransaction: async (id, input) => {
      try {
        await updateTransaction(id, input);
        await get().load();
        toast.success("Transaction updated.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    deleteTransaction: async (id) => {
      try {
        const deleted = await deleteTransaction(id);
        await get().load();
        toast.success("Transaction deleted.", {
          action: deleted
            ? {
                label: "Undo",
                onClick: () => {
                  void get().addTransaction({
                    type: deleted.type,
                    amount: deleted.amount,
                    currency: deleted.currency,
                    category: deleted.category,
                    paymentMethod: deleted.paymentMethod,
                    date: deleted.date,
                    title: deleted.title,
                    notes: deleted.notes,
                    isRecurring: deleted.isRecurring,
                    recurringId: deleted.recurringId,
                  });
                },
              }
            : undefined,
        });
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    saveProfile: async (input) => {
      try {
        const saved = await saveBudgetProfile(input);
        set((state) => {
          state.profile = saved;
        });
        toast.success("Budget profile saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    saveCategoryBudgets: async (categoryBudgets) => {
      try {
        const saved = await saveCategoryBudgets(categoryBudgets);
        set((state) => {
          state.profile = saved;
        });
        toast.success("Category limits saved.");
      } catch (error) {
        toast.error(messageFromError(error));
      }
    },
    exportCsv: () => transactionsToCsv(get().transactions),
  })),
);
