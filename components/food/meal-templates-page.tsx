"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, Edit, FileUp, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { MealTemplate, MealTemplateItem, MealType } from "@/lib/db/schema";
import { useFoodStore } from "@/lib/store/food.store";
import { formatKcal, localDateKey, titleCase } from "@/lib/utils/formatting";
import { mealTypes } from "@/lib/utils/constants";
import { downloadTextFile, mealTemplatesToCsv, parseMealTemplateRows, readSpreadsheetRows } from "@/lib/utils/import-export";

type SortOption = "used" | "recent" | "name";

export function MealTemplatesPage() {
  const templates = useFoodStore((state) => state.mealTemplates);
  const library = useFoodStore((state) => state.library);
  const addTemplate = useFoodStore((state) => state.addTemplate);
  const updateTemplate = useFoodStore((state) => state.updateTemplate);
  const importTemplates = useFoodStore((state) => state.importTemplates);
  const deleteTemplate = useFoodStore((state) => state.deleteTemplate);
  const addTemplateToLog = useFoodStore((state) => state.addTemplateToLog);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("used");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MealTemplate | null>(null);
  const [useTemplate, setUseTemplate] = useState<MealTemplate | null>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...templates]
      .filter((template) => (!normalized ? true : template.name.toLowerCase().includes(normalized)))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
        return b.useCount - a.useCount;
      });
  }, [query, sort, templates]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const exportTemplates = () => {
    downloadTextFile("fitbudget-meal-templates.csv", mealTemplatesToCsv(templates));
  };

  const importTemplateFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = await readSpreadsheetRows(file);
      const imported = parseMealTemplateRows(rows);
      if (imported.length === 0) {
        toast.error("No valid templates found. Include template and ingredient columns.");
        return;
      }
      await importTemplates(imported);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Meal template import failed.");
    }
  };

  return (
    <>
      <PageHeader
        title="Meal Templates"
        description="Build reusable meals and add all ingredients to your diary in one action."
        action={
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importTemplateFile} />
            <Button variant="outline" onClick={exportTemplates}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Import
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </div>
        }
      />
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" />
          </div>
          <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm sm:w-auto" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="used">Most Used</option>
            <option value="recent">Recently Added</option>
            <option value="name">Name</option>
          </select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No meal templates yet" description="Create a meal you eat often and future logging becomes a one-tap action." action={<Button onClick={openCreate}>Create Template</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-3">
                  <span>{template.name}</span>
                  <Badge variant="secondary">{template.items.length} ingredients</Badge>
                </CardTitle>
                {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold data-number">{formatKcal(template.totalCalories)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">P {template.totalProtein}g</Badge>
                  <Badge variant="secondary">C {template.totalCarbs}g</Badge>
                  <Badge variant="secondary">F {template.totalFat}g</Badge>
                  <Badge variant="outline">{template.useCount} uses</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setUseTemplate(template)}>Add to Today</Button>
                  <Button variant="outline" size="icon" onClick={() => { setEditing(template); setDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => deleteTemplate(template.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        library={library}
        onSave={async (name, description, items) => {
          const payload = { name, description, items, isFavorite: editing?.isFavorite ?? false };
          if (editing) await updateTemplate(editing.id, payload);
          else await addTemplate(payload);
          setDialogOpen(false);
        }}
      />
      <Dialog open={Boolean(useTemplate)} onOpenChange={(open) => (!open ? setUseTemplate(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {useTemplate?.name} to today</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Meal type</label>
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>
              {mealTypes.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseTemplate(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (useTemplate) await addTemplateToLog(useTemplate.id, localDateKey(), mealType);
                setUseTemplate(null);
              }}
            >
              Add Meal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  library,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MealTemplate | null;
  library: ReturnType<typeof useFoodStore.getState>["library"];
  onSave: (name: string, description: string, items: MealTemplateItem[]) => Promise<void>;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [items, setItems] = useState<MealTemplateItem[]>(template?.items ?? []);
  const [search, setSearch] = useState("");
  const filteredLibrary = library.filter((food) => food.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  const totals = items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + (item.protein ?? 0),
      carbs: total.carbs + (item.carbs ?? 0),
      fat: total.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const addItem = (foodId: string) => {
    const food = library.find((item) => item.id === foodId);
    if (!food) return;
    setItems((current) => [
      ...current,
      {
        foodLibraryId: food.id,
        name: food.name,
        quantity: 1,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.caloriesPerServing,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      },
    ]);
  };

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "Create template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name" />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-sm font-medium">Add ingredients</p>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food library" />
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                {filteredLibrary.map((food) => (
                  <button key={food.id} type="button" onClick={() => addItem(food.id)} className="flex w-full items-center justify-between rounded-lg border p-2 text-left hover:border-primary">
                    <span className="text-sm">{food.name}</span>
                    <span className="text-xs text-muted-foreground">{formatKcal(food.caloriesPerServing)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-sm font-medium">Running total</p>
              <p className="mt-1 text-2xl font-semibold data-number">{formatKcal(totals.calories)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">P {Math.round(totals.protein)}g</Badge>
                <Badge variant="secondary">C {Math.round(totals.carbs)}g</Badge>
                <Badge variant="secondary">F {Math.round(totals.fat)}g</Badge>
              </div>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {items.map((item, index) => (
                <div key={`${item.foodLibraryId}-${index}`} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatKcal(item.calories)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => move(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => move(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="mt-2"
                    type="number"
                    step="0.25"
                    value={item.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      setItems((current) =>
                        current.map((currentItem, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...currentItem,
                                quantity,
                                calories: Math.round((currentItem.calories / currentItem.quantity) * quantity),
                                protein: currentItem.protein ? Math.round((currentItem.protein / currentItem.quantity) * quantity) : undefined,
                                carbs: currentItem.carbs ? Math.round((currentItem.carbs / currentItem.quantity) * quantity) : undefined,
                                fat: currentItem.fat ? Math.round((currentItem.fat / currentItem.quantity) * quantity) : undefined,
                              }
                            : currentItem,
                        ),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || items.length === 0} onClick={() => onSave(name, description, items)}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
