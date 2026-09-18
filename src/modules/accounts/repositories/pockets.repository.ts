import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { pocketMovements, pockets } from "@/infrastructure/database/schema";
import type {
  NewPocket,
  NewPocketMovement,
  Pocket,
  PocketMovement,
} from "@/modules/accounts/types/account.types";

export function listPockets(context: DbContext = db): Pocket[] {
  return context.select().from(pockets)
    .orderBy(asc(pockets.accountId), asc(pockets.sortOrder), asc(pockets.name)).all();
}

export function listPocketsForAccount(accountId: string, context: DbContext = db): Pocket[] {
  return context.select().from(pockets).where(eq(pockets.accountId, accountId))
    .orderBy(asc(pockets.sortOrder), asc(pockets.name), asc(pockets.id)).all();
}

export function findPocketById(id: string, context: DbContext = db): Pocket | null {
  return context.select().from(pockets).where(eq(pockets.id, id)).get() ?? null;
}

export function findPocketByName(
  accountId: string,
  name: string,
  excludingId?: string,
  context: DbContext = db,
): Pocket | null {
  const conditions = [
    eq(pockets.accountId, accountId),
    sql`lower(${pockets.name}) = ${name.trim().toLowerCase()}`,
  ];
  if (excludingId) conditions.push(ne(pockets.id, excludingId));
  return context.select().from(pockets).where(and(...conditions)).get() ?? null;
}

export function insertPocket(value: NewPocket, context: DbContext = db): void {
  context.insert(pockets).values(value).run();
}

export function updatePocketRecord(
  id: string,
  values: Partial<Omit<NewPocket, "id" | "accountId" | "createdAt">>,
  context: DbContext = db,
): void {
  context.update(pockets).set(values).where(eq(pockets.id, id)).run();
}

export function insertPocketMovement(
  value: NewPocketMovement,
  context: DbContext = db,
): PocketMovement {
  context.insert(pocketMovements).values(value).run();
  return value as PocketMovement;
}

export function listPocketMovementsForAccount(
  accountId: string,
  context: DbContext = db,
): PocketMovement[] {
  return context.select().from(pocketMovements)
    .where(eq(pocketMovements.accountId, accountId))
    .orderBy(asc(pocketMovements.occurredAt), asc(pocketMovements.createdAt)).all();
}

export function getPocketMovementBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = context.select().from(pocketMovements).all();
  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.fromPocketId) {
      deltas[row.fromPocketId] = (deltas[row.fromPocketId] ?? 0) - row.amountMinorUnits;
    }
    if (row.toPocketId) {
      deltas[row.toPocketId] = (deltas[row.toPocketId] ?? 0) + row.amountMinorUnits;
    }
  }
  return deltas;
}

export function newPocketRecordId(context: DbContext = db): string {
  return context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;
}
