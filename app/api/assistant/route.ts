import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AssistantContext, buildSystemPrompt } from "@/lib/assistant/context";

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
      return jsonError("Please sign in again before using FitBudget Coach.", 401);
    }

    const body = (await req.json()) as { messages?: unknown; context?: AssistantContext };
    const messages = Array.isArray(body.messages) ? body.messages.filter(isRequestMessage) : [];
    const context = body.context;

    if (!context || messages.length === 0) {
      return jsonError("Missing messages or account context.", 400);
    }

    if (JSON.stringify(context).length > 120_000) {
      return jsonError("The assistant context is too large. Please try again after reducing imported data.", 413);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.AI_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

    if (!apiKey) {
      return jsonError("Gemini is not configured for this app yet. Add GEMINI_API_KEY on the server to enable FitBudget Coach.", 503);
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
          temperature: 0.45,
          topP: 0.9,
          maxOutputTokens: 1800,
          responseMimeType: "text/plain",
        },
      }),
    });

    if (!response.ok) {
      return jsonError("Gemini could not generate a coach response right now. Please try again in a moment.", 502);
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!content) {
      return jsonError("Gemini returned an empty response. Please try a more specific question.", 502);
    }

    return NextResponse.json({ content });
  } catch {
    return jsonError("Assistant request failed.", 500);
  }
}
