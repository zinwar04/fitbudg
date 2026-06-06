"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionTab {
  href: string;
  label: string;
  icon: LucideIcon;
  aliases?: string[];
}

export function SectionTabs({ tabs, className }: { tabs: SectionTab[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("sticky top-14 z-10 -mx-4 mb-5 overflow-x-auto border-b bg-background/88 px-4 py-2 backdrop-blur-xl scrollbar-soft sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8", className)} aria-label="Section navigation">
      <div className="inline-flex min-w-full gap-1 rounded-full border bg-card/80 p-1 shadow-[var(--shadow-control)] sm:min-w-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`) || tab.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
                active && "bg-primary text-primary-foreground shadow-[var(--shadow-control)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
