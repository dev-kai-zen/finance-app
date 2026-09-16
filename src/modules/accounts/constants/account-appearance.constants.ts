import type { AppTheme } from "@/constants/theme";
import { listHexColors, resolveHexColor } from "@/modules/hex-colors";
import type { AccountGroup } from "@/modules/accounts/types/account.types";

export const ACCOUNT_ICON_KEYS = ["landmark", "wallet", "credit-card", "banknote", "building", "circle"] as const;
export const ACCOUNT_COLOR_KEYS = ["blue", "teal", "green", "lime", "amber", "orange", "red", "purple", "indigo", "pink", "slate"] as const;
export const ACCOUNT_DEFAULT_COLOR_IDS: Record<AccountGroup, string> = {
  asset: "color_green",
  liability: "color_red",
};
export const ACCOUNT_ICONS: Record<(typeof ACCOUNT_ICON_KEYS)[number], string> = {
  landmark: "▥", wallet: "▣", "credit-card": "▰", banknote: "¤", building: "▦", circle: "●",
};
export function accountIcon(key: string | null) {
  return ACCOUNT_ICONS[key as keyof typeof ACCOUNT_ICONS] ?? ACCOUNT_ICONS.landmark;
}
export function accountColor(theme: AppTheme, key: string | null) {
  return resolveHexColor(key, {
    colors: listHexColors(),
    theme,
    fallback: theme.colors.categorical.slate,
  });
}
