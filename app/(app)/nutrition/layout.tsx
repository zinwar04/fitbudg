"use client";

import { ReactNode } from "react";
import { BarChart3, ChefHat, Library, Scale, UtensilsCrossed } from "lucide-react";
import { SectionTabs } from "@/components/shared/section-tabs";

const nutritionTabs = [
  { href: "/nutrition", label: "Log Food", icon: UtensilsCrossed, aliases: ["/nutrition/log"] },
  { href: "/nutrition/history", label: "History", icon: BarChart3 },
  { href: "/nutrition/weight", label: "Weight", icon: Scale },
  { href: "/nutrition/foods", label: "My Foods", icon: Library },
  { href: "/nutrition/meals", label: "Templates", icon: ChefHat },
];

export default function NutritionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionTabs tabs={nutritionTabs} />
      {children}
    </>
  );
}
