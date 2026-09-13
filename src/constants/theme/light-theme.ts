import { palette } from "./palette";
import type { AppTheme } from "./theme.types";

export const lightTheme: AppTheme = {
  id: "kaizen-light",
  name: "Kaizen Light",
  mode: "light",
  colors: {
    background: palette.gray[50],
    surface: palette.white,
    surfaceMuted: palette.gray[100],
    surfaceElevated: palette.white,
    surfaceInverse: palette.brand.forestDark,
    surfaceInverseElevated: palette.brand.forestMedium,

    textPrimary: palette.gray[900],
    textSecondary: palette.gray[700],
    textMuted: palette.gray[500],
    textInverse: palette.white,
    textInverseMuted: palette.brand.forestMuted,

    border: palette.gray[200],
    borderStrong: palette.gray[400],

    primary: palette.brand.forestDark,
    onPrimary: palette.brand.lime,
    accent: palette.brand.lime,
    onAccent: palette.brand.forestDark,

    success: palette.status.success,
    warning: palette.status.warning,
    danger: palette.status.danger,
    info: palette.status.info,

    overlay: palette.overlay,

    categorical: { ...palette.categorical },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 9999,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 15,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 22,
      title: 24,
      display: 32,
    },
    lineHeight: {
      xs: 16,
      sm: 20,
      md: 22,
      base: 24,
      lg: 26,
      xl: 28,
      xxl: 30,
      title: 32,
      display: 40,
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },
  shadows: {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    modal: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
