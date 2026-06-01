"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Plus,
  ReceiptText,
  Scale,
  Sun,
  UtensilsCrossed,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AssistantPage } from "@/components/assistant/assistant-page";
import { BrandMark } from "@/components/shared/brand-mark";
import { AppLoadingSkeleton } from "@/components/shared/app-loading-skeleton";
import { QuickDialogHost } from "@/components/shared/quick-dialogs";
import { cn } from "@/lib/utils";
import { useAppBoot } from "@/lib/store/use-app-boot";
import { useAuthStore } from "@/lib/store/auth.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { QuickDialog, useUiStore } from "@/lib/store/ui.store";

type NavItemConfig = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
};

const primaryNav: NavItemConfig[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed, match: ["/nutrition", "/fitness", "/foods"] },
  { href: "/budget", label: "Budget", icon: CircleDollarSign, match: ["/budget"] },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/insights", label: "Insights", icon: LineChart },
];

const mobileNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nutrition", label: "Food", icon: UtensilsCrossed, match: ["/nutrition", "/fitness", "/foods"] },
  { href: "/budget", label: "Budget", icon: CircleDollarSign, match: ["/budget"] },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/settings/profile", label: "Profile", icon: UserRound, match: ["/settings"] },
];

const mobileMenuGroups: { title: string; items: NavItemConfig[] }[] = [
  {
    title: "Also available",
    items: [primaryNav[3]],
  },
];

