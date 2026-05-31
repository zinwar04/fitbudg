"use client";

import { ReactNode } from "react";
import { BarChart3, ReceiptText, WalletCards } from "lucide-react";
import { SectionTabs } from "@/components/shared/section-tabs";

const budgetTabs = [
  { href: "/budget", label: "Overview", icon: BarChart3, aliases: ["/budget/overview"] },
  { href: "/budget/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budget/categories", label: "Categories", icon: WalletCards },
];

export default function BudgetLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs tabs={budgetTabs} />
      {children}
    </>
  );
}
