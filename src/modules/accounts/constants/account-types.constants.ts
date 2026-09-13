export const SYSTEM_ACCOUNT_TYPE_IDS = {
  ASSET_OTHERS: "system:asset:others",
  LIABILITY_CREDIT_CARD: "system:liability:credit-card",
  LIABILITY_OTHERS: "system:liability:others",
} as const;

export const FALLBACK_ACCOUNT_TYPE_BY_GROUP = {
  asset: SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
  liability: SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_OTHERS,
} as const;
