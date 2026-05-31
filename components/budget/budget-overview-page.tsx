"use client";

import Link from "next/link";
import { BarChart3, CircleDollarSign, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { ResponsiveBar } from "@/components/shared/chart-frame";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useUiStore } from "@/lib/store/ui.store";
import { formatCurrency, formatDateKey, percent, titleCase } from "@/lib/utils/formatting";

export function BudgetOverviewPage() {
  const profile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const openDialog = useUiStore((state) => state.openDialog);
  const summary = calculateBudgetSummary(profile, transactions);
  const currency = profile.currency;
  const symbol = profile.currencySymbol;

  return (
    <>
      <PageHeader
        title="Budget"
        description={`Day ${summary.dayInCycle} of ${summary.daysInCycle} · ${formatCurrency(summary.remaining, currency, symbol)} remaining · ${summary.pacing === "onTrack" ? "on track" : summary.pacing === "spendingFast" ? "spending fast" : "over budget"}`}
        action={
          <Button onClick={() => openDialog("transaction")}>
            <ReceiptText className="h-4 w-4" /> Add Transaction
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={ReceiptText} label="Largest expense" value={summary.largestExpense ? formatCurrency(summary.largestExpense.amount, currency, symbol) : "--"} detail={summary.largestExpense?.title} />
        <MetricCard icon={WalletCards} label="Top category" value={summary.topCategory ? titleCase(summary.topCategory.category) : "--"} detail={summary.topCategory ? formatCurrency(summary.topCategory.spent, currency, symbol) : undefined} />
        <MetricCard icon={BarChart3} label="Average daily spend" value={formatCurrency(summary.averageDailySpend, currency, symbol)} />
        <MetricCard icon={CircleDollarSign} label="Income" value={formatCurrency(summary.income, currency, symbol)} />
        <MetricCard icon={TrendingUp} label="Net this cycle" value={formatCurrency(summary.net, currency, symbol)} tone={summary.net >= 0 ? "positive" : "danger"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Category budgets</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/budget/categories">Edit Limits</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {summary.categorySpend.map((category) => {
              const used = percent(category.spent, category.limit);
              return (
                <Link key={category.category} href={`/budget/transactions?category=${category.category}`} className="rounded-lg border p-3 hover:border-primary">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{titleCase(category.category)}</p>
                    <Badge variant={used >= 100 ? "destructive" : used >= 75 ? "outline" : "secondary"}>{category.limit > 0 ? `${Math.round(used)}%` : "No limit"}</Badge>
                  </div>
                  <Progress value={used} />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(category.spent, currency, symbol)} / {category.limit > 0 ? formatCurrency(category.limit, currency, symbol) : "No limit set"}
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily spending this cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveBar data={summary.dailySpend.map((day) => ({ date: day.date.slice(5), spent: day.spent }))} xKey="date" yKey="spent" goal={summary.daysInCycle > 0 ? profile.monthlyBudget / summary.daysInCycle : 0} height={360} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardContent className="p-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Remaining this cycle</p>
              <p className={`mt-1 text-4xl font-semibold data-number ${summary.remaining < 0 ? "text-red-500" : summary.paceRatio > 1.1 ? "text-amber-500" : "text-emerald-500"}`}>
                {formatCurrency(summary.remaining, currency, symbol)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Safe daily spend: {formatCurrency(summary.safeDailySpend, currency, symbol)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cycle {formatDateKey(summary.cycleStart)} to {formatDateKey(summary.cycleEnd)}
              </p>
            </div>
            <Badge variant={summary.pacing === "onTrack" ? "secondary" : summary.pacing === "spendingFast" ? "outline" : "destructive"}>
              {summary.pacing === "onTrack" ? "On Track" : summary.pacing === "spendingFast" ? "Spending Fast" : "Over Budget"}
            </Badge>
          </div>
          <Progress value={percent(summary.spent, profile.monthlyBudget)} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {formatCurrency(summary.spent, currency, symbol)} spent of {formatCurrency(profile.monthlyBudget, currency, symbol)}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
