import type { TranslationKey } from "@/infrastructure/localization/translations";

type TranslateFn = (
  key: TranslationKey,
  options?: Record<string, string | number | boolean | null | undefined>,
) => string;

const SYSTEM_DESCRIPTION_KEYS: Record<string, TranslationKey> = {
  "Billed item": "creditCardMonitoring.activity.billedItem",
  "Card purchase": "creditCardMonitoring.activity.cardPurchase",
  "Installment purchase": "creditCardMonitoring.activity.installmentPurchase",
};

export function localizeCreditCardActivityDescription(
  description: string,
  translate: TranslateFn,
): string {
  const key = SYSTEM_DESCRIPTION_KEYS[description];
  return key ? translate(key) : description;
}

export function localizeCreditCardActivityDetail(
  detail: string | null | undefined,
  translate: TranslateFn,
): string | null | undefined {
  if (!detail) {
    return detail;
  }
  if (detail === "One-time purchase") {
    return translate("creditCardMonitoring.unbilled.oneTimePurchase");
  }
  if (detail === "Opening balance") {
    return translate("creditCardMonitoring.entry.openingBalance");
  }
  if (detail.startsWith("Due ")) {
    return translate("creditCardMonitoring.activity.dueOnDetail", {
      date: detail.slice(4),
    });
  }
  const remainingMatch = /^(\d+)-month installment · remaining principal$/.exec(
    detail,
  );
  if (remainingMatch) {
    return translate("creditCardMonitoring.unbilled.installmentRemaining", {
      months: Number(remainingMatch[1]),
    });
  }
  const bnplMatch =
    /^(\d+)-mo installment · BNPL: First bill on (.+)$/.exec(detail);
  if (bnplMatch) {
    return translate("creditCardMonitoring.unbilled.installmentBnpl", {
      months: Number(bnplMatch[1]),
      date: bnplMatch[2],
    });
  }
  return detail;
}