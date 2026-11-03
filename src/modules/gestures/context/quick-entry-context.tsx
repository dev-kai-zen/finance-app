import React, { createContext, useContext, type PropsWithChildren } from "react";
import type { QuickEntryContextValue } from "../types/gestures.types";

const QuickEntryContext = createContext<QuickEntryContextValue | null>(null);

export function useQuickEntry(): QuickEntryContextValue {
  const context = useContext(QuickEntryContext);
  if (!context) {
    throw new Error("useQuickEntry must be used within a QuickEntryProvider");
  }
  return context;
}

export { QuickEntryContext };

