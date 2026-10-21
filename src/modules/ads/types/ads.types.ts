import type { StyleProp, ViewStyle } from "react-native";

export type AdBannerPlacement =
  | "dashboard"
  | "transactions"
  | "reports"
  | "budgets"
  | "accounts"
  | "settings"
  | "global";

export type AdBannerVariant = "card" | "plain";

export interface AdBannerProps {
  placement?: AdBannerPlacement;
  variant?: AdBannerVariant;
  style?: StyleProp<ViewStyle>;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
}
