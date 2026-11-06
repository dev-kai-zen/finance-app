import { db, type DbContext } from "@/infrastructure/database/client";
import { listCurrencies } from "../repositories/currencies.repository";

export function getImportCurrencies(context: DbContext = db): string[] {
  return listCurrencies(context).map((c) => c.code);
}
