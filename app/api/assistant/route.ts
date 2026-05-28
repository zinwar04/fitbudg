import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AssistantContext, buildSystemPrompt } from "@/lib/assistant/context";

export const runtime = "nodejs";

const ASSISTANT_MODEL = "gemini-2.5-flash";
const MAX_CONTEXT_CHARS = 650_000;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 8_000;

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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function toGeminiMessage(message: RequestMessage) {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content.slice(0, MAX_MESSAGE_CHARS) }],
  };
}

async function isAuthorizedAssistantRequest(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return true;

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

export async function POST(req: Request) {
  try {
    const authorized = await isAuthorizedAssistantRequest(req);
    if (!authorized) {
      return jsonError("Please sign in again before using the assistant.", 401);
    }

    const body = (await req.json()) as { messages?: unknown; context?: AssistantContext };
    const messages = Array.isArray(body.messages) ? body.messages.filter(isRequestMessage).slice(-MAX_MESSAGES) : [];
    const context = body.context;

    if (!context || messages.length === 0) {
      return jsonError("Missing messages or account context.", 400);
    }

    if (JSON.stringify(context).length > MAX_CONTEXT_CHARS) {
      return jsonError("The assistant context is too large. Please try again after reducing imported data.", 413);
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonError("The assistant is not configured on the server yet.", 503);
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ASSISTANT_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(context) }],
        },
        contents: messages.map(toGeminiMessage),
        generationConfig: {
          temperature: 0.35,
          topP: 0.95,
          maxOutputTokens: 2400,
          responseMimeType: "text/plain",
          thinkingConfig: {
            thinkingBudget: -1,
          },
        },
      }),
    });

    if (!response.ok) {
      return jsonError("I could not generate a response right now. Please try again in a moment.", 502);
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!content) {
      return jsonError("I got an empty response. Please try a more specific question.", 502);
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Assistant request failed", error);
    return jsonError("Assistant request failed.", 500);
  }
}
