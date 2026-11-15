import type { DbContext } from "@/infrastructure/database/client";
import { listLabels } from "../repositories/labels.repository";
import { createLabel } from "./create-label.service";

export function resolveImportLabels(names: string[], context: DbContext): string[] {
  const existing = listLabels({ includeArchived: true }, context);
  const resolved = new Map(existing.map((label) => [label.name.toLowerCase(), label.id]));
  return [...new Set(names.map((name) => {
    const key = name.trim().toLowerCase();
    const id = resolved.get(key) ?? createLabel({ name }, context).id;
    resolved.set(key, id);
    return id;
  }))];
}
