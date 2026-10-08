import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { convertCurrencyMinorUnits } from "@/utils/currency";

export function openingSummary(
  accounts: AccountListItem[],
  targetCurrency?: string,
) {
  let assets = 0n;
  let liabilities = 0n;
  let excluded = 0;
  for (const account of accounts) {
    if (account.isArchived || account.hideFromReports) continue;
    const balance =
      account.currentBalanceMinorUnits ?? account.openingBalanceMinorUnits;
    if (
      (!targetCurrency && account.currencyCode !== "PHP") ||
      !Number.isSafeInteger(balance) ||
      !["asset", "liability"].includes(account.accountType?.accountGroup ?? "")
    ) {
      excluded++;
      continue;
    }
    const convertedBalance = targetCurrency
      ? convertCurrencyMinorUnits(
          balance,
          account.currencyCode,
          targetCurrency,
        )
      : balance;
    if (account.accountType?.accountGroup === "asset") {
      assets += BigInt(convertedBalance);
    } else {
      liabilities += BigInt(convertedBalance);
    }
  }
  return { assets, liabilities, excluded };
}

export function formatOpeningTotal(amount: bigint) {
  const absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "-" : ""}₱${(absolute / 100n).toLocaleString("en-PH")}.${String(absolute % 100n).padStart(2, "0")}`;
}
