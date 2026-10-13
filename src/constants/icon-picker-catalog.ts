import type { IconItem } from "@/constants/icon-library";
import { CURATED_ICON_LIBRARY } from "@/constants/icon-library";
import { LUCIDE_ICON_CATALOG } from "@/constants/lucide-icon-catalog.generated";

export type IconPickerScope = "recommended" | "all";

const LUCIDE_PICKER_CATEGORY = "lucide";

let cachedAllIcons: IconItem[] | null = null;

function buildAllIconPickerItems(): IconItem[] {
  const curatedByName = new Map(
    CURATED_ICON_LIBRARY.map((item) => [item.name, item] as const),
  );
  const merged = new Map<string, IconItem>();

  for (const entry of LUCIDE_ICON_CATALOG) {
    const curated = curatedByName.get(entry.name);
    merged.set(
      entry.name,
      curated ?? {
        name: entry.name,
        label: entry.label,
        category: LUCIDE_PICKER_CATEGORY,
        keywords: [...entry.keywords],
      },
    );
  }

  for (const item of CURATED_ICON_LIBRARY) {
    if (!merged.has(item.name)) {
      merged.set(item.name, item);
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function getIconPickerItems(scope: IconPickerScope): IconItem[] {
  if (scope === "recommended") {
    return CURATED_ICON_LIBRARY;
  }
  if (!cachedAllIcons) {
    cachedAllIcons = buildAllIconPickerItems();
  }
  return cachedAllIcons;
}

export function matchesIconSearch(item: IconItem, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.label.toLowerCase().includes(q)) return true;
  return item.keywords.some((keyword) => keyword.toLowerCase().includes(q));
}
