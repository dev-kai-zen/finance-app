import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteAllFundGroupRecords,
  deleteFundGroupRecord,
  findFundGroupById,
} from "@/modules/accounts/repositories/fund-groups.repository";

export function deleteFundGroup(id: string): void {
  db.transaction((tx) => {
    const existing = findFundGroupById(id, tx);
    if (!existing) throw new Error(`Fund Group not found: ${id}`);
    deleteFundGroupRecord(id, tx);
  });
}

export function clearFundGroupWorkspace(context: DbContext = db): void {
  deleteAllFundGroupRecords(context);
}
