"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type QuickDialog = "food" | "transaction" | "habit" | "weight" | null;

interface UiState {
  sidebarCollapsed: boolean;
  quickDialog: QuickDialog;
  setSidebarCollapsed: (value: boolean) => void;
  openDialog: (dialog: Exclude<QuickDialog, null>) => void;
  closeDialog: () => void;
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    sidebarCollapsed: false,
    quickDialog: null,
    setSidebarCollapsed: (value) => {
      set((state) => {
        state.sidebarCollapsed = value;
      });
    },
    openDialog: (dialog) => {
      set((state) => {
        state.quickDialog = dialog;
      });
    },
    closeDialog: () => {
      set((state) => {
        state.quickDialog = null;
      });
    },
  })),
);

