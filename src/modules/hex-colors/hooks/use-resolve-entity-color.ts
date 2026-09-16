import { useCallback } from "react";
import { useAppTheme } from "@/hooks/use-app-theme";
import { resolveHexColor } from "../utils/resolve-hex-color";
import { useHexColors } from "./use-hex-colors";

export function useResolveEntityColor() {
  const theme = useAppTheme();
  const { colors } = useHexColors();

  return useCallback(
    (colorValue: string | null | undefined, fallback?: string) =>
      resolveHexColor(colorValue, {
        colors,
        theme,
        fallback: fallback ?? theme.colors.primary,
      }),
    [colors, theme],
  );
}
