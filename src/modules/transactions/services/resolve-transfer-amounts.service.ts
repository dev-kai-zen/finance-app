import { getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
  deriveExchangeRate,
} from "@/utils/currency";

export interface ResolveTransferAmountsInput {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  sourceAmountMinorUnitsAbs: number;
  destinationAmountMinorUnitsAbs?: number;
}

export interface ResolvedTransferAmounts {
  sourceOutMinorUnits: number;
  destinationInMinorUnits: number;
  destinationExchangeRateScaled: number | null;
}

export function resolveTransferLegAmounts(
  input: ResolveTransferAmountsInput,
): ResolvedTransferAmounts {
  const from = input.fromCurrencyCode.trim().toUpperCase();
  const to = input.toCurrencyCode.trim().toUpperCase();
  const sourceAbs = Math.abs(input.sourceAmountMinorUnitsAbs);

  if (!Number.isInteger(sourceAbs) || sourceAbs <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  if (from === to) {
    return {
      sourceOutMinorUnits: -sourceAbs,
      destinationInMinorUnits: sourceAbs,
      destinationExchangeRateScaled: null,
    };
  }

  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY);
  const destinationAbs =
    input.destinationAmountMinorUnitsAbs !== undefined &&
    input.destinationAmountMinorUnitsAbs > 0
      ? Math.abs(input.destinationAmountMinorUnitsAbs)
      : Math.abs(
          convertCurrencyMinorUnits(
            sourceAbs,
            from,
            to,
            ratesMap,
            DEFAULT_BASE_CURRENCY,
          ),
        );

  if (!Number.isInteger(destinationAbs) || destinationAbs <= 0) {
    throw new Error("Destination transfer amount must be greater than zero.");
  }

  const destinationExchangeRateScaled = deriveExchangeRate(
    destinationAbs,
    sourceAbs,
    from,
    to,
  );

  return {
    sourceOutMinorUnits: -sourceAbs,
    destinationInMinorUnits: destinationAbs,
    destinationExchangeRateScaled,
  };
}
