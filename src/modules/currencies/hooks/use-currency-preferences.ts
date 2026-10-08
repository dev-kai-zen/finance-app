import React from "react";
import { CurrencyPreferencesContext } from "../providers/currency-preferences-provider";

export function useCurrencyPreferences() {
  return React.use(CurrencyPreferencesContext);
}

