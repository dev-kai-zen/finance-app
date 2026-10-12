import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CreditCard } from "lucide-react-native";
import {
  PageContainer,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import { CreditCardMonitoringCard } from "../components/credit-card-monitoring-card";
import { useCreditCardMonitoring } from "../hooks/use-credit-card-monitoring";

export function CreditCardMonitoringScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const data = useCreditCardMonitoring();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const activeAccountId =
    data.cards.find((c) => c.accountId === selectedAccountId)?.accountId ??
    data.cards[0]?.accountId ??
    null;

  const selectedCard =
    data.cards.find((c) => c.accountId === activeAccountId) ?? data.cards[0] ?? null;

  return (
    <PageContainer contentContainerStyle={styles.content}>
      {data.loading ? (
        <PageLoadingState message="Preparing credit-card billing..." />
      ) : data.error ? (
        <PageErrorState message={data.error} onRetry={data.refresh} />
      ) : data.cards.length === 0 ? (
        <PageEmptyState
          description="Create a Credit Card account to monitor billing cycles, installments, and utilization."
          icon={<CreditCard color={theme.colors.textMuted} size={32} />}
          title="No credit cards to monitor"
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View>
              <Text style={styles.summaryLabel}>DUE THIS MONTH</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(
                  data.dueThisMonthMinorUnits,
                  preferences.defaultCurrency,
                )}
              </Text>
            </View>
            {data.overdueMinorUnits > 0 ? (
              <View style={styles.overdue}>
                <Text style={styles.overdueLabel}>PAST DUE</Text>
                <Text style={styles.overdueAmount}>
                  {formatCurrency(
                    data.overdueMinorUnits,
                    preferences.defaultCurrency,
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.chipsSection}>
            <ScrollView
              contentContainerStyle={styles.chipsScrollContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {data.cards.map((card) => {
                const isSelected = card.accountId === activeAccountId;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    key={card.accountId}
                    onPress={() => setSelectedAccountId(card.accountId)}
                    style={({ pressed }) => [
                      styles.chip,
                      isSelected && styles.activeChip,
                      pressed && styles.pressedChip,
                    ]}
                  >
                    <CreditCard
                      color={
                        isSelected
                          ? theme.colors.onPrimary
                          : theme.colors.textSecondary
                      }
                      size={15}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chipLabel,
                        isSelected && styles.activeChipLabel,
                      ]}
                    >
                      {card.accountName}
                    </Text>
                    <View
                      style={[
                        styles.chipBadge,
                        isSelected && styles.activeChipBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBadgeText,
                          isSelected && styles.activeChipBadgeText,
                        ]}
                      >
                        {formatCurrency(
                          card.outstandingMinorUnits,
                          card.currencyCode,
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {selectedCard ? (
            <CreditCardMonitoringCard
              card={selectedCard}
              key={selectedCard.accountId}
            />
          ) : null}
        </>
      )}
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: { paddingTop: theme.spacing.lg },
    summary: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.6,
    },
    summaryAmount: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.title,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
    },
    overdue: { alignItems: "flex-end" },
    overdueLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    overdueAmount: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
    },
    chipsSection: {
      marginBottom: theme.spacing.lg,
    },
    chipsScrollContent: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: 2,
    },
    chip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    activeChip: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...theme.shadows.card,
    },
    pressedChip: {
      opacity: 0.85,
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      maxWidth: 140,
    },
    activeChipLabel: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    chipBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      marginLeft: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    activeChipBadge: {
      backgroundColor: "rgba(255, 255, 255, 0.22)",
    },
    chipBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activeChipBadgeText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
