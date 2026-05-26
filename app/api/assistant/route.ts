import { NextResponse } from "next/server";
import { AssistantContext, buildSystemPrompt, mockAssistantResponse } from "@/lib/assistant/context";

interface RequestMessage {
  role: "user" | "assistant";
  content: string;
}

function isRequestMessage(value: unknown): value is RequestMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    "content" in value &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: unknown; context?: AssistantContext };
    const messages = Array.isArray(body.messages) ? body.messages.filter(isRequestMessage) : [];
    const context = body.context;

    if (!context || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages or context." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ content: mockAssistantResponse(messages, context) });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: buildSystemPrompt(context) }, ...messages],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ content: mockAssistantResponse(messages, context), warning: "AI provider request failed, returned mock response." });
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? mockAssistantResponse(messages, context);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "Assistant request failed." }, { status: 500 });
  }
}

