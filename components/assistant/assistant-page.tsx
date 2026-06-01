"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Bot, CheckCircle2, Flame, Menu, MessageSquare, MessageSquarePlus, Scale, Sparkles, Trash2, UtensilsCrossed, WalletCards, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { buildAssistantContext } from "@/lib/assistant/context";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { AssistantSession, ChatMessage } from "@/lib/db/schema";
import { deleteAssistantSession, getAssistantSessions, saveAssistantSession } from "@/lib/db/assistant.service";
import { useAuthStore } from "@/lib/store/auth.store";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { createId, formatCurrency, formatKcal, localDateKey, nowIso, sum } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

interface StarterPrompt {
  title: string;
  prompt: string;
  icon: LucideIcon;
}

export function AssistantPage({ embedded = false }: { embedded?: boolean }) {
  const authSession = useAuthStore((state) => state.session);
  const profile = useProfileStore((state) => state.profile);
  const settings = useProfileStore((state) => state.settings);
  const logs = useFoodStore((state) => state.logs);
  const foodEntries = useFoodStore((state) => state.entries);
  const foodLibrary = useFoodStore((state) => state.library);
  const mealTemplates = useFoodStore((state) => state.mealTemplates);
  const weightEntries = useFoodStore((state) => state.weights);
  const budgetProfile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const habits = useHabitsStore((state) => state.habits);
  const habitEntries = useHabitsStore((state) => state.entries);
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(
    () =>
      buildAssistantContext({
        profile,
        settings,
        budgetProfile,
        logs,
        foodEntries,
        foodLibrary,
        mealTemplates,
        weightEntries,
        transactions,
        habits,
        habitEntries,
      }),
    [budgetProfile, foodEntries, foodLibrary, habitEntries, habits, logs, mealTemplates, profile, settings, transactions, weightEntries],
  );

  const starterPrompts = useMemo(
    () =>
      buildStarterPrompts({
        profile,
        budgetProfile,
        foodEntries,
        foodLibrary,
        mealTemplates,
        weightEntries,
        transactions,
        habits,
        habitEntries,
      }),
    [budgetProfile, foodEntries, foodLibrary, habitEntries, habits, mealTemplates, profile, transactions, weightEntries],
  );

  const activeTitle = sessions.find((chat) => chat.id === sessionId)?.title ?? "Assistant";

  const refreshSessions = async () => {
    const loaded = await getAssistantSessions();
    setSessions(loaded);
    return loaded;
  };

  useEffect(() => {
    refreshSessions()
      .then((loaded) => {
        const latest = loaded[0];
        if (latest) {
          setSessionId(latest.id);
          setMessages(latest.messages);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput("");
    setHistoryOpen(false);
  };

  const openSession = (chat: AssistantSession) => {
    setSessionId(chat.id);
    setMessages(chat.messages);
    setHistoryOpen(false);
  };

  const removeSession = async (id: string) => {
    await deleteAssistantSession(id);
    if (sessionId === id) startNewChat();
    await refreshSessions();
    toast.success("Chat deleted.");
  };

  const persist = async (nextMessages: ChatMessage[]) => {
    const title = nextMessages.find((message) => message.role === "user")?.content.slice(0, 56) || "New chat";
    const saved = await saveAssistantSession({ id: sessionId ?? undefined, title, messages: nextMessages });
    setSessionId(saved.id);
    await refreshSessions();
  };

  const send = async (content = input) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmed, createdAt: nowIso() };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map((message) => ({ role: message.role, content: message.content })),
          context,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { content?: string; error?: string };
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: response.ok
          ? payload.content ?? "I could not generate a response right now. Please send that again in a moment."
          : payload.error ?? "I could not generate a response right now. Please try again in a moment.",
        createdAt: nowIso(),
      };
      const withAssistant = [...next, assistantMessage];
      setMessages(withAssistant);
      await persist(withAssistant);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "I could not reach the assistant right now. Check your connection and try again.",
        createdAt: nowIso(),
      };
      setMessages([...next, assistantMessage]);
      toast.error(error instanceof Error ? error.message : "Assistant request failed.");
    } finally {
      setLoading(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className={cn("flex w-full overflow-hidden bg-background", embedded ? "h-full min-h-0" : "h-[calc(100svh-7.5rem)] min-h-[34rem] lg:h-screen lg:min-h-0")}>
      <aside className={cn("hidden w-80 shrink-0 flex-col border-r bg-card/75 backdrop-blur-xl", !embedded && "lg:flex")}>
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <Button className="h-10 flex-1 justify-start" variant="ghost" onClick={startNewChat}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
        <ChatHistory sessions={sessions} sessionId={sessionId} onOpen={openSession} onDelete={(id) => void removeSession(id)} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className={cn("flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-3 backdrop-blur-xl sm:px-4", embedded && "pr-12")}>
          <div className="flex min-w-0 items-center gap-2">
            <Button className={cn(!embedded && "lg:hidden")} size="icon" variant="ghost" onClick={() => setHistoryOpen(true)} aria-label="Open chat history">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{activeTitle}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={startNewChat} aria-label="Start new chat">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className={cn("mx-auto flex w-full flex-col gap-6", embedded ? "max-w-full" : "max-w-3xl")}>
            {messages.length === 0 && (
              <div className={cn("flex flex-col items-center justify-center py-8 text-center", embedded ? "min-h-[44vh]" : "min-h-[58vh]")}>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border bg-card shadow-[var(--shadow-control)]">
                  <Bot className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">What can I help with?</h1>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {starterPrompts.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.prompt}
                        className="interactive-row group min-h-20 rounded-lg px-4 py-3 text-left"
                        onClick={() => void send(item.prompt)}
                        aria-label={`Use starter prompt: ${item.title}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          {item.title}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{item.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card shadow-[var(--shadow-control)]">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground shadow-[var(--shadow-control)]">Thinking...</div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <form
          className="shrink-0 bg-background px-3 pb-3 sm:px-6 sm:pb-5"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className={cn("mx-auto flex items-end gap-2 rounded-[26px] border bg-card/95 p-2 shadow-[var(--shadow-card)] backdrop-blur-xl", embedded ? "max-w-full" : "max-w-3xl")}>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onComposerKeyDown}
              className="max-h-40 min-h-11 resize-none border-0 bg-transparent px-3 py-3 text-base leading-6 focus-visible:ring-0 sm:text-sm"
              placeholder="Ask anything"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0 rounded-full" aria-label="Send message">
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </main>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="left-0 top-0 h-dvh max-h-none w-[86vw] max-w-sm translate-x-0 translate-y-0 gap-0 rounded-none border-l-0 border-y-0 p-0 sm:w-96 lg:hidden">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Chats</DialogTitle>
          </DialogHeader>
          <div className="flex h-[calc(100dvh-4rem)] flex-col">
            <div className="border-b p-3">
              <Button className="w-full justify-start" variant="outline" onClick={startNewChat}>
                <MessageSquarePlus className="h-4 w-4" />
                New chat
              </Button>
            </div>
            <ChatHistory sessions={sessions} sessionId={sessionId} onOpen={openSession} onDelete={(id) => void removeSession(id)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildStarterPrompts({
  profile,
  budgetProfile,
  foodEntries,
  foodLibrary,
  mealTemplates,
  weightEntries,
  transactions,
  habits,
  habitEntries,
}: {
  profile: ReturnType<typeof useProfileStore.getState>["profile"];
  budgetProfile: ReturnType<typeof useBudgetStore.getState>["profile"];
  foodEntries: ReturnType<typeof useFoodStore.getState>["entries"];
  foodLibrary: ReturnType<typeof useFoodStore.getState>["library"];
  mealTemplates: ReturnType<typeof useFoodStore.getState>["mealTemplates"];
  weightEntries: ReturnType<typeof useFoodStore.getState>["weights"];
  transactions: ReturnType<typeof useBudgetStore.getState>["transactions"];
  habits: ReturnType<typeof useHabitsStore.getState>["habits"];
  habitEntries: ReturnType<typeof useHabitsStore.getState>["entries"];
}): StarterPrompt[] {
  const today = localDateKey();
  const targets = calculateNutritionTargets(profile);
  const todayEntries = foodEntries.filter((entry) => entry.date === today);
  const todayCalories = sum(todayEntries.map((entry) => entry.calories));
  const budget = calculateBudgetSummary(budgetProfile, transactions);
  const activeHabits = habits.filter((habit) => habit.isActive);
  const completedHabits = activeHabits.filter((habit) => habitEntries.some((entry) => entry.habitId === habit.id && entry.date === today && entry.completed)).length;
  const latestWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0];

  return [
    {
      title: "Today",
      prompt: targets
        ? `Am I on track today? I have logged ${formatKcal(todayCalories)} of my ${formatKcal(targets.calories)} target, completed ${completedHabits}/${activeHabits.length} habits, and my safe spend today is ${formatCurrency(budget.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)}.`
        : "Help me create a realistic food, habit, and spending plan for today from my account data.",
      icon: Sparkles,
    },
    {
      title: foodLibrary.length || mealTemplates.length ? "Meals" : "First meal",
      prompt:
        foodLibrary.length || mealTemplates.length
          ? "Build a cheap high-protein meal idea from my saved foods and meal templates. Keep it realistic for my calorie target and budget."
          : "I have not built my food library yet. What should I add first so logging becomes fast and useful?",
      icon: UtensilsCrossed,
    },
    {
      title: transactions.length ? "Money" : "Budget setup",
      prompt: transactions.length
        ? `Summarize my spending pattern for this budget cycle and tell me the one decision that would keep me safest. My current safe daily spend is ${formatCurrency(budget.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)}.`
        : "Help me set up a practical first budget and category limits for the way I actually spend.",
      icon: WalletCards,
    },
    {
      title: latestWeight ? "Body trend" : "Next log",
      prompt: latestWeight
        ? `Review my latest weight trend and food consistency. My latest weigh-in was ${latestWeight.weight} kg on ${latestWeight.date}. What should I focus on this week?`
        : "When should I log my weight, and how often should I weigh in without overthinking it?",
      icon: latestWeight ? Scale : CheckCircle2,
    },
    {
      title: "Quick fix",
      prompt: "Look across my food, habits, weight, and budget data. What is the single highest-impact improvement I can make in the next 24 hours?",
      icon: Flame,
    },
  ];
}

function ChatHistory({
  sessions,
  sessionId,
  onOpen,
  onDelete,
}: {
  sessions: AssistantSession[];
  sessionId: string | null;
  onOpen: (session: AssistantSession) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
      {sessions.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">No chats yet.</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((chat) => (
            <div key={chat.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent", chat.id === sessionId && "bg-primary/10 text-primary")}>
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => onOpen(chat)} aria-current={chat.id === sessionId ? "page" : undefined}>
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{chat.title}</span>
              </button>
              <Button className="h-8 w-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100" size="icon" variant="ghost" onClick={() => onDelete(chat.id)} aria-label="Delete chat">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const user = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", user ? "justify-end" : "justify-start")}>
      {!user && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card shadow-[var(--shadow-control)]">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "min-w-0 text-[15px] leading-7 sm:text-sm sm:leading-6",
          user ? "max-w-[86%] rounded-[22px] bg-primary px-4 py-2.5 text-primary-foreground shadow-[var(--shadow-control)]" : "w-full max-w-3xl px-1 py-1 text-foreground",
        )}
      >
        <FormattedMessage content={message.content} />
      </div>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trimEnd());
        const bulletLines = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        const numberLines = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

        if (bulletLines) {
          return (
            <ul key={`${block}-${index}`} className="list-disc space-y-1 pl-5">
              {lines.map((line) => (
                <li key={line}>{line.replace(/^[-*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        if (numberLines) {
          return (
            <ol key={`${block}-${index}`} className="list-decimal space-y-1 pl-5">
              {lines.map((line) => (
                <li key={line}>{line.replace(/^\d+\.\s+/, "")}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${block}-${index}`} className="whitespace-pre-wrap break-words">
            {block}
          </p>
        );
      })}
    </div>
  );
}