const quickActions = [
  { label: "Food", description: "Log a meal or snack", dialog: "food" as const, icon: UtensilsCrossed },
  { label: "Transaction", description: "Add income or expense", dialog: "transaction" as const, icon: ReceiptText },
  { label: "Habit", description: "Create or track a habit", dialog: "habit" as const, icon: CheckCircle2 },
  { label: "Weight", description: "Add a weigh-in", dialog: "weight" as const, icon: Scale },
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
  const settings = useProfileStore((state) => state.settings);
  const saveSettings = useProfileStore((state) => state.saveSettings);
  const hydrated = useProfileStore((state) => state.hydrated);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const openDialog = useUiStore((state) => state.openDialog);
  const [online, setOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const isAssistantRoute = pathname === "/assistant";

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

  const toggleTheme = () => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    void saveSettings({ theme: currentlyDark ? "light" : "dark" });
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
    return <AppLoadingSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <aside
          className={cn(
            "surface-strong fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-border/70 shadow-[var(--shadow-card)] transition-all lg:flex",
            sidebarCollapsed ? "w-16" : "w-72",
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-border/70 px-4">
            <BrandMark />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">FitBudget</p>
                <p className="text-xs leading-snug text-muted-foreground">Health and money cockpit</p>
              </div>
            )}
          </div>
          <nav className="scrollbar-soft flex-1 overflow-y-auto px-2.5 py-4" aria-label="Primary navigation">
            {!sidebarCollapsed && <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Daily system</p>}
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <NavItem key={item.href} item={item} active={isNavActive(pathname, item)} collapsed={sidebarCollapsed} />
              ))}
            </div>
            {!sidebarCollapsed && (
              <div className="mt-6 rounded-lg border border-primary/15 bg-[linear-gradient(135deg,var(--primary-soft),transparent_70%)] p-3 shadow-[var(--shadow-control)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assistant</p>
                <button type="button" onClick={() => setAssistantOpen(true)} className="interactive-row mt-2 flex w-full items-center gap-3 rounded-lg p-2 text-left">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Ask anything</span>
                    <span className="block truncate text-xs text-muted-foreground">Food, budget, habits, goals</span>
                  </span>
                </button>
              </div>
            )}
          </nav>
          <div className="border-t border-border/70 p-2.5">
            <AccountSettingsLink
              active={pathname.startsWith("/settings")}
              collapsed={sidebarCollapsed}
              initials={initials}
              name={profile?.name ?? user?.email ?? "FitBudget user"}
              status={online ? "Sync on" : "Connection offline"}
            />
            <div className={cn("grid gap-1", sidebarCollapsed ? "grid-cols-1" : "grid-cols-3")}>
              <FooterIconButton label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} collapsed={sidebarCollapsed} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </FooterIconButton>
              <FooterIconButton label="Toggle theme" collapsed={sidebarCollapsed} onClick={toggleTheme}>
                {settings.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </FooterIconButton>
              <FooterIconButton label="Log out" collapsed={sidebarCollapsed} onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </FooterIconButton>
            </div>
          </div>
        </aside>

        <main className={cn("min-h-screen transition-all lg:pb-0", isAssistantRoute ? "pb-0" : "pb-24", sidebarCollapsed ? "lg:pl-16" : "lg:pl-72")}>
          <header className="surface-strong sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/70 px-4 shadow-[var(--shadow-control)] lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <BrandMark compact />
              FitBudget
            </Link>
            <div className="flex items-center gap-2">
              {!online && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-600 dark:text-amber-300">Offline</span>}
              <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
                {settings.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setMobileMenuOpen(true)} aria-label="Open shortcuts">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </header>
          {!online && (
            <div className="hidden border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs text-amber-700 dark:text-amber-300 lg:block">
              Connection is offline. Changes need the network to save.
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className={cn("mx-auto w-full", isAssistantRoute ? "max-w-none px-0 py-0" : "max-w-7xl px-4 py-5 sm:px-6 lg:px-8")}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="surface-strong fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 shadow-[var(--shadow-card)] mobile-safe-bottom lg:hidden">
          <div className="grid h-16 grid-cols-5">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                  {active && <motion.span layoutId="mobile-nav-active" className="absolute inset-x-2 inset-y-2 rounded-lg bg-primary shadow-[var(--shadow-control)]" />}
                  <Icon className={cn("relative h-5 w-5", active ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className={cn("relative", active ? "font-semibold text-primary-foreground" : "text-muted-foreground")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {!isAssistantRoute && (
          <button
            type="button"
            onClick={() => setQuickActionsOpen(true)}
            className="fixed bottom-20 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 active:translate-y-0 lg:hidden"
            aria-label="Open quick actions"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {!isAssistantRoute && (
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="fixed bottom-[5.35rem] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-card text-primary shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 active:translate-y-0 lg:bottom-6 lg:right-6 lg:h-14 lg:w-14"
            aria-label="Open assistant"
          >
            <Bot className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
        )}

        <QuickActionsDialog
          open={quickActionsOpen}
          onOpenChange={setQuickActionsOpen}
          onSelect={(dialog) => {
            setQuickActionsOpen(false);
            openDialog(dialog);
          }}
        />

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="bottom-0 left-0 top-auto max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-2xl p-0 sm:w-full lg:hidden">
            <DialogHeader className="border-b px-4 py-4 pr-12">
              <DialogTitle>Shortcuts</DialogTitle>
              <DialogDescription>Fast paths for today.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 px-4 py-4">
              <Link
                href="/settings/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "interactive-row flex items-center gap-3 rounded-lg p-3",
                  pathname.startsWith("/settings") && "border-primary bg-primary/5 text-primary",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm">{initials}</div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile?.name ?? user?.email ?? "FitBudget user"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{online ? "Sync on" : "Connection offline"}</p>
                </div>
              </Link>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <QuickActionTile
                      key={action.dialog}
                      action={action}
                      onSelect={() => {
                        setMobileMenuOpen(false);
                        openDialog(action.dialog);
                      }}
                    />
                  ))}
                </div>
              </div>
              {mobileMenuGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <MobileMenuItem
                        key={item.href}
                        item={item}
                        active={isNavActive(pathname, item)}
                        onSelect={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Button className="w-full justify-start" variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
          <DialogContent className="bottom-0 left-0 top-auto h-[88dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-2xl p-0 lg:bottom-auto lg:left-auto lg:right-0 lg:top-0 lg:h-dvh lg:max-w-[30rem] lg:rounded-none lg:border-y-0 lg:border-r-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Assistant</DialogTitle>
              <DialogDescription>Ask about your food, budget, habits, and progress.</DialogDescription>
            </DialogHeader>
            <AssistantPage embedded />
          </DialogContent>
        </Dialog>

        <QuickDialogHost />
      </div>
    </TooltipProvider>
  );
}

function QuickActionsDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dialog: Exclude<QuickDialog, null>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-2xl p-0 sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle>Quick actions</DialogTitle>
          <DialogDescription>Jump straight into the task you need.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 p-4">
          {quickActions.map((action) => (
            <QuickActionTile key={action.dialog} action={action} onSelect={() => onSelect(action.dialog)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuickActionTile({
  action,
  onSelect,
}: {
  action: (typeof quickActions)[number];
  onSelect: () => void;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="interactive-row flex min-h-16 items-center gap-3 rounded-lg p-3 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{action.label}</span>
        <span className="block text-xs leading-5 text-muted-foreground">{action.description}</span>
      </span>
    </button>
  );
}

function AccountSettingsLink({
  active,
  collapsed,
  initials,
  name,
  status,
}: {
  active: boolean;
  collapsed: boolean;
  initials: string;
  name: string;
  status: string;
}) {
  const content = (
    <Link
      href="/settings/profile"
      aria-label="Open account settings"
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-2 flex h-12 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
        active && "bg-primary text-primary-foreground shadow-[var(--shadow-control)] hover:bg-primary hover:text-primary-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-foreground")}>{initials}</div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className={cn("truncate text-xs leading-snug", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{status}</p>
        </div>
      )}
    </Link>
  );

  if (!collapsed) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">Account settings</TooltipContent>
    </Tooltip>
  );
}

function FooterIconButton({ label, collapsed, onClick, children }: { label: string; collapsed: boolean; onClick: () => void; children: ReactNode }) {
  const button = (
    <Button className="w-full" variant="ghost" size="icon" onClick={onClick} aria-label={label}>
      {children}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={collapsed ? "right" : "top"}>{label}</TooltipContent>
    </Tooltip>
  );
}

function NavItem({ item, active, collapsed }: { item: NavItemConfig; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
        active && "bg-primary text-primary-foreground shadow-[var(--shadow-control)] hover:bg-primary hover:text-primary-foreground",
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "interactive-row flex min-h-14 items-center gap-3 rounded-lg p-3 text-sm",
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words leading-snug">{item.label}</span>
    </Link>
  );
}

function isNavActive(pathname: string, item: NavItemConfig) {
  const matches = item.match ?? [item.href];
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}
