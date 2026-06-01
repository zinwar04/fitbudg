"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { currentBudgetCycleRange } from "@/lib/calculations/budget";
import { CategoryBudget, TransactionCategory } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { transactionCategories } from "@/lib/utils/constants";
import { formatCurrency, percent, sum, titleCase } from "@/lib/utils/formatting";

export function CategoriesPage() {
  const profile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const saveCategoryBudgets = useBudgetStore((state) => state.saveCategoryBudgets);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(profile.categoryBudgets);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customLimit, setCustomLimit] = useState(0);
  const cycle = useMemo(() => currentBudgetCycleRange(profile), [profile]);

  const rows = useMemo(
    () =>
      budgets.map((budget) => ({
        ...budget,
        spent: sum(
          transactions
            .filter((transaction) => transaction.type === "expense" && transaction.category === budget.category && transaction.date >= cycle.start && transaction.date <= cycle.end)
            .map((transaction) => transaction.amount),
        ),
      })),
    [budgets, cycle.end, cycle.start, transactions],
  );

  const addMissingCategory = (category: TransactionCategory) => {
    if (budgets.some((budget) => budget.category === category)) return;
    setBudgets((current) => [...current, { category, limit: 0 }]);
  };

  const addCustomCategory = () => {
    const category = toCategoryKey(customName);
    if (!category || budgets.some((budget) => budget.category === category)) return;
    setBudgets((current) => [...current, { category, limit: customLimit }]);
    setCustomName("");
    setCustomLimit(0);
    setCustomOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description={`${rows.length} budget buckets · changes stay local until you save`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCustomOpen(true)}>
              <Plus className="h-4 w-4" /> Custom Category
            </Button>
            <Button onClick={() => saveCategoryBudgets(budgets)}>
              <Save className="h-4 w-4" /> Save Limits
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {transactionCategories
          .filter((category) => category !== "income")
          .map((category) => (
            <Button key={category} size="sm" variant={budgets.some((budget) => budget.category === category) ? "default" : "outline"} onClick={() => addMissingCategory(category)}>
              {titleCase(category)}
            </Button>
          ))}
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <Card key={`${row.category}-${index}`} className="bg-card/90">
            <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
              <div>
                <p className="font-semibold">{titleCase(row.category)}</p>
                <p className="text-sm text-muted-foreground">Spent this cycle {formatCurrency(row.spent, profile.currency, profile.currencySymbol)}</p>
                <Progress value={percent(row.spent, row.limit)} className="mt-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Cycle limit</label>
                <Input
                  className="mt-1"
                  type="number"
                  value={row.limit}
                  onChange={(event) => {
                    const limit = Number(event.target.value);
                    setBudgets((current) => current.map((budget, budgetIndex) => (budgetIndex === index ? { ...budget, limit } : budget)));
                  }}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setBudgets((current) => current.filter((_, budgetIndex) => budgetIndex !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom budget bucket</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Custom categories become available when you add or edit transactions, so spending can be tracked separately instead of falling into Other.
          </p>
          <Input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Custom label" />
          <Input type="number" value={customLimit} onChange={(event) => setCustomLimit(Number(event.target.value))} placeholder="Limit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button>
            <Button onClick={addCustomCategory} disabled={!customName.trim() || budgets.some((budget) => budget.category === toCategoryKey(customName))}>
              Add Bucket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function toCategoryKey(value: string): TransactionCategory {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) as TransactionCategory;
}
