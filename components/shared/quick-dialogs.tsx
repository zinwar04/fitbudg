"use client";

import { FoodEntryDialog, HabitDialog, TransactionDialog, WeightDialog } from "@/components/shared/entity-dialogs";
import { useUiStore } from "@/lib/store/ui.store";

export function QuickDialogHost() {
  const dialog = useUiStore((state) => state.quickDialog);
  const closeDialog = useUiStore((state) => state.closeDialog);

  return (
    <>
      <FoodEntryDialog open={dialog === "food"} onOpenChange={(open) => (!open ? closeDialog() : undefined)} />
      <TransactionDialog open={dialog === "transaction"} onOpenChange={(open) => (!open ? closeDialog() : undefined)} />
      <HabitDialog open={dialog === "habit"} onOpenChange={(open) => (!open ? closeDialog() : undefined)} />
      <WeightDialog open={dialog === "weight"} onOpenChange={(open) => (!open ? closeDialog() : undefined)} />
    </>
  );
}

