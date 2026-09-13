import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { formatOpeningTotal, openingSummary } from "@/modules/accounts/utils/opening-summary";

export function AccountOpeningSummary({ accounts }: { accounts: AccountListItem[] }) {
  const s = useThemeStyles(styles);
  const summary = openingSummary(accounts);
  return <View style={s.card}>
    <Text style={s.eyebrow}>YOUR STARTING POINT · PHP</Text>
    <Text style={s.title} accessibilityRole="header">Opening balances</Text>
    <View style={s.row}>
      <View style={s.metric}><Text style={s.label}>Assets</Text><Text style={s.amount}>{formatOpeningTotal(summary.assets)}</Text></View>
      <View style={s.metric}><Text style={s.label}>Liabilities · signed</Text><Text style={s.amount}>{formatOpeningTotal(summary.liabilities)}</Text></View>
    </View>
    <Text style={s.note}>Active accounts only. Opening dates may differ; these are not live balances or current net worth. Negative liabilities are money owed; positive liabilities are credit.</Text>
    {summary.excluded > 0 && <Text style={s.note}>{summary.excluded} account(s) excluded from PHP totals because of another currency or unrecognized data.</Text>}
  </View>;
}
function styles(theme: AppTheme) {
  return StyleSheet.create({
    card: { backgroundColor: theme.colors.surfaceInverse, borderRadius: theme.borderRadius.large, padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl, gap: theme.spacing.md, ...theme.shadows.card },
    eyebrow: { color: theme.colors.textInverseMuted, fontSize: theme.typography.fontSize.xs, letterSpacing: 1 },
    title: { color: theme.colors.textInverse, fontSize: theme.typography.fontSize.title, fontWeight: theme.typography.fontWeight.bold },
    row: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xl, paddingVertical: theme.spacing.md },
    metric: { flexGrow: 1, flexShrink: 1, gap: theme.spacing.sm },
    label: { color: theme.colors.textInverseMuted, fontSize: theme.typography.fontSize.sm },
    amount: { color: theme.colors.textInverse, fontSize: theme.typography.fontSize.display,
      fontWeight: theme.typography.fontWeight.bold, fontVariant: ["tabular-nums"], flexShrink: 1 },
    note: { color: theme.colors.textInverseMuted, fontSize: theme.typography.fontSize.sm, lineHeight: theme.typography.lineHeight.md },
  });
}
