import type { TextStyle, ViewStyle } from "react-native";
import type { CategoricalColorKey } from "./palette";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  // Application surfaces & backgrounds
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  surfaceInverse: string;
  surfaceInverseElevated: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textInverseMuted: string;

  // Borders
  border: string;
  borderStrong: string;

  // Brand & Action
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;

  // Status & Feedback
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Scrims & Backdrops
  overlay: string;

  // Domain Categorical Palette (Charts, Account Types, Categories)
  categorical: Record<CategoricalColorKey, string>;
}

export interface ThemeSpacing {
  xxs: number; // 2
  xs: number;  // 4
  sm: number;  // 8
  md: number;  // 12
  lg: number;  // 16
  xl: number;  // 24
  xxl: number; // 32
  xxxl: number;// 48
}

export interface ThemeBorderRadius {
  small: number;  // 4
  medium: number; // 8
  large: number;  // 12
  round: number;  // 9999
}

export interface ThemeTypography {
  fontSize: {
    xs: number;    // 12
    sm: number;    // 14
    md: number;    // 15
    base: number;  // 16
    lg: number;    // 18
    xl: number;    // 20
    xxl: number;   // 22
    title: number; // 24
    display: number; // 32
  };
  lineHeight: {
    xs: number;    // 16
    sm: number;    // 20
    md: number;    // 22
    base: number;  // 24
    lg: number;    // 26
    xl: number;    // 28
    xxl: number;   // 30
    title: number; // 32
    display: number; // 40
  };
  fontWeight: {
    regular: TextStyle["fontWeight"];  // '400'
    medium: TextStyle["fontWeight"];   // '500'
    semibold: TextStyle["fontWeight"]; // '600'
    bold: TextStyle["fontWeight"];     // '700'
  };
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeShadows {
  none: ShadowStyle;
  card: ShadowStyle;
  modal: ShadowStyle;
}

export interface AppTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  typography: ThemeTypography;
  shadows: ThemeShadows;
}
