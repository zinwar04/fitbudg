"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, Barcode, Check, Database, Loader2, PackageSearch, Search, Wheat } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FoodLibraryItem } from "@/lib/db/schema";
import { searchExternalFoods } from "@/lib/db/external-food.service";
import {
  FoodSearchMode,
  NormalizedExternalFood,
  dataQualityLabel,
  externalFoodKey,
  externalSourceLabel,
} from "@/lib/food/external";
import { useFoodStore } from "@/lib/store/food.store";
import { cn } from "@/lib/utils";
import { formatKcal, formatNumber, titleCase } from "@/lib/utils/formatting";

const searchModes: {
  value: FoodSearchMode;
  label: string;
  description: string;
  icon: typeof Search;
}[] = [
  { value: "all", label: "All", description: "Search USDA and packaged foods", icon: Database },
  { value: "usda", label: "USDA", description: "Search USDA for generic foods", icon: Wheat },
  { value: "packaged", label: "Packaged", description: "Search packaged foods", icon: PackageSearch },
  { value: "barcode", label: "Barcode", description: "Barcode lookup", icon: Barcode },
];

export function ExternalFoodSearch({ library }: { library: FoodLibraryItem[] }) {
  const importExternalFood = useFoodStore((state) => state.importExternalFood);
  const [mode, setMode] = useState<FoodSearchMode>("all");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<NormalizedExternalFood[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [localImportedKeys, setLocalImportedKeys] = useState<Set<string>>(() => new Set());

  const libraryExternalKeys = useMemo(() => {
    return new Set(
      library
        .filter((food) => food.source && food.external_id)
        .map((food) => `${food.source}:${food.external_id}`),
    );
  }, [library]);

  const selectedMode = searchModes.find((item) => item.value === mode) ?? searchModes[0];
  const currentValue = mode === "barcode" ? barcode : query;
  const isOpenFoodFactsMode = mode === "all" || mode === "packaged" || mode === "barcode";

  const runSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = currentValue.trim();
    if (!trimmed) {
      setError(mode === "barcode" ? "Enter a barcode to look up." : "Enter a food name to search.");
      return;
    }
    if (mode !== "barcode" && trimmed.length < 2) {
      setError("Search with at least 2 characters.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setError(null);
    setWarnings([]);
    setResults([]);

    try {
      const response = await searchExternalFoods(mode, trimmed);
      setResults(response.foods);
      setWarnings(response.warnings);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Food search failed.");
    } finally {
      setLoading(false);
    }
  };

  const addToLibrary = async (food: NormalizedExternalFood) => {
    const key = externalFoodKey(food);
    setImportingKey(key);
    const result = await importExternalFood(food);
    setImportingKey(null);

    if (!result) return;
    setLocalImportedKeys((current) => new Set(current).add(key));
    toast.success(result.created ? "Added to your food library" : "Already in your library");
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Find foods</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Values are usually per 100 g. Nutrition data may vary by brand, recipe, and serving size.</p>
          </div>
          <Badge variant="outline" className="w-fit">
            External databases
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {searchModes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  setError(null);
                  setWarnings([]);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary",
                  mode === item.value && "border-primary bg-primary/5 text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={runSearch}>
          <div className="relative flex-1">
            {mode === "barcode" ? (
              <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            ) : (
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              className="pl-9"
              inputMode={mode === "barcode" ? "numeric" : "text"}
              value={mode === "barcode" ? barcode : query}
              onChange={(event) => (mode === "barcode" ? setBarcode(event.target.value) : setQuery(event.target.value))}
              placeholder={mode === "barcode" ? "Paste or type a barcode" : selectedMode.description}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {mode === "barcode" ? "Look Up" : "Search"}
          </Button>
        </form>

        {isOpenFoodFactsMode && (
          <p className="text-xs text-muted-foreground">Open Food Facts is community-provided. Verify the package label if needed.</p>
        )}

        {error && <InlineNotice tone="danger" message={error} />}
        {warnings.map((warning) => (
          <InlineNotice key={warning} tone="warning" message={warning} />
        ))}

        {loading && <SearchSkeleton />}

        {!loading && hasSearched && !error && results.length === 0 && (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            No foods found. Try a simpler name, a brand term, or a full barcode.
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {results.map((food) => {
              const key = externalFoodKey(food);
              const isImported = libraryExternalKeys.has(key) || localImportedKeys.has(key);
              const missingCalories = !food.caloriesPerServing || food.caloriesPerServing <= 0;
              return (
                <ExternalFoodResult
                  key={key}
                  food={food}
                  isImported={isImported}
                  missingCalories={missingCalories}
                  importing={importingKey === key}
                  onImport={() => void addToLibrary(food)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InlineNotice({ message, tone }: { message: string; tone: "warning" | "danger" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        tone === "danger" ? "border-destructive/40 bg-destructive/5 text-destructive" : "bg-muted/30 text-muted-foreground",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((__, metricIndex) => (
              <div key={metricIndex} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExternalFoodResult({
  food,
  isImported,
  missingCalories,
  importing,
  onImport,
}: {
  food: NormalizedExternalFood;
  isImported: boolean;
  missingCalories: boolean;
  importing: boolean;
  onImport: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-semibold leading-snug">{food.name}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{food.brand ?? titleCase(food.category)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={food.source === "usda" ? "default" : "secondary"}>{externalSourceLabel(food.source)}</Badge>
          <Badge variant={food.data_quality === "limited" ? "outline" : "secondary"}>{dataQualityLabel(food.data_quality)}</Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <NutritionMetric label="Calories" value={formatKcal(food.caloriesPerServing)} />
        <NutritionMetric label="Protein" value={formatGrams(food.protein)} />
        <NutritionMetric label="Carbs" value={formatGrams(food.carbs)} />
        <NutritionMetric label="Fat" value={formatGrams(food.fat)} />
        <NutritionMetric label="Fiber" value={formatGrams(food.fiber)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-1">per 100 g</span>
        <span className="rounded-full border px-2 py-1">{titleCase(food.category)}</span>
      </div>

      {food.notes && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{food.notes}</p>}
      {missingCalories && <p className="mt-3 text-xs text-destructive">Calories are missing, so this item cannot be imported yet.</p>}

      <Button className="mt-4 w-full" disabled={isImported || missingCalories || importing} onClick={onImport}>
        {importing && <Loader2 className="h-4 w-4 animate-spin" />}
        {isImported && <Check className="h-4 w-4" />}
        {isImported ? "In library" : importing ? "Adding..." : "Add to Library"}
      </Button>
    </div>
  );
}

function NutritionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold data-number">{value}</p>
    </div>
  );
}

function formatGrams(value: number | null) {
  return value === null ? "--" : `${formatNumber(value, 1)} g`;
}
