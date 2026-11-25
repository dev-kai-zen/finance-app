import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CreditCard } from "lucide-react-native";
import {
  HorizontalScrollView,
  PageContainer,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
  useHeaderWalkthroughAction,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import { useLocalization } from "@/infrastructure/localization";
import { ProFeatureModal, useProStatus } from "@/modules/pro";
import {
  CreditCardsWalkthroughOverlay,
  useCreditCardsWalkthrough,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughIntroModal,
  WalkthroughRegistryProvider,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { formatCurrency } from "@/utils/currency";
import { CreditCardMonitoringCard } from "../components/credit-card-monitoring-card";
import {
  CREDIT_CARD_MONITORING_LOAD_FAILED,
  useCreditCardMonitoring,
} from "../hooks/use-credit-card-monitoring";
import { endOfMonth } from "../utils/billing-dates";

export function CreditCardMonitoringScreen() {
  return (
    <WalkthroughRegistryProvider>
      <CreditCardMonitoringScreenContent />
    </WalkthroughRegistryProvider>
  );
}

function CreditCardMonitoringScreenContent() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { preferences } = useCurrencyPreferences();
  const { isPrivate } = usePrivacyMode();
  const { isPro } = useProStatus();
  const [proModalVisible, setProModalVisible] = useState(false);
  const data = useCreditCardMonitoring();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);

  const emptyAddRef = useWalkthroughTarget("creditCardEmptyAddButton");
  const dueSummaryRef = useWalkthroughTarget(
    data.cards.length > 0 ? "creditCardDueSummary" : null,
  );
  const accountChipsRef = useWalkthroughTarget(
    data.cards.length > 0 ? "creditCardAccountChips" : null,
  );

  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isPro) {
        setProModalVisible(true);
      }
    }, [isPro]),
  );

  const handleClose = () => {
    setProModalVisible(false);
    if (!isPro) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    }
  };

  const activeAccountId =
    data.cards.find((c) => c.accountId === selectedAccountId)?.accountId ??
    data.cards[0]?.accountId ??
    null;

  const selectedCard =
    data.cards.find((c) => c.accountId === activeAccountId) ?? data.cards[0] ?? null;

  const hasCards = data.cards.length > 0;
  const hasUnbilledActivity = (selectedCard?.unbilledItems.length ?? 0) > 0;

  const errorMessage =
    data.error === CREDIT_CARD_MONITORING_LOAD_FAILED
      ? t(CREDIT_CARD_MONITORING_LOAD_FAILED)
      : data.error;

  const monthEndOn = useMemo(
    () => endOfMonth(new Date(data.evaluatedCalendarDate)),
    [data.evaluatedCalendarDate],
  );
  const monthEndDisplay = useMemo(() => {
    const [year, month, day] = monthEndOn.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [monthEndOn]);
  const showCalendarMonthDue =
    data.dueInCalendarMonthMinorUnits > 0 &&
    data.dueInCalendarMonthMinorUnits < data.dueThisMonthMinorUnits;

  const walkthrough = useCreditCardsWalkthrough({
    hasCards,
    hasUnbilledActivity,
    onScrollToTarget: handleScrollToTarget,
  });

  useHeaderWalkthroughAction(
    useMemo(
      () => ({
        onStart: walkthrough.startWalkthrough,
        isActive: walkthrough.isWalkthroughActive,
      }),
      [walkthrough.isWalkthroughActive, walkthrough.startWalkthrough],
    ),
  );

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "creditCardsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
    enabled: isPro,
  });

  useEffect(() => {
    if (!data.loading && isPro && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    data.loading,
    isPro,
    walkthroughIntro.canTrigger,
    walkthroughIntro.triggerIfFirstTime,
  ]);

  return (
    <PageContainer
      contentContainerStyle={styles.content}
      scrollContentRef={scrollContentRef}
      scrollEnabled={
        walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
      }
      scrollRef={scrollRef}
    >
      {data.loading ? (
        <PageLoadingState
          message={t("creditCardMonitoring.loading")}
          variant="cards"
        />
      ) : data.error ? (
        <PageErrorState message={errorMessage ?? data.error} onRetry={data.refresh} />
      ) : data.cards.length === 0 ? (
        <PageEmptyState
          actionLabel={t("creditCardMonitoring.empty.action")}
          actionRef={emptyAddRef}
          onAction={() => router.push("/accounts")}
          description={t("creditCardMonitoring.empty.description")}
          icon={<CreditCard color={theme.colors.primary} size={32} />}
          title={t("creditCardMonitoring.empty.title")}
        />
      ) : (
        <>
          <View collapsable={false} ref={dueSummaryRef} style={styles.summary}>
            <View style={styles.summaryPrimaryColumn}>
              <Text style={styles.summaryLabel}>
                {t("creditCardMonitoring.summary.dueByMonthEnd")}
              </Text>
              <Text
                style={[
                  styles.summaryAmount,
                  !preferences.colorAmounts && { color: theme.colors.textPrimary },
                ]}
              >
                {formatPrivacyAmount(
                  formatCurrency(
                    data.dueThisMonthMinorUnits,
                    preferences.defaultCurrency,
                  ),
                  isPrivate,
                )}
              </Text>
              <Text style={styles.summaryHint}>
                {t("creditCardMonitoring.summary.dueByMonthEndHint", {
                  monthEnd: monthEndDisplay,
                })}
              </Text>
              {showCalendarMonthDue ? (
                <View style={styles.calendarMonthDueRow}>
                  <Text style={styles.calendarMonthDueLabel}>
                    {t("creditCardMonitoring.summary.dueInCalendarMonth")}
                  </Text>
                  <Text style={styles.calendarMonthDueAmount}>
                    {formatPrivacyAmount(
                      formatCurrency(
                        data.dueInCalendarMonthMinorUnits,
                        preferences.defaultCurrency,
                      ),
                      isPrivate,
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
            {data.overdueMinorUnits > 0 ? (
              <View style={styles.overdue}>
                <Text style={styles.overdueLabel}>
                  {t("creditCardMonitoring.summary.pastDue")}
                </Text>
                <Text
                  style={[
                    styles.overdueAmount,
                    !preferences.colorAmounts && { color: theme.colors.textPrimary },
                  ]}
                >
                  {formatPrivacyAmount(
                    formatCurrency(
                      data.overdueMinorUnits,
                      preferences.defaultCurrency,
                    ),
                    isPrivate,
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          <View collapsable={false} ref={accountChipsRef} style={styles.chipsSection}>
            <HorizontalScrollView
              contentContainerStyle={styles.chipsScrollContent}
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
                        {formatPrivacyAmount(
                          formatCurrency(
                            card.outstandingMinorUnits,
                            card.currencyCode,
                          ),
                          isPrivate,
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </HorizontalScrollView>
          </View>

          {selectedCard ? (
            <CreditCardMonitoringCard
              card={selectedCard}
              evaluatedCalendarDate={data.evaluatedCalendarDate}
              key={selectedCard.accountId}
            />
          ) : null}
        </>
      )}

      <ProFeatureModal
        featureDescription={t("pro.locked.creditCardsDesc")}
        featureTitle={t("pro.locked.creditCardsTitle")}
        onClose={handleClose}
        visible={proModalVisible}
      />

      <WalkthroughIntroModal
        icon={<CreditCard color={theme.colors.primary} size={32} />}
        message={t("creditCardsWalkthrough.introMessage")}
        onSkip={walkthroughIntro.handleSkip}
        onStart={walkthroughIntro.handleStart}
        subtitle={t("creditCardsWalkthrough.introSubtitle")}
        title={t("creditCardsWalkthrough.introTitle")}
        visible={walkthroughIntro.isIntroVisible}
      />

      {/* Credit Cards Walkthrough Overlay */}
      <CreditCardsWalkthroughOverlay
        onEmptyAddPress={() => {
          walkthrough.completeWalkthrough();
          router.push("/accounts");
        }}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        step={walkthrough.currentStep}
        stepIndex={walkthrough.activeStepIndex}
        targetLayout={walkthrough.activeTargetLayout}
        totalSteps={walkthrough.totalSteps}
        visible={walkthrough.isWalkthroughActive}
      />

      {walkthroughIntro.isWaitingForIntro ? (
        <View pointerEvents="auto" style={styles.interactionBlocker} />
      ) : null}
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
    summaryPrimaryColumn: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.6,
    },
    summaryHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
      marginTop: theme.spacing.xs,
      maxWidth: 260,
    },
    calendarMonthDueRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    calendarMonthDueLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    calendarMonthDueAmount: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
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
    interactionBlocker: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "transparent",
      zIndex: 999,
    },
  });
}
