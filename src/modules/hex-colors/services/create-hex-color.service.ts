import { db } from "@/infrastructure/database/client";
import {
  findHexColorByHex,
  insertHexColor,
} from "../repositories/hex-colors.repository";
import type { HexColor, HexColorInput } from "../types/hex-color.types";

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

export function validateHexCode(hex: string): string {
  const trimmed = hex.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_REGEX.test(withHash)) {
    throw new Error("Invalid hex color format. Use #RRGGBB (e.g. #2563EB).");
  }
  return withHash.toUpperCase();
}

export function createHexColor(input: HexColorInput): HexColor {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Color name is required.");
  }
  if (name.length > 50) {
    throw new Error("Color name must be at most 50 characters.");
  }

  const hex = validateHexCode(input.hex);

  const existing = findHexColorByHex(hex);
  if (existing) {
    throw new Error(`Color ${hex} already exists as "${existing.name}".`);
  }

  return insertHexColor({
    name,
    hex,
    isSystem: false,
  });
}
