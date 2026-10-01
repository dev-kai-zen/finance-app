import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";
import type { TransactionPreset } from "../types/transaction-preset.types";
import { rankTransactionPresets } from "../utils/rank-transaction-presets";

interface QuickPresetSuggestionsProps {
  value: string;
  presets: TransactionPreset[];
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  onSelect: (preset: TransactionPreset) => void;
}

export function QuickPresetSuggestions({
  value,
  presets,
  accounts,
  pockets,
  categories,
  onSelect,
}: QuickPresetSuggestionsProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const categoryIds = useMemo(
    () =>
      new Set(
        categories.flatMap((category) => [
          category.id,
          ...(category.subcategories ?? []).map((item) => item.id),
        ]),
      ),
    [categories],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const activePocketIds = useMemo(
    () => new Set(pockets.filter((pocket) => !pocket.isArchived).map((item) => item.id)),
    [pockets],
  );
  const suggestions = useMemo(
    () =>
      rankTransactionPresets(
        presets.filter((preset) => {
          const account = accountById.get(preset.accountId);
          if (!account || account.isArchived) return false;
          if (preset.pocketId && !activePocketIds.has(preset.pocketId)) return false;
          if (preset.type === "transfer") {
            const destination = preset.toAccountId
              ? accountById.get(preset.toAccountId)
              : null;
            return Boolean(
              destination &&
                !destination.isArchived &&
                (!preset.toPocketId || activePocketIds.has(preset.toPocketId)),
            );
          }
          return Boolean(preset.categoryId && categoryIds.has(preset.categoryId));
        }),
        value,
      ),
    [accountById, activePocketIds, categoryIds, presets, value],
  );

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.container}>
        <View style={styles.heading}>
          <Sparkles color={theme.colors.primary} size={14} />
          <Text style={styles.headingText}>QUICK PRESET SUGGESTIONS</Text>
        </View>
        {suggestions.map((preset) => {
          const account = accountById.get(preset.accountId);
          return (
            <Pressable
              key={preset.id}
              accessibilityLabel={`Apply Quick Preset ${preset.transactionName}`}
              accessibilityRole="button"
              onPress={() => onSelect(preset)}
              style={styles.row}
            >
              <View style={styles.textColumn}>
                <Text numberOfLines={1} style={styles.title}>
                  {preset.transactionName}
                </Text>
                <Text numberOfLines={1} style={styles.detail}>
                  {preset.type === "transfer" ? "Transfer" : preset.type} · {account?.name}
                </Text>
              </View>
              <Text style={styles.amount}>
                {preset.amountCents === null
                  ? "Enter amount"
                  : formatCurrency(
                      Math.abs(preset.amountCents),
                      account?.currencyCode ?? "PHP",
                    )}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    floatingContainer: {
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
      left: 0,
      marginTop: theme.spacing.xs,
      position: "absolute",
      right: 0,
      top: "100%",
      zIndex: 50,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      overflow: "hidden",
    },
    heading: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}10`,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 7,
    },
    headingText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    row: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    textColumn: { flex: 1, minWidth: 0 },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    detail: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
      textTransform: "capitalize",
    },
    amount: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
