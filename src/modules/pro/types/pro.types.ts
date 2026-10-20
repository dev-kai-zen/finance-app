export interface ProEntitlementState {
  isPro: boolean;
  unlockedAt: string | null;
  productId: string | null;
  isLifetime: boolean;
  source: "revenuecat" | "secure_store" | "dev_simulation" | "none";
}

export interface ProPackageInfo {
  identifier: string;
  productId: string;
  priceString: string;
  title: string;
  description: string;
}

export type ProPurchaseResult =
  | { success: true; isPro: true }
  | { success: false; userCancelled: boolean; error?: string };

export type ProRestoreResult =
  | { success: true; isPro: boolean; restored: boolean }
  | { success: false; error?: string };
