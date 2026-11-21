import { db, type DbContext } from "@/infrastructure/database/client";
import { hasAnyCategories } from "../repositories/categories.repository";
import { prepareWorkspaceCategories } from "./prepare-workspace-categories.service";

/** Explicit initialization only; ordinary category reads never create defaults. */
export function seedDefaultCategoriesIfEmpty(context: DbContext = db): void {
  if (hasAnyCategories(context)) return;
  context.transaction((tx) => {
    prepareWorkspaceCategories("recommended", tx);
  });
}
