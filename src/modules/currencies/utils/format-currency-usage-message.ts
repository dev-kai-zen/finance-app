import type { CurrencyUsageReason } from "../types/currency.types";

type UsageTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function formatCurrencyUsageMessage(
  code: string,
  reasons: CurrencyUsageReason[],
  t: UsageTranslator,
): string {
  if (reasons.length === 0) {
    return t("currency.usageModalEmpty", { code });
  }

  const lines = reasons.map((reason) => {
    switch (reason.kind) {
      case "accounts":
        return t("currency.usageReasonAccounts", { count: reason.count });
      case "goals":
        return t("currency.usageReasonGoals", { count: reason.count });
      case "exchange_rates":
        return t("currency.usageReasonExchangeRates", { count: reason.count });
      case "default_currency":
        return t("currency.usageReasonDefault");
      default:
        return "";
    }
  });

  return [t("currency.usageModalIntro", { code }), "", ...lines.map((line) => `• ${line}`)].join(
    "\n",
  );
}
