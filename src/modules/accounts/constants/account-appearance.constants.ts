import type { AppTheme } from "@/constants/theme";

export const ACCOUNT_ICON_KEYS = ["landmark", "wallet", "credit-card", "banknote", "building", "circle"] as const;
export const ACCOUNT_COLOR_KEYS = ["blue", "teal", "green", "lime", "amber", "orange", "red", "purple", "indigo", "pink", "slate"] as const;
export const ACCOUNT_ICONS: Record<(typeof ACCOUNT_ICON_KEYS)[number], string> = {
  landmark: "▥", wallet: "▣", "credit-card": "▰", banknote: "¤", building: "▦", circle: "●",
};
export function accountIcon(key: string | null) {
  return ACCOUNT_ICONS[key as keyof typeof ACCOUNT_ICONS] ?? ACCOUNT_ICONS.landmark;
}
export function accountColor(theme: AppTheme, key: string | null) {
  if (!key) return theme.colors.categorical.slate;
  if (key.startsWith("#")) return key;
  const strippedKey = key.startsWith("color_") ? key.replace("color_", "") : key;
  return ACCOUNT_COLOR_KEYS.includes(strippedKey as (typeof ACCOUNT_COLOR_KEYS)[number])
    ? theme.colors.categorical[strippedKey as (typeof ACCOUNT_COLOR_KEYS)[number]]
    : theme.colors.categorical.slate;
}
