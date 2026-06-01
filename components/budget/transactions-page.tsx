"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Download, Edit, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionDialog } from "@/components/shared/entity-dialogs";
import { currentBudgetCycleRange, previousBudgetCycleRange } from "@/lib/calculations/budget";
import { Transaction, TransactionCategory } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { transactionCategories } from "@/lib/utils/constants";
import { formatCurrency, formatDateKey, localDateKey, sum, titleCase } from "@/lib/utils/formatting";

type DatePreset = "today" | "week" | "cycle" | "lastCycle" | "all";

export function TransactionsPage() {
  const params = useSearchParams();
  const profile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const deleteTransaction = useBudgetStore((state) => state.deleteTransaction);
  const exportCsv = useBudgetStore((state) => state.exportCsv);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<DatePreset>("cycle");
  const [category, setCategory] = useState<TransactionCategory | "all">((params.get("category") as TransactionCategory | null) ?? "all");
  const [type, setType] = useState<"all" | "expense" | "income">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const categoryOptions = useMemo(
    () => Array.from(new Set([...transactionCategories, ...profile.categoryBudgets.map((budget) => budget.category), ...transactions.map((transaction) => transaction.category)])),
    [profile.categoryBudgets, transactions],
  );

  const filtered = useMemo(() => {
    const range = dateRange(preset, profile);
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const inRange = preset === "all" || (transaction.date >= range.start && transaction.date <= range.end);
      const matchesQuery = !normalized || `${transaction.title} ${transaction.notes ?? ""}`.toLowerCase().includes(normalized);
      const matchesCategory = category === "all" || transaction.category === category;
      const matchesType = type === "all" || transaction.type === type;
      return inRange && matchesQuery && matchesCategory && matchesType;
    });
  }, [category, preset, profile, query, transactions, type]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((transaction) => {
      map.set(transaction.date, [...(map.get(transaction.date) ?? []), transaction]);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const filteredExpenseTotal = sum(filtered.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const downloadCsv = () => {
    const blob = new Blob([exportCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fitbudget-transactions-${localDateKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`${filtered.length} shown · ${formatCurrency(filteredExpenseTotal, profile.currency, profile.currencySymbol)} expenses in this view`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        }
      />
      <Card className="sticky top-16 z-10 mb-4 bg-card/95 backdrop-blur-xl">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or notes" />
            </div>
            <select className="h-11 w-full rounded-lg border bg-card/80 px-3 text-sm lg:w-auto" value={preset} onChange={(event) => setPreset(event.target.value as DatePreset)}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="cycle">Current Cycle</option>
              <option value="lastCycle">Previous Cycle</option>
              <option value="all">All Time</option>
            </select>
            <select className="h-11 w-full rounded-lg border bg-card/80 px-3 text-sm lg:w-auto" value={type} onChange={(event) => setType(event.target.value as "all" | "expense" | "income")}>
              <option value="all">All</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>All</Button>
            {categoryOptions.map((item) => (
              <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)}>
                {titleCase(item)}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Filtered expense total: <span className="font-medium data-number text-foreground">{formatCurrency(filteredExpenseTotal, profile.currency, profile.currencySymbol)}</span>
          </p>
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No matching transactions" description="Adjust the filters or add a transaction to start budget tracking." action={<Button onClick={openAdd}>Add Transaction</Button>} />
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, items]) => {
            const dailyTotal = sum(items.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));
            return (
              <Card key={date}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{formatDateKey(date)}</p>
                      <p className="text-sm text-muted-foreground">{items.length} transactions</p>
                    </div>
                    <Badge variant="secondary">{formatCurrency(dailyTotal, profile.currency, profile.currencySymbol)}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((transaction) => (
                      <div key={transaction.id} className="interactive-row flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{transaction.title}</p>
                          <p className="text-sm text-muted-foreground">{titleCase(transaction.category)} · {titleCase(transaction.paymentMethod)}</p>
                          {transaction.notes && <p className="mt-1 text-sm text-muted-foreground">{transaction.notes}</p>}
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <p className={`text-lg font-semibold data-number ${transaction.type === "income" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                            {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency, profile.currencySymbol)}
                          </p>
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(transaction); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteTransaction(transaction.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />
    </>
  );
}

function dateRange(preset: DatePreset, profile: ReturnType<typeof useBudgetStore.getState>["profile"]) {
  const now = new Date();
  if (preset === "today") return { start: localDateKey(now), end: localDateKey(now) };
  if (preset === "week") return { start: format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), "yyyy-MM-dd"), end: localDateKey(now) };
  if (preset === "cycle") {
    const cycle = currentBudgetCycleRange(profile, now);
    return { start: cycle.start, end: cycle.end };
  }
  if (preset === "lastCycle") {
    const cycle = previousBudgetCycleRange(profile, now);
    return { start: cycle.start, end: cycle.end };
  }
  return { start: "", end: "" };
}
