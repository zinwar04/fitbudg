import { corsHeaders } from "./cors.ts";

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export async function readJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError("Request body must be valid JSON.", 400);
  }
}

export function requireString(value: unknown, field: string, minLength = 1) {
  if (typeof value !== "string") {
    throw new HttpError(`${field} must be a string.`, 400);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new HttpError(`${field} is too short.`, 400);
  }

  return trimmed;
}

export async function fetchJson(
  url: string,
  init: RequestInit,
  sourceName: string,
  timeoutMs = 9000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new HttpError(`${sourceName} is temporarily unavailable.`, 502);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(`${sourceName} timed out. Try again in a moment.`, 504);
    }
    throw new HttpError(`${sourceName} is temporarily unavailable.`, 502);
  } finally {
    clearTimeout(timeout);
  }
}
