import { useContext } from "react";
import { CurrencyPreferencesContext } from "../providers/currency-preferences-provider";

export function useCurrencyPreferences() {
  return useContext(CurrencyPreferencesContext);
}

