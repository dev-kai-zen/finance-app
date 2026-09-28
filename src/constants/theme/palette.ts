/**
 * Domain colors are independent from application chrome. They are reserved for
 * charts, account types, categories, and tags. Components should consume the
 * resolved values from `theme.colors.categorical`, never this file directly.
 */
export const palette = {
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
