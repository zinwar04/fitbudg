import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleCors } from "../_shared/cors.ts";
import { HttpError, errorResponse, fetchJson, jsonResponse, readJsonBody, requireString } from "../_shared/http.ts";
import { normalizeUsdaFood } from "../_shared/normalizeUsda.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      throw new HttpError("Only POST requests are supported.", 405);
    }

    const body = await readJsonBody(req);
    const query = requireString((body as Record<string, unknown>).query, "query", 2);
    const apiKey = Deno.env.get("USDA_FDC_API_KEY");

    if (!apiKey) {
      throw new HttpError("USDA search is not configured. Add USDA_FDC_API_KEY as a Supabase Edge Function secret.", 503);
    }

    const payload = await fetchJson(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query,
          pageSize: 20,
          dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        }),
      },
      "USDA FoodData Central",
    ) as { foods?: unknown[] };

    const foods = (payload.foods ?? [])
      .map(normalizeUsdaFood)
      .filter((food) => food !== null)
      .slice(0, 20);

    return jsonResponse({ foods });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("USDA FoodData Central search failed.", 500);
  }
});
