import type {
  ThemeBorderRadius,
  ThemeShadows,
  ThemeSpacing,
  ThemeTypography,
} from "./theme.types";

export const themeSpacing: ThemeSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const themeBorderRadius: ThemeBorderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  round: 9999,
};

export const themeTypography: ThemeTypography = {
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
};

export const lightShadows: ThemeShadows = {
  none: { boxShadow: "none" },
  card: { boxShadow: "0 1px 3px rgba(19, 31, 25, 0.08)" },
  modal: { boxShadow: "0 12px 32px rgba(19, 31, 25, 0.18)" },
};

export const darkShadows: ThemeShadows = {
  none: { boxShadow: "none" },
  card: { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.40)" },
  modal: { boxShadow: "0 12px 32px rgba(0, 0, 0, 0.62)" },
};
