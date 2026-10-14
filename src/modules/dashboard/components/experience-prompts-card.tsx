import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useExperiencePreferences } from "@/modules/settings";

interface ExperiencePromptsCardProps {
  expenseTransactionCount: number;
  activeAccountCount: number;
  hasCreditCardAccount: boolean;
}

export function ExperiencePromptsCard({
  expenseTransactionCount,
  activeAccountCount,
  hasCreditCardAccount,
}: ExperiencePromptsCardProps) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const experience = useExperiencePreferences();

  const showQuickPresets =
    expenseTransactionCount >= 5 &&
    !experience.formFields.transactionName &&
    !experience.formFields.quickPresets &&
    !experience.isPromptDismissed("quickPresetsOfferDismissed");

  const showTransfers =
    activeAccountCount >= 2 &&
    !experience.isPromptDismissed("transfersOfferDismissed");

  const showCreditCards =
    hasCreditCardAccount &&
    !experience.formFields.installments &&
    !experience.navVisibility.creditCards &&
    !experience.isPromptDismissed("creditCardsOfferDismissed");

  const prompt = showQuickPresets
    ? {
        title: t("dashboard.promptQuickPresetsTitle"),
        message: t("dashboard.promptQuickPresetsMessage"),
        action: t("dashboard.promptQuickPresetsAction"),
        onAction: () => {
          experience.setFormFields({
            transactionName: true,
            quickPresets: true,
          });
          experience.dismissPrompt("quickPresetsOfferDismissed");
        },
        onDismiss: () =>
          experience.dismissPrompt("quickPresetsOfferDismissed"),
      }
    : showTransfers
      ? {
          title: t("dashboard.promptTransfersTitle"),
          message: t("dashboard.promptTransfersMessage"),
          action: null,
          onAction: () => experience.dismissPrompt("transfersOfferDismissed"),
          onDismiss: () =>
            experience.dismissPrompt("transfersOfferDismissed"),
        }
      : showCreditCards
        ? {
            title: t("dashboard.promptCreditCardsTitle"),
            message: t("dashboard.promptCreditCardsMessage"),
            action: t("dashboard.promptCreditCardsAction"),
            onAction: () => {
              experience.setFormFields({ installments: true });
              experience.setNavVisible("creditCards", true);
              experience.dismissPrompt("creditCardsOfferDismissed");
            },
            onDismiss: () =>
              experience.dismissPrompt("creditCardsOfferDismissed"),
          }
        : null;

  if (!prompt) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{prompt.title}</Text>
      <Text style={styles.message}>{prompt.message}</Text>
      <View style={styles.actions}>
        {prompt.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={prompt.onAction}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryActionText}>{prompt.action}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={prompt.onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        >
          <Text style={styles.dismissText}>{t("dashboard.promptDismiss")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    actions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    primaryAction: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      minHeight: 40,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: "center",
    },
    primaryActionText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    dismiss: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    dismissText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pressed: { opacity: 0.8 },
  });
}
