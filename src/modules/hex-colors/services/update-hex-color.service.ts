import {
  findHexColorById,
  findHexColorByHex,
  updateHexColorRecord,
} from "../repositories/hex-colors.repository";
import { validateHexCode } from "./create-hex-color.service";
import type { HexColorInput } from "../types/hex-color.types";

export function updateHexColor(id: string, input: Partial<HexColorInput>): void {
  const existing = findHexColorById(id);
  if (!existing) {
    throw new Error(`Color not found: ${id}`);
  }

  if (existing.isSystem) {
    throw new Error("System colors cannot be modified or deleted.");
  }

  const patch: Partial<HexColorInput> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("Color name cannot be empty.");
    }
    if (trimmedName.length > 50) {
      throw new Error("Color name must be at most 50 characters.");
    }
    patch.name = trimmedName;
  }

  if (input.hex !== undefined) {
    const validatedHex = validateHexCode(input.hex);
    const hexConflict = findHexColorByHex(validatedHex);
    if (hexConflict && hexConflict.id !== id) {
      throw new Error(
        `Color ${validatedHex} is already used by "${hexConflict.name}".`,
      );
    }
    patch.hex = validatedHex;
  }

  updateHexColorRecord(id, patch);
}
