import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { AccountWithBalance } from "../types/dashboard.types";

export interface DashboardAccountsCardProps {
  accounts: AccountWithBalance[];
  onViewAll: () => void;
}

export function DashboardAccountsCard({
  accounts,
  onViewAll,
}: DashboardAccountsCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const resolveEntityColor = useResolveEntityColor();
  const { preferences } = useCurrencyPreferences();

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("dashboard.accountsCardTitle")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewAllText}>{t("dashboard.viewAll")}</Text>
          <ArrowRight color={theme.colors.primary} size={15} />
        </Pressable>
      </View>

      {activeAccounts.length === 0 ? (
        <Text style={styles.emptyText}>{t("dashboard.noAccountsYet")}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.strip}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {activeAccounts.map((acc) => {
            const color = resolveEntityColor(
              acc.accountType?.color ?? acc.accountType?.hexColorsId,
              theme.colors.primary,
            );
            const iconName =
              acc.iconKey || acc.accountType?.iconKey || "landmark";
            const isPositive = acc.currentBalanceMinorUnits >= 0;

            return (
              <Pressable
                key={acc.id}
                accessibilityRole="button"
                onPress={onViewAll}
                style={({ pressed }) => [
                  styles.accountPill,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.accountTopRow}>
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: `${color}1F`,
                        borderColor: `${color}40`,
                      },
                    ]}
                  >
                    <IconHelper color={color} name={iconName} size={15} />
                  </View>
                  <Text numberOfLines={1} style={styles.accountTypeLabel}>
                    {acc.accountType?.name ?? ""}
                  </Text>
                </View>

                <Text numberOfLines={1} style={styles.accountName}>
                  {acc.name}
                </Text>

                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.accountBalance,
                    preferences.colorAmounts &&
                      (isPositive ? styles.positiveText : styles.negativeText),
                  ]}
                >
                  {formatCurrency(
                    acc.currentBalanceMinorUnits,
                    acc.currencyCode,
                  )}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    viewAllButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 34,
      paddingHorizontal: theme.spacing.xs,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      paddingVertical: theme.spacing.sm,
    },
    strip: {
      gap: theme.spacing.sm,
      paddingTop: 2,
    },
    accountPill: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: 4,
      minWidth: 142,
      maxWidth: 175,
      padding: theme.spacing.sm,
    },
    accountTopRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    accountTypeLabel: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.medium,
    },
    accountName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: 2,
    },
    accountBalance: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    positiveText: {
      color: theme.colors.success,
    },
    negativeText: {
      color: theme.colors.danger,
    },
    pressed: {
      opacity: 0.76,
    },
  });
}

