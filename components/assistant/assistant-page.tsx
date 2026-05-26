"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, KeyRound, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { buildAssistantContext } from "@/lib/assistant/context";
import { ChatMessage } from "@/lib/db/schema";
import { getAssistantSessions, saveAssistantSession } from "@/lib/db/assistant.service";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { createId, nowIso } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

const promptGroups = {
  Fitness: [
    "How are my calories this week?",
    "Am I on track to reach my goal?",
    "What's my protein average?",
    "Suggest a high-protein snack under 300 kcal.",
    "Should I adjust my calorie target?",
  ],
  Budget: [
    "How's my budget looking this month?",
    "Where am I overspending?",
    "How much can I safely spend today?",
    "Compare my spending to last month.",
    "What's my biggest budget category?",
  ],
  Combined: [
    "Help me eat high-protein on a low budget.",
    "Find patterns between my eating and spending.",
    "Suggest a cheap meal plan based on my food library.",
    "How are my fitness and budget habits connected?",
    "Give me a weekly review of my health and finances.",
  ],
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<keyof typeof promptGroups>("Fitness");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("OpenAI");
  const [model, setModel] = useState("gpt-4o-mini");
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

  useEffect(() => {
    setApiKey(localStorage.getItem("fitbudget.ai.apiKey") ?? "");
    setProvider(localStorage.getItem("fitbudget.ai.provider") ?? "OpenAI");
    setModel(localStorage.getItem("fitbudget.ai.model") ?? "gpt-4o-mini");
    getAssistantSessions().then((sessions) => {
      const latest = sessions[0];
      if (latest) {
        setSessionId(latest.id);
        setMessages(latest.messages);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const persist = async (nextMessages: ChatMessage[]) => {
    const title = nextMessages.find((message) => message.role === "user")?.content.slice(0, 42) || "FitBudget chat";
    const saved = await saveAssistantSession({ id: sessionId ?? undefined, title, messages: nextMessages });
    setSessionId(saved.id);
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
    } finally {
      setLoading(false);
    }
  };

  const saveLocalAiSettings = () => {
    localStorage.setItem("fitbudget.ai.apiKey", apiKey);
    localStorage.setItem("fitbudget.ai.provider", provider);
    localStorage.setItem("fitbudget.ai.model", model);
  };

  const testConnection = () => {
    saveLocalAiSettings();
    setInput("Test my assistant connection and summarize my current data.");
  };

  return (
    <>
      <PageHeader title="AI Lifestyle Assistant" description="A coach-style chat interface grounded in your local FitBudget data." />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="flex min-h-[72vh] flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> FitBudget Coach
              <Badge variant="secondary">Offline mock fallback</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="border-b p-3">
              <div className="mb-3 flex gap-2">
                {(Object.keys(promptGroups) as (keyof typeof promptGroups)[]).map((group) => (
                  <Button key={group} size="sm" variant={mode === group ? "default" : "outline"} onClick={() => setMode(group)}>
                    {group}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {promptGroups[mode].map((prompt) => (
                  <Button key={prompt} size="sm" variant="secondary" className="shrink-0" onClick={() => setInput(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="rounded-xl border bg-muted/30 p-5">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">Ask about your week</h3>
                  <p className="mt-1 text-sm text-muted-foreground">The assistant can see a compact summary of calories, budget pace, top foods, and habit streaks.</p>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[82%] rounded-xl px-4 py-3 text-sm", message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card")}>
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">Typing...</div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            <form
              className="border-t p-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="flex items-end gap-2">
                <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-12 resize-none" placeholder="Ask about calories, budget, habits, or patterns" />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> AI Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Provider</label>
                <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={provider} onChange={(event) => setProvider(event.target.value)}>
                  <option>OpenAI</option>
                  <option>Anthropic Claude</option>
                  <option>Custom endpoint</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Model</label>
                <Input value={model} onChange={(event) => setModel(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">API key</label>
                <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Stored only on this device" />
              </div>
              <Button className="w-full" variant="outline" onClick={testConnection}>Test Connection</Button>
              <p className="text-xs text-muted-foreground">
                Your local key is stored only in this browser. Server-side real AI responses use OPENAI_API_KEY from the app environment.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Average calories: <span className="data-number">{context.last7Days.averageCalories} kcal</span></p>
              <p>Budget spent: <span className="data-number">{context.budgetStatus.spent.toLocaleString("en-US")} {context.budgetStatus.currency}</span></p>
              <p>Habit completion: <span className="data-number">{context.habits.completionRateThisWeek}%</span></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

