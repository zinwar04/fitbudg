import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleCors } from "../_shared/cors.ts";
import { HttpError, errorResponse, fetchJson, jsonResponse, readJsonBody, requireString } from "../_shared/http.ts";
import { normalizeOpenFoodFactsProduct, openFoodFactsUserAgent } from "../_shared/normalizeOpenFoodFacts.ts";

const fields = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "nutriments",
  "serving_size",
  "url",
  "categories",
  "categories_tags",
  "food_groups_tags",
].join(",");

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      throw new HttpError("Only POST requests are supported.", 405);
    }

    const body = await readJsonBody(req);
    const barcode = requireString((body as Record<string, unknown>).barcode, "barcode", 4).replace(/\s+/g, "");

    if (!/^[0-9]{4,32}$/.test(barcode)) {
      throw new HttpError("Barcode must be 4 to 32 digits.", 400);
    }

    const contactEmail = Deno.env.get("APP_CONTACT_EMAIL");
    if (!contactEmail) {
      throw new HttpError("Open Food Facts barcode lookup is not configured. Add APP_CONTACT_EMAIL as a Supabase Edge Function secret.", 503);
    }

    const payload = await fetchJson(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": openFoodFactsUserAgent(contactEmail),
        },
      },
      "Open Food Facts",
    ) as { status?: number; product?: unknown };

    if (payload.status !== 1 || !payload.product) {
      return jsonResponse({ food: null, error: "Product not found" });
    }

    const food = normalizeOpenFoodFactsProduct(payload.product, barcode);
    return jsonResponse(food ? { food } : { food: null, error: "Product not found" });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Open Food Facts barcode lookup failed.", 500);
  }
});
