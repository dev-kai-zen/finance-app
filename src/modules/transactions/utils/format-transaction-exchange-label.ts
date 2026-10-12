import {
  formatCurrency,
  minorUnitsPerMajorUnit,
  normalizeExchangeRateScaled,
  tryApplyExchangeRate,
} from "@/utils/currency";

export function formatTransactionExchangeLabel(input: {
  currencyCode: string;
  accountCurrency: string;
  originalAmountMinorUnits: number | null;
  exchangeRateScaled: number | null;
}): string | null {
  try {
    const typed = input.currencyCode.trim().toUpperCase();
    const account = input.accountCurrency.trim().toUpperCase();
    if (typed === account) {
      return null;
    }
    if (
      input.originalAmountMinorUnits === null ||
      input.originalAmountMinorUnits === undefined
    ) {
      return null;
    }
    const normalizedRate = normalizeExchangeRateScaled(input.exchangeRateScaled);
    if (normalizedRate === null) {
      return null;
    }

    const oneTypedMajorMinor = Number(minorUnitsPerMajorUnit(typed));
    const oneTypedInAccountMinor = tryApplyExchangeRate(
      oneTypedMajorMinor,
      normalizedRate,
      typed,
      account,
    );
    if (oneTypedInAccountMinor === null) {
      return null;
    }

    const typedLabel = formatCurrency(
      input.originalAmountMinorUnits,
      typed,
      false,
    );
    const rateLabel = formatCurrency(oneTypedInAccountMinor, account, false);

    return `${typedLabel} · 1 ${typed} = ${rateLabel}`;
  } catch {
    return null;
  }
}

export function formatCrossCurrencyTransferLabel(input: {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmountMinorUnitsAbs: number;
  destinationAmountMinorUnitsAbs: number;
  exchangeRateScaled: number | null;
}): string | null {
  try {
    const from = input.sourceCurrency.trim().toUpperCase();
    const to = input.destinationCurrency.trim().toUpperCase();
    if (from === to) {
      return null;
    }

    const sourceAbs = Math.abs(input.sourceAmountMinorUnitsAbs);
    const destAbs = Math.abs(input.destinationAmountMinorUnitsAbs);
    if (sourceAbs <= 0 || destAbs <= 0) {
      return null;
    }

    const sourceLabel = formatCurrency(sourceAbs, from, false);
    const destLabel = formatCurrency(destAbs, to, false);

    const normalizedRate = normalizeExchangeRateScaled(input.exchangeRateScaled);
    if (normalizedRate === null) {
      return `${sourceLabel} → ${destLabel}`;
    }

    const oneSourceMajorMinor = Number(minorUnitsPerMajorUnit(from));
    const oneSourceInDestMinor = tryApplyExchangeRate(
      oneSourceMajorMinor,
      normalizedRate,
      from,
      to,
    );
    if (oneSourceInDestMinor === null) {
      return `${sourceLabel} → ${destLabel}`;
    }

    return `${sourceLabel} → ${destLabel} · 1 ${from} = ${formatCurrency(oneSourceInDestMinor, to, false)}`;
  } catch {
    return null;
  }
}
