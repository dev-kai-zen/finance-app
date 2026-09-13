import type { AccountListItem } from "@/modules/accounts/types/account.types";

export function openingSummary(accounts: AccountListItem[]) {
  let assets = 0n;
  let liabilities = 0n;
  let excluded = 0;
  for (const account of accounts) {
    if (account.isArchived) continue;
    const balance = account.currentBalanceMinorUnits ?? account.openingBalanceMinorUnits;
    if (account.currencyCode !== "PHP" || !Number.isSafeInteger(balance) ||
      !["asset", "liability"].includes(account.accountType?.accountGroup ?? "")) {
      excluded++;
      continue;
    }
    if (account.accountType?.accountGroup === "asset") assets += BigInt(balance);
    else liabilities += BigInt(balance);
  }
  return { assets, liabilities, excluded };
}
export function formatOpeningTotal(amount: bigint) {
  const absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "-" : ""}₱${(absolute / 100n).toLocaleString("en-PH")}.${String(absolute % 100n).padStart(2, "0")}`;
}
