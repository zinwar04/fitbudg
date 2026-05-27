import { NextResponse } from "next/server";
import { AssistantContext, buildSystemPrompt, fallbackAssistantResponse } from "@/lib/assistant/context";

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

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.AI_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

    if (!apiKey) {
      return NextResponse.json({ content: fallbackAssistantResponse(messages, context) });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(context) }],
        },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1200,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ content: fallbackAssistantResponse(messages, context) });
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || fallbackAssistantResponse(messages, context);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "Assistant request failed." }, { status: 500 });
  }
}
