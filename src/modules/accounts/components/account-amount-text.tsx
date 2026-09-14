import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatPhpCurrency } from "@/utils/currency";

export function AccountAmountText({
  amountMinorUnits,
  style,
  variant = "body",
  ...rest
}: {
  amountMinorUnits: number;
  variant?: "body" | "title" | "hero";
  style?: TextStyle;
} & Omit<TextProps, "children" | "style">) {
  const theme = useAppTheme();
  const result = formatPhpCurrency(amountMinorUnits, {
    positiveColor: theme.colors.success,
    negativeColor: theme.colors.danger,
    zeroColor: theme.colors.textPrimary,
  });

  return (
    <Text
      {...rest}
      style={[
        variant === "hero" && styles.hero,
        variant === "title" && styles.title,
        variant === "body" && styles.body,
        { color: result.color },
        style,
      ]}
    >
      {result.formatted}
    </Text>
  );
}

export function bigintToSafeNumber(amount: bigint): number | null {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < BigInt(Number.MIN_SAFE_INTEGER)) {
    return null;
  }
  return Number(amount);
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 32,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    lineHeight: 38,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  body: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
