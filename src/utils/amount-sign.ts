export type AmountSign = "+" | "-";

export function amountSignFromMinorUnits(minorUnits: number): AmountSign {
  return minorUnits < 0 ? "-" : "+";
}

export function applySignedAmount(minorUnits: number): {
  amountSign: AmountSign;
  amountMinorUnits: number;
  formattedDecimal: string;
} {
  const amountSign = amountSignFromMinorUnits(minorUnits);
  const amountMinorUnits = Math.abs(minorUnits);
  const formattedDecimal = (amountMinorUnits / 100).toFixed(2);
  return { amountSign, amountMinorUnits, formattedDecimal };
}
