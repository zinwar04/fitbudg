"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Database,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Library,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  Settings,
  Sparkles,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickDialogHost } from "@/components/shared/quick-dialogs";
import { cn } from "@/lib/utils";
import { useAppBoot } from "@/lib/store/use-app-boot";
import { useAuthStore } from "@/lib/store/auth.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { useUiStore } from "@/lib/store/ui.store";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fitness/log", label: "Food Log", icon: UtensilsCrossed },
  { href: "/fitness/history", label: "History", icon: BarChart3 },
  { href: "/fitness/weight", label: "Weight", icon: Target },
  { href: "/foods/library", label: "Food Library", icon: Library },
  { href: "/foods/meals", label: "Meals", icon: Dumbbell },
  { href: "/budget/overview", label: "Budget", icon: CircleDollarSign },
  { href: "/budget/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budget/categories", label: "Categories", icon: Menu },
  { href: "/habits", label: "Habits", icon: Sparkles },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

const settingsNav = [
  { href: "/settings/profile", label: "Profile", icon: Settings },
  { href: "/settings/fitness", label: "Fitness Settings", icon: Target },
  { href: "/settings/budget", label: "Budget Settings", icon: CircleDollarSign },
  { href: "/settings/appearance", label: "Appearance", icon: Moon },
  { href: "/settings/data", label: "Data", icon: Database },
];

const mobileNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fitness/log", label: "Log", icon: UtensilsCrossed },
  { href: "/budget/overview", label: "Budget", icon: CircleDollarSign },
  { href: "/habits", label: "Habits", icon: Sparkles },
];

type NavItemConfig = (typeof primaryNav)[number];

const mobileMenuGroups: { title: string; items: NavItemConfig[] }[] = [
  {
    title: "Main",
    items: [
      primaryNav[0],
      primaryNav[9],
      primaryNav[10],
      primaryNav[11],
    ],
  },
  {
    title: "Fitness and Food",
    items: [
      primaryNav[1],
      primaryNav[2],
      primaryNav[3],
      primaryNav[4],
      primaryNav[5],
    ],
  },
  {
    title: "Budget",
    items: [
      primaryNav[6],
      primaryNav[7],
      primaryNav[8],
    ],
  },
  {
    title: "Settings",
    items: settingsNav,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  useAppBoot();
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const profile = useProfileStore((state) => state.profile);
  const hydrated = useProfileStore((state) => state.hydrated);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const openDialog = useUiStore((state) => state.openDialog);
  const [online, setOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (authHydrated && !session) {
      router.replace("/login");
    }
  }, [authHydrated, router, session]);

  useEffect(() => {
    if (hydrated && !profile?.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [hydrated, profile?.onboardingComplete, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const initials = useMemo(() => {
    const name = profile?.name ?? "FitBudget";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.name]);

  if (!authHydrated || !session || !hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          {!authHydrated ? "Checking your account" : !session ? "Opening sign in" : "Syncing your workspace"}
        </div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <aside
          className={cn(
            "fixed left-0 top-0 z-30 hidden h-screen flex-col border-r bg-card transition-all lg:flex",
            sidebarCollapsed ? "w-16" : "w-72",
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              FB
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">FitBudget</p>
                <p className="truncate text-xs text-muted-foreground">Body and money command center</p>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {primaryNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} collapsed={sidebarCollapsed} />
            ))}
          </nav>
          <div className="border-t p-2">
            <div className={cn("mb-2 flex items-center gap-3 rounded-lg px-2 py-2", sidebarCollapsed && "justify-center")}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials}</div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile?.name ?? user?.email ?? "FitBudget user"}</p>
                  <p className="truncate text-xs text-muted-foreground">{online ? "Supabase sync on" : "Connection offline"}</p>
                </div>
              )}
            </div>
            {settingsNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={sidebarCollapsed} />
            ))}
            <Button className="mt-2 w-full" variant="ghost" size={sidebarCollapsed ? "icon" : "default"} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!sidebarCollapsed && "Collapse"}
            </Button>
            <Button className="mt-1 w-full" variant="ghost" size={sidebarCollapsed ? "icon" : "default"} onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && "Log out"}
            </Button>
          </div>
        </aside>

        <main className={cn("min-h-screen pb-24 transition-all lg:pb-0", sidebarCollapsed ? "lg:pl-16" : "lg:pl-72")}>
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">FB</span>
              FitBudget
            </Link>
            <div className="flex items-center gap-2">
              {!online && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-600 dark:text-amber-300">Offline</span>}
              <Button size="icon" variant="ghost" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
                <Menu className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={() => openDialog("food")} aria-label="Quick add food">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </header>
          {!online && (
            <div className="hidden border-b bg-amber-500/10 px-6 py-2 text-xs text-amber-700 dark:text-amber-300 lg:block">
              Connection is offline. Supabase actions will need the network to save.
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 mobile-safe-bottom backdrop-blur lg:hidden">
          <div className="grid h-16 grid-cols-5">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active = isMobileRootActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                  {active && <motion.span layoutId="mobile-nav-active" className="absolute inset-x-4 top-2 h-8 rounded-full bg-primary/10" />}
                  <Icon className={cn("relative h-5 w-5", active && "text-primary")} />
                  <span className={cn("relative", active && "font-medium text-primary")}>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="relative flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
            >
              {(mobileMenuOpen || !mobileNav.some((item) => isMobileRootActive(pathname, item.href))) && (
                <motion.span layoutId="mobile-nav-active" className="absolute inset-x-4 top-2 h-8 rounded-full bg-primary/10" />
              )}
              <Menu className={cn("relative h-5 w-5", (mobileMenuOpen || !mobileNav.some((item) => isMobileRootActive(pathname, item.href))) && "text-primary")} />
              <span className={cn("relative", (mobileMenuOpen || !mobileNav.some((item) => isMobileRootActive(pathname, item.href))) && "font-medium text-primary")}>
                More
              </span>
            </button>
          </div>
        </nav>

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="bottom-0 left-0 top-auto max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-2xl p-0 sm:w-full lg:hidden">
            <DialogHeader className="border-b px-4 py-4 pr-12">
              <DialogTitle>All FitBudget Features</DialogTitle>
              <DialogDescription>Every page is available here on mobile.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 px-4 py-4">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="truncate text-sm font-medium">{profile?.name ?? user?.email ?? "FitBudget user"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{online ? "Supabase sync on" : "Connection offline"}</p>
              </div>
              {mobileMenuGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <MobileMenuItem
                        key={item.href}
                        item={item}
                        active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                        onSelect={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <QuickDialogHost />
      </div>
    </TooltipProvider>
  );
}

function NavItem({ item, active, collapsed }: { item: NavItemConfig; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary/10 text-primary",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function MobileMenuItem({ item, active, onSelect }: { item: NavItemConfig; active: boolean; onSelect: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-lg border bg-background p-3 text-sm transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:border-primary hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 leading-snug">{item.label}</span>
    </Link>
  );
}

function isMobileRootActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/habits") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const section = href.split("/").slice(0, 2).join("/");
  return pathname === href || pathname.startsWith(`${section}/`);
}
