import { asc, eq, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accountTypes, categories, hexColors } from "@/infrastructure/database/schema";
import type {
  HexColor,
  HexColorUsageCount,
  NewHexColor,
} from "../types/hex-color.types";

export function generateColorId(context: DbContext = db): string {
  return context.get<{ id: string }>(
    sql`SELECT 'color_' || lower(hex(randomblob(8))) AS id`,
  )!.id;
}

export function listHexColors(context: DbContext = db): HexColor[] {
  return context
    .select()
    .from(hexColors)
    .orderBy(asc(hexColors.name), asc(hexColors.id))
    .all();
}

export function findHexColorById(
  id: string,
  context: DbContext = db,
): HexColor | null {
  return (
    context.select().from(hexColors).where(eq(hexColors.id, id)).get() ?? null
  );
}

export function findHexColorByHex(
  hex: string,
  context: DbContext = db,
): HexColor | null {
  const normalized = hex.trim().toUpperCase();
  return (
    context
      .select()
      .from(hexColors)
      .where(sql`UPPER(${hexColors.hex}) = ${normalized}`)
      .get() ?? null
  );
}

export function insertHexColor(
  data: NewHexColor,
  context: DbContext = db,
): HexColor {
  const now = new Date();
  const id = data.id ?? generateColorId(context);
  const record: HexColor = {
    id,
    name: data.name.trim(),
    hex: data.hex.trim().toUpperCase(),
    isSystem: Boolean(data.isSystem),
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };

  context.insert(hexColors).values(record).run();
  return record;
}

export function updateHexColorRecord(
  id: string,
  values: Partial<Pick<NewHexColor, "name" | "hex">>,
  context: DbContext = db,
): void {
  const patch: Partial<typeof hexColors.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (values.name !== undefined) {
    patch.name = values.name.trim();
  }
  if (values.hex !== undefined) {
    patch.hex = values.hex.trim().toUpperCase();
  }

  context.update(hexColors).set(patch).where(eq(hexColors.id, id)).run();
}

export function deleteHexColorRecord(
  id: string,
  context: DbContext = db,
): void {
  context.delete(hexColors).where(eq(hexColors.id, id)).run();
}

export function countHexColorUsages(
  id: string,
  context: DbContext = db,
): HexColorUsageCount {
  const accountTypeCountRow = context
    .select({ count: sql<number>`count(*)` })
    .from(accountTypes)
    .where(eq(accountTypes.hexColorsId, id))
    .get();

  const categoryCountRow = context
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.hexColorsId, id))
    .get();

  const accountTypesCount = accountTypeCountRow?.count ?? 0;
  const categoriesCount = categoryCountRow?.count ?? 0;

  return {
    accountTypes: accountTypesCount,
    categories: categoriesCount,
    total: accountTypesCount + categoriesCount,
  };
}
