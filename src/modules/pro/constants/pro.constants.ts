export const PRO_CONSTANTS = {
  ENTITLEMENT_ID: "kaizen_finance_pro",
  LEGACY_ENTITLEMENT_ID: "pro",
  LIFETIME_PRODUCT_ID: "lifetime",
  FALLBACK_PRICE: "$9.99",
  FALLBACK_TITLE: "Lifetime Pro Access",
  FALLBACK_DESCRIPTION:
    "Unlock unlimited accounts, budgets & goals, automatic Google Drive cloud backup, advanced analytics, and enjoy an ad-free experience forever with a one-time payment.",
} as const;

export const PRO_LIMITS = {
  FREE_MAX_ACCOUNTS: 5,
  FREE_MAX_POCKETS_PER_ACCOUNT: 3,
  FREE_MAX_CATEGORY_BUDGETS: 6,
  FREE_MAX_GOALS: 3,
  FREE_MAX_SCHEDULED_TRANSACTIONS: 5,
  FREE_MAX_NOTES: 5,
} as const;

export const PRO_SECURE_KEYS = {
  IS_PRO: "kaizen_pro_is_unlocked_v1",
  UNLOCKED_AT: "kaizen_pro_unlocked_at_v1",
  PRODUCT_ID: "kaizen_pro_product_id_v1",
  DEV_SIMULATE_PRO: "kaizen_pro_dev_simulate_v1",
} as const;

export interface ProFeatureItem {
  icon:
    | "file-text"
    | "shield-check"
    | "sparkles"
    | "cloud-off"
    | "cloud"
    | "infinity"
    | "lock";
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}

export const PRO_FEATURES: ProFeatureItem[] = [
  {
    icon: "shield-check",
    titleKey: "pro.features.noAds.title",
    defaultTitle: "100% Ad-Free Experience",
    descKey: "pro.features.noAds.desc",
    defaultDesc:
      "Never see banner ads, popups, or promotional interruptions anywhere in the app.",
  },
  {
    icon: "sparkles",
    titleKey: "pro.features.lifetime.title",
    defaultTitle: "Pay Once, Own Forever",
    descKey: "pro.features.lifetime.desc",
    defaultDesc:
      "No recurring monthly or annual subscriptions. One-time payment tied permanently to your Google account.",
  },
  {
    icon: "cloud",
    titleKey: "pro.features.backup.title",
    defaultTitle: "Google Drive Cloud Backup & Sync",
    descKey: "pro.features.backup.desc",
    defaultDesc:
      "Automated cloud backup and quick sync keeps your entire financial history safe and restored anytime.",
  },
  {
    icon: "infinity",
    titleKey: "pro.features.unlimited.title",
    defaultTitle: "Unlimited Accounts & Planning",
    descKey: "pro.features.unlimited.desc",
    defaultDesc:
      "Create unlimited accounts, sub-pockets, category budgets, recurring bills, and savings goals without limits.",
  },
  {
    icon: "file-text",
    titleKey: "pro.features.reports.title",
    defaultTitle: "Comprehensive Financial Reports",
    descKey: "pro.features.reports.desc",
    defaultDesc:
      "Full access to Cash Flow trends, Balance Sheet comparisons, Net Worth Growth, and Expense breakdowns.",
  },
  {
    icon: "sparkles",
    titleKey: "pro.features.widgets.title",
    defaultTitle: "Home Screen Financial Widgets",
    descKey: "pro.features.widgets.desc",
    defaultDesc:
      "Pin interactive Monthly Budget, Cash Flow, and Net Worth charts directly to your Android home screen.",
  },
  {
    icon: "cloud-off",
    titleKey: "pro.features.offline.title",
    defaultTitle: "Offline-First Reliability",
    descKey: "pro.features.offline.desc",
    defaultDesc:
      "Pro status is saved locally on your device so all features work seamlessly without internet connectivity.",
  },
];
