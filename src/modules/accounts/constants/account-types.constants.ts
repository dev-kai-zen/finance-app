export const SYSTEM_ACCOUNT_TYPE_IDS = {
  ASSET_OTHERS: "system:asset:others",
  LIABILITY_CREDIT_CARD: "system:liability:credit-card",
  LIABILITY_OTHERS: "system:liability:others",
} as const;

const SYSTEM_OTHERS_ACCOUNT_TYPE_IDS = new Set<string>([
  SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
  SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_OTHERS,
]);

export function isSystemOthersAccountTypeId(
  id: string | null | undefined,
): boolean {
  return id ? SYSTEM_OTHERS_ACCOUNT_TYPE_IDS.has(id) : false;
}

export const FALLBACK_ACCOUNT_TYPE_BY_GROUP = {
  asset: SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
  liability: SYSTEM_ACCOUNT_TYPE_IDS.LIABILITY_OTHERS,
} as const;
