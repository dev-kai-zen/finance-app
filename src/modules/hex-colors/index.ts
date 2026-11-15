import { deferComponent } from "@/utils/deferred-module";

export { HexColorsProvider } from "./providers/hex-colors-provider";
export { useHexColors } from "./hooks/use-hex-colors";
export { useResolveEntityColor } from "./hooks/use-resolve-entity-color";
export { resolveHexColor } from "./utils/resolve-hex-color";
export { createHexColor } from "./services/create-hex-color.service";
export { updateHexColor } from "./services/update-hex-color.service";
export { deleteHexColor } from "./services/delete-hex-color.service";
export const HexColorsModal = deferComponent(
  () => require("./components/hex-colors-modal").HexColorsModal,
  "HexColorsModal",
) as typeof import("./components/hex-colors-modal").HexColorsModal;
export const HexColorFormModal = deferComponent(
  () => require("./components/hex-color-form-modal").HexColorFormModal,
  "HexColorFormModal",
) as typeof import("./components/hex-color-form-modal").HexColorFormModal;
export {
  listHexColors,
  findHexColorById,
  findHexColorByHex,
  countHexColorUsages,
} from "./repositories/hex-colors.repository";
export type {
  HexColor,
  HexColorInput,
  HexColorUsageCount,
  NewHexColor,
} from "./types/hex-color.types";
