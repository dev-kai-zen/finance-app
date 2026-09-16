import { db } from "@/infrastructure/database/client";
import {
  countHexColorUsages,
  deleteHexColorRecord,
  findHexColorById,
} from "../repositories/hex-colors.repository";

export function deleteHexColor(id: string): void {
  const existing = findHexColorById(id);
  if (!existing) {
    throw new Error(`Color not found: ${id}`);
  }

  if (existing.isSystem) {
    throw new Error("System colors cannot be modified or deleted.");
  }

  const usages = countHexColorUsages(id);
  if (usages.total > 0) {
    const parts: string[] = [];
    if (usages.accountTypes > 0) {
      parts.push(
        `${usages.accountTypes} account type${usages.accountTypes > 1 ? "s" : ""}`,
      );
    }
    if (usages.categories > 0) {
      parts.push(
        `${usages.categories} categor${usages.categories > 1 ? "ies" : "y"}`,
      );
    }
    throw new Error(
      `Cannot delete "${existing.name}". This color is currently used by ${parts.join(" and ")}.`,
    );
  }

  try {
    db.transaction((tx) => {
      deleteHexColorRecord(id, tx);
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("FOREIGN KEY") || error.message.includes("RESTRICT"))
    ) {
      throw new Error(
        `Cannot delete "${existing.name}" because it is currently in use.`,
      );
    }
    throw error;
  }
}
