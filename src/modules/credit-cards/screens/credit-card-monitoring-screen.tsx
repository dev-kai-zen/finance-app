import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CreditCard, Crown } from "lucide-react-native";
import {
  PageContainer,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { ProFeatureModal, useProStatus } from "@/modules/pro";
import { formatCurrency } from "@/utils/currency";
import { CreditCardMonitoringCard } from "../components/credit-card-monitoring-card";
import { useCreditCardMonitoring } from "../hooks/use-credit-card-monitoring";

export function CreditCardMonitoringScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const { isPro } = useProStatus();
  const [proModalVisible, setProModalVisible] = useState(false);
  const data = useCreditCardMonitoring();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isPro) {
        setProModalVisible(true);
      }
    }, [isPro]),
  );

  const activeAccountId =
    data.cards.find((c) => c.accountId === selectedAccountId)?.accountId ??
    data.cards[0]?.accountId ??
    null;

  const selectedCard =
    data.cards.find((c) => c.accountId === activeAccountId) ?? data.cards[0] ?? null;

  return (
    <PageContainer contentContainerStyle={styles.content}>
      {!isPro && (
        <Pressable
          accessibilityLabel="Kaizen Pro feature. Tap to learn more."
          accessibilityRole="button"
          onPress={() => setProModalVisible(true)}
          style={({ pressed }) => [
            styles.proBanner,
            pressed && styles.proBannerPressed,
          ]}
        >
          <View style={styles.proBannerLeft}>
            <View style={styles.proBadge}>
              <Crown color="#D97706" size={14} />
            </View>
            <View style={styles.proBannerCopy}>
              <Text style={styles.proBannerTitle}>Kaizen Pro Feature</Text>
              <Text style={styles.proBannerSubtitle}>
                Credit Card billing cycles, payoffs & limit tracking
              </Text>
            </View>
          </View>
          <View style={styles.proLearnMoreBadge}>
            <Text style={styles.proLearnMoreText}>Learn More</Text>
          </View>
        </Pressable>
      )}

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
              <Text
                style={[
                  styles.summaryAmount,
                  !preferences.colorAmounts && { color: theme.colors.textPrimary },
                ]}
              >
                {formatCurrency(
                  data.dueThisMonthMinorUnits,
                  preferences.defaultCurrency,
                )}
              </Text>
            </View>
            {data.overdueMinorUnits > 0 ? (
              <View style={styles.overdue}>
                <Text style={styles.overdueLabel}>PAST DUE</Text>
                <Text
                  style={[
                    styles.overdueAmount,
                    !preferences.colorAmounts && { color: theme.colors.textPrimary },
                  ]}
                >
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

      <ProFeatureModal
        featureDescription="Track multi-card billing cycles, statement cutoffs, payment due dates, 0% installment payoffs, and credit limit utilization in real time with Kaizen Pro."
        featureTitle="Credit Card Monitoring"
        onClose={() => setProModalVisible(false)}
        visible={proModalVisible}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: { paddingTop: theme.spacing.lg },
    proBanner: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.08)",
      borderColor: "rgba(217, 119, 6, 0.3)",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    proBannerPressed: {
      backgroundColor: "rgba(217, 119, 6, 0.14)",
    },
    proBannerLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    proBadge: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderRadius: theme.borderRadius.round,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    proBannerCopy: {
      flex: 1,
    },
    proBannerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    proBannerSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 1,
    },
    proLearnMoreBadge: {
      backgroundColor: "#D97706",
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    proLearnMoreText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },
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
