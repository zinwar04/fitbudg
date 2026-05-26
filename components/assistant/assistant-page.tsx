"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquare, MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { buildAssistantContext } from "@/lib/assistant/context";
import { AssistantSession, ChatMessage } from "@/lib/db/schema";
import { deleteAssistantSession, getAssistantSessions, saveAssistantSession } from "@/lib/db/assistant.service";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { createId, nowIso } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

const promptGroups = {
  Coach: [
    "Give me a quick coaching plan for today.",
    "What should I focus on this week?",
    "Where are my health and budget choices helping each other?",
    "What is one small win I can get before bedtime?",
  ],
  Nutrition: [
    "How are my calories and protein this week?",
    "Suggest a high-protein meal that fits a tight budget.",
    "What food should I adjust first?",
    "Help me build a simple meal plan from my usual foods.",
  ],
  Budget: [
    "How's my budget looking this cycle?",
    "Where am I overspending?",
    "How much can I safely spend today?",
    "How do I cut food spending without hurting protein?",
  ],
};

type PromptMode = keyof typeof promptGroups;

export function AssistantPage() {
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
  const [mode, setMode] = useState<PromptMode>("Coach");
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
  };

  const openSession = (session: AssistantSession) => {
    setSessionId(session.id);
    setMessages(session.messages);
  };

  const removeSession = async (id: string) => {
    await deleteAssistantSession(id);
    if (sessionId === id) startNewChat();
    await refreshSessions();
    toast.success("Chat deleted.");
  };

  const persist = async (nextMessages: ChatMessage[]) => {
    const title = nextMessages.find((message) => message.role === "user")?.content.slice(0, 48) || "New chat";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((message) => ({ role: message.role, content: message.content })),
          context,
        }),
      });
      const payload = (await response.json()) as { content?: string; error?: string };
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: payload.content ?? payload.error ?? "I could not generate a response. Try again after adding more data.",
        createdAt: nowIso(),
      };
      const withAssistant = [...next, assistantMessage];
      setMessages(withAssistant);
      await persist(withAssistant);
    } catch (error) {
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
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold">FitBudget AI</h1>
            <Badge variant="secondary">Coach</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Ask about meals, training, spending, habits, and how to make the whole day work.</p>
        </div>
        <Button onClick={startNewChat}>
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={!sessionId ? "default" : "outline"} onClick={startNewChat}>
            New
          </Button>
          {sessions.map((session) => (
            <Button key={session.id} size="sm" variant={session.id === sessionId ? "default" : "outline"} className="max-w-52 shrink-0 justify-start truncate" onClick={() => openSession(session)}>
              {session.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden rounded-xl border bg-card p-3 lg:block">
          <Button className="mb-3 w-full justify-start" variant="outline" onClick={startNewChat}>
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div key={session.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-1.5", session.id === sessionId && "bg-primary/10")}>
                <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => openSession(session)}>
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{session.title}</span>
                </button>
                <Button className="h-7 w-7 opacity-0 group-hover:opacity-100" size="icon" variant="ghost" onClick={() => void removeSession(session.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border bg-background">
          <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-card">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">What are we improving today?</h2>
                  <div className="mt-6 flex justify-center gap-2">
                    {(Object.keys(promptGroups) as PromptMode[]).map((group) => (
                      <Button key={group} size="sm" variant={mode === group ? "default" : "outline"} onClick={() => setMode(group)}>
                        {group}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {promptGroups[mode].map((prompt) => (
                      <button key={prompt} className="rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-primary" onClick={() => void send(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card")}>
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">Thinking...</div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>
          <form
            className="border-t bg-background p-3 sm:p-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onComposerKeyDown}
                className="max-h-36 min-h-11 resize-none border-0 bg-transparent focus-visible:ring-0"
                placeholder="Ask your coach about food, fitness, budget, or habits"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} className="rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
