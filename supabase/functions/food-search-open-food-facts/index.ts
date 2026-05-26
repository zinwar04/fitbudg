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
    const query = requireString((body as Record<string, unknown>).query, "query", 2);
    const contactEmail = Deno.env.get("APP_CONTACT_EMAIL");

    if (!contactEmail) {
      throw new HttpError("Open Food Facts search is not configured. Add APP_CONTACT_EMAIL as a Supabase Edge Function secret.", 503);
    }

    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "20",
      fields,
    });
    const payload = await fetchJson(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": openFoodFactsUserAgent(contactEmail),
        },
      },
      "Open Food Facts",
    ) as { products?: unknown[] };

    const foods = (payload.products ?? [])
      .map((product) => normalizeOpenFoodFactsProduct(product))
      .filter((food) => food !== null)
      .slice(0, 20);

    return jsonResponse({ foods });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Open Food Facts search failed.", 500);
  }
});
