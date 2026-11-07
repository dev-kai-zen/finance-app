import { db, type DbContext } from "@/infrastructure/database/client";
import { listAccountTypes } from "../repositories/account-types.repository";
import type { AccountType } from "../types/account.types";

export function getAccountTypes(context: DbContext = db): AccountType[] {
  return listAccountTypes(context);
}

