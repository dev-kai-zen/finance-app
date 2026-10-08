import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowRightLeft } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  formatOneMajorUnitExchangeRate,
  getExchangeRateMap,
} from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
  formatCurrency,
} from "@/utils/currency";

export function TransactionExchangeRateHint({
  entryCurrencyCode,
  accountCurrencyCode,
  amountMinorUnits,
  amountSign,
}: {
  entryCurrencyCode: string;
  accountCurrencyCode: string;
  amountMinorUnits: number;
  amountSign: "+" | "-" | "transfer";
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const ratesMap = useMemo(
    () => getExchangeRateMap(DEFAULT_BASE_CURRENCY),
    [],
  );

  const entry = entryCurrencyCode.trim().toUpperCase();
  const account = accountCurrencyCode.trim().toUpperCase();

  const { rateLine, accountLine } = useMemo(() => {
    if (entry === account) {
      return { rateLine: null as string | null, accountLine: null as string | null };
    }
    const rateLine = formatOneMajorUnitExchangeRate(entry, account, { ratesMap });
    const signed =
      amountSign === "-"
        ? -Math.abs(amountMinorUnits)
        : amountSign === "+"
          ? Math.abs(amountMinorUnits)
          : Math.abs(amountMinorUnits);
    if (amountMinorUnits <= 0) {
      return { rateLine, accountLine: null };
    }
    const converted = convertCurrencyMinorUnits(
      signed,
      entry,
      account,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    return {
      rateLine,
      accountLine: `Account (${account}): ${formatCurrency(converted, account, true)}`,
    };
  }, [entry, account, amountMinorUnits, amountSign, ratesMap]);

  if (!rateLine) return null;

  return (
    <View style={styles.box}>
      <ArrowRightLeft color={theme.colors.primary} size={16} />
      <View style={styles.copy}>
        <Text style={styles.rate}>{rateLine}</Text>
        <Text style={styles.caption}>Current conversion rate setting</Text>
        {accountLine ? <Text style={styles.accountAmount}>{accountLine}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    box: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}33`,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    copy: { flex: 1, gap: 2 },
    rate: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    caption: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    accountAmount: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
    },
  });
}
