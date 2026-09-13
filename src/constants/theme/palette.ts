/**
 * Raw color palette foundation.
 * These are primitive color values representing the application's visual identity.
 * Components must NOT consume palette primitives directly; use semantic tokens from the theme.
 */
export const palette = {
  // Brand Forest Green & Lime (Kaizen visual identity)
  brand: {
    forestDarkest: "#0B1714",
    forestDark: "#11231E",      // Sidebar & button background
    forestMedium: "#1F3A32",    // Active sidebar link background
    forestLight: "#2C4C42",
    forestMuted: "#C0CEC8",     // Inactive sidebar link text
    lime: "#D4FA66",            // Primary accent & brand highlight
    limeHover: "#C4EA56",
  },

  // Neutral slate scale
  gray: {
    50: "#F8FAF9",
    100: "#F0F4F2",
    200: "#E1E9E5",
    300: "#CCD7D1",
    400: "#A8B8B0",
    500: "#7D938B",
    600: "#5D736B",
    700: "#475953",
    800: "#24332D",
    900: "#0D1915",
  },

  // Base absolutes
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0, 0, 0, 0.35)",

  // Semantic status primitives
  status: {
    success: "#12B76A",
    warning: "#F79009",
    danger: "#B42318",
    info: "#0BA5EC",
  },

  // Domain categorical colors (account types, charts, tags)
  categorical: {
    blue: "#2563EB",
    teal: "#0D9488",
    green: "#16A34A",
    lime: "#84CC16",
    amber: "#D97706",
    orange: "#EA580C",
    red: "#DC2626",
    purple: "#9333EA",
    indigo: "#4F46E5",
    pink: "#DB2777",
    slate: "#64748B",
  },
} as const;

export type Palette = typeof palette;
export type CategoricalColorKey = keyof typeof palette.categorical;
