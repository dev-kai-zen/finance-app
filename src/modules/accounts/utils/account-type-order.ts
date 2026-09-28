import { isSystemOthersAccountTypeId } from "@/modules/accounts/constants/account-types.constants";

export interface AccountTypeOrderItem {
  id: string;
  name?: string | null;
  sortOrder?: number | null;
}

export function compareAccountTypesForDisplay(
  left: AccountTypeOrderItem,
  right: AccountTypeOrderItem,
): number {
  const leftIsOthers = isSystemOthersAccountTypeId(left.id);
  const rightIsOthers = isSystemOthersAccountTypeId(right.id);

  if (leftIsOthers !== rightIsOthers) return leftIsOthers ? 1 : -1;

  return (
    (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
    (left.name ?? "").localeCompare(right.name ?? "", undefined, {
      sensitivity: "base",
    }) ||
    left.id.localeCompare(right.id)
  );
}
