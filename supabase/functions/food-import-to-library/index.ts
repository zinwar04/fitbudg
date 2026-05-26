import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { handleCors } from "../_shared/cors.ts";
import { HttpError, errorResponse, jsonResponse, readJsonBody } from "../_shared/http.ts";
import {
  NormalizedExternalFood,
  externalFoodSources,
  foodCategories,
  foodDataQualities,
  hasPositiveCalories,
} from "../_shared/foodTypes.ts";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function stripUserId(row: AnyRecord) {
  const { user_id: _userId, ...rest } = row;
  return rest;
}

function validateFood(value: unknown): NormalizedExternalFood {
  if (!isRecord(value)) {
    throw new HttpError("food must be an object.", 400);
  }

  const name = stringValue(value.name);
  const caloriesPerServing = numberValue(value.caloriesPerServing);
  const servingSize = numberValue(value.servingSize);
  const servingUnit = stringValue(value.servingUnit);
  const source = value.source;
  const externalId = stringValue(value.external_id);
  const category = value.category;
  const dataQuality = value.data_quality;

  if (!name) throw new HttpError("Food name is required.", 400);
  if (!hasPositiveCalories(caloriesPerServing)) {
    throw new HttpError("Calories are required before importing this food.", 400);
  }
  if (!servingSize || servingSize <= 0 || !servingUnit) {
    throw new HttpError("Serving size and unit are required.", 400);
  }
  if (!isOneOf(source, externalFoodSources)) {
    throw new HttpError("Food source must be usda or open_food_facts.", 400);
  }
  if (!externalId) throw new HttpError("External food id is required.", 400);
  if (!isOneOf(category, foodCategories)) {
    throw new HttpError("Food category is invalid.", 400);
  }
  if (!isOneOf(dataQuality, foodDataQualities)) {
    throw new HttpError("Food data quality is invalid.", 400);
  }

  return {
    name,
    brand: stringValue(value.brand) || null,
    caloriesPerServing,
    servingSize,
    servingUnit,
    protein: numberValue(value.protein),
    carbs: numberValue(value.carbs),
    fat: numberValue(value.fat),
    fiber: numberValue(value.fiber),
    category,
    isFavorite: false,
    notes: stringValue(value.notes),
    source,
    external_id: externalId,
    source_url: stringValue(value.source_url) || null,
    data_quality: dataQuality,
    raw_external_data: value.raw_external_data ?? null,
  };
}

async function findExisting(
  supabase: ReturnType<typeof createClient>,
  source: NormalizedExternalFood["source"],
  externalId: string,
) {
  const { data, error } = await supabase
    .from("food_library_items")
    .select("*")
    .eq("source", source)
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) throw error;
  return data as AnyRecord | null;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      throw new HttpError("Only POST requests are supported.", 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey) {
      throw new HttpError("Supabase Edge Function environment is missing SUPABASE_URL or SUPABASE_ANON_KEY.", 500);
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new HttpError("You need to be signed in to import foods.", 401);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!auth.user) throw new HttpError("You need to be signed in to import foods.", 401);

    const body = await readJsonBody(req);
    const food = validateFood((body as AnyRecord).food);
    const existing = await findExisting(supabase, food.source, food.external_id);
    if (existing) {
      return jsonResponse({ item: stripUserId(existing), created: false });
    }

    const timestamp = new Date().toISOString();
    const record = {
      user_id: auth.user.id,
      id: crypto.randomUUID(),
      name: food.name,
      brand: food.brand,
      caloriesPerServing: food.caloriesPerServing,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      category: food.category,
      isFavorite: false,
      useCount: 0,
      lastUsedAt: null,
      notes: food.notes,
      source: food.source,
      external_id: food.external_id,
      source_url: food.source_url,
      data_quality: food.data_quality,
      raw_external_data: food.raw_external_data,
      verified_at: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await supabase.from("food_library_items").insert(record).select("*").single();
    if (error) {
      if (error.code === "23505") {
        const duplicate = await findExisting(supabase, food.source, food.external_id);
        if (duplicate) return jsonResponse({ item: stripUserId(duplicate), created: false });
      }
      throw error;
    }

    return jsonResponse({ item: stripUserId(data as AnyRecord), created: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Food import failed.", 500);
  }
});
