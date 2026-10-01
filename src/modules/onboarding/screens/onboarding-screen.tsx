import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowLeft,
  Check,
  CloudDownload,
  Database,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react-native";

import { KeyboardAwareForm } from "@/components/keyboard-aware-form";
import { NotificationModal } from "@/components/notification-modal";
import { APP_BRAND } from "@/constants/brand";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { GoogleDriveBackupSettings } from "@/modules/backup";
import { OnboardingOptionCard } from "@/modules/onboarding/components/onboarding-option-card";
import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";

type OnboardingStep =
  | "welcome"
  | "manual"
  | "recommended"
  | "sample"
  | "restore";

export function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const workspace = useWorkspace();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const goBack = () => {
    workspace.clearError();
    if (workspace.personalSetupRequested && step === "welcome") {
      workspace.cancelPersonalSetup();
      return;
    }
    setStep("welcome");
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareForm
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.container}>
          {step !== "welcome" || workspace.personalSetupRequested ? (
            <Pressable
              accessibilityLabel={
                workspace.personalSetupRequested && step === "welcome"
                  ? "Return to sample workspace"
                  : "Back to welcome choices"
              }
              accessibilityRole="button"
              disabled={workspace.busy}
              onPress={goBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <ArrowLeft color={theme.colors.textSecondary} size={18} />
              <Text style={styles.backText}>
                {workspace.personalSetupRequested && step === "welcome"
                  ? "Back to sample"
                  : "Back"}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.brandRow}>
            <Image
              accessibilityLabel={`${APP_BRAND.name} logo`}
              source={APP_BRAND.logo}
              style={styles.logo}
            />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>{APP_BRAND.name}</Text>
              <Text style={styles.brandTagline}>{APP_BRAND.tagline}</Text>
            </View>
          </View>

          {step === "welcome" ? (
            <WelcomeStep
              disabled={workspace.busy}
              personalOnly={workspace.personalSetupRequested}
              onChoose={(nextStep) => {
                workspace.clearError();
                setStep(nextStep);
              }}
            />
          ) : null}

          {step === "manual" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description="Begin with only the protected fallback records, then define every part of your financial structure yourself."
                title="Start from scratch"
              />

              {workspace.state.mode === "sample" ? (
                <View style={styles.infoCard}>
                  <ShieldCheck color={theme.colors.info} size={20} />
                  <Text style={styles.infoText}>
                    Starting from scratch permanently replaces the fictional
                    sample accounts, transactions, and categories.
                  </Text>
                </View>
              ) : null}

              <View style={styles.samplePreview}>
                {[
                  "Create your own account types",
                  "Add your real accounts and opening balances",
                  "Build income and expense category groups",
                  "Add the subcategories that fit your life",
                ].map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Check color={theme.colors.success} size={18} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.helperText}>
                A checklist on the dashboard will guide you through these steps.
                The protected "Others" fallbacks remain available for data safety.
              </Text>
              <PrimaryButton
                disabled={workspace.busy}
                label="Create empty workspace"
                loading={workspace.busy}
                onPress={() => void workspace.completeManualSetup()}
              />
            </View>
          ) : null}

          {step === "recommended" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description="We will prepare ready-to-use accounts and complete category presets for you."
                title="Use recommended setup"
              />

              {workspace.state.mode === "sample" ? (
                <View style={styles.infoCard}>
                  <ShieldCheck color={theme.colors.info} size={20} />
                  <Text style={styles.infoText}>
                    Finishing setup replaces all fictional sample records with
                    ready-to-use accounts and the recommended starter structure.
                  </Text>
                </View>
              ) : null}

              <View style={styles.samplePreview}>
                <Sparkles color={theme.colors.primary} size={20} />
                {[
                  "Cash Wallet, Bank Account, Savings Account, and E-Wallet",
                  "Complete income and expense category groups",
                  "Recommended subcategories ready for transactions",
                  "PHP as the primary currency with zero opening balances",
                ].map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Check color={theme.colors.success} size={18} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <PrimaryButton
                disabled={workspace.busy}
                label="Create my workspace"
                loading={workspace.busy}
                onPress={() => void workspace.completeRecommendedSetup()}
              />
            </View>
          ) : null}

          {step === "sample" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description="Try every important feature using a coherent fictional financial history."
                title="Explore a sample workspace"
              />

              <View style={styles.samplePreview}>
                <View style={styles.samplePreviewHeader}>
                  <View style={styles.sampleIcon}>
                    <FlaskConical color={theme.colors.info} size={25} />
                  </View>
                  <View style={styles.samplePreviewCopy}>
                    <Text style={styles.samplePreviewTitle}>What’s included</Text>
                    <Text style={styles.samplePreviewDescription}>
                      Dates adapt to the current and previous month so the dashboard
                      is useful whenever the app is installed.
                    </Text>
                  </View>
                </View>

                {[
                  "6 accounts: cash, bank, savings, e-wallet, credit card, and an archived account",
                  "Savings pockets for an emergency fund and travel",
                  "Income, expenses, account transfers, pocket transfers, and a card payment",
                  "31 transaction records, including one item in Trash",
                ].map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.infoCard}>
                <ShieldCheck color={theme.colors.success} size={20} />
                <Text style={styles.infoText}>
                  Sample records stay local, are clearly labeled, and are replaced
                  when you start your personal setup. Cloud backup is paused in
                  sample mode.
                </Text>
              </View>

              <PrimaryButton
                disabled={workspace.busy}
                label="Open sample workspace"
                loading={workspace.busy}
                onPress={() => void workspace.loadSampleWorkspace()}
              />
            </View>
          ) : null}

          {step === "restore" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description="Connect Google Drive and restore an encrypted Kaizen Finance backup."
                title="Restore your data"
              />
              <GoogleDriveBackupSettings />
              <Text style={styles.restoreFootnote}>
                After a successful restore, the app will reopen using the restored
                accounts and transaction history.
              </Text>
            </View>
          ) : null}
        </View>
      </KeyboardAwareForm>

      <NotificationModal
        message={workspace.error ?? ""}
        onClose={workspace.clearError}
        title="Unable to prepare workspace"
        variant="error"
        visible={Boolean(workspace.error)}
      />
    </View>
  );
}

function WelcomeStep({
  disabled,
  onChoose,
  personalOnly,
}: {
  disabled: boolean;
  onChoose: (step: Exclude<OnboardingStep, "welcome">) => void;
  personalOnly: boolean;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.stepContent}>
      <StepHeading
        description={
          personalOnly
            ? "Choose how you want to replace the fictional sample workspace."
            : "Build your own structure, use helpful defaults, explore fictional data, or restore an existing backup."
        }
        title={personalOnly ? "Start your personal workspace" : "How would you like to begin?"}
      />
      <View style={styles.optionList}>
        <OnboardingOptionCard
          description="Define your own account types, accounts, category groups, and subcategories with a guided checklist."
          disabled={disabled}
          icon={<Wallet color={theme.colors.textSecondary} size={23} />}
          onPress={() => onChoose("manual")}
          title="Start from scratch"
        />
        <OnboardingOptionCard
          badge="Recommended"
          description="Start with ready-to-use accounts, standard account types, and complete category presets."
          disabled={disabled}
          icon={<Sparkles color={theme.colors.primary} size={23} />}
          onPress={() => onChoose("recommended")}
          title="Use recommended setup"
        />
        {!personalOnly ? (
          <>
            <OnboardingOptionCard
              description="Learn the dashboard, pockets, and every transaction type with fictional data."
              disabled={disabled}
              icon={<Database color={theme.colors.info} size={23} />}
              onPress={() => onChoose("sample")}
              title="Explore a sample workspace"
            />
            <OnboardingOptionCard
              description="Bring back accounts and transaction history from Google Drive."
              disabled={disabled}
              icon={<CloudDownload color={theme.colors.success} size={23} />}
              onPress={() => onChoose("restore")}
              title="Restore a backup"
            />
          </>
        ) : null}
      </View>
      <View style={styles.privacyRow}>
        <ShieldCheck color={theme.colors.textMuted} size={16} />
        <Text style={styles.privacyText}>
          Your financial data is stored locally first and remains usable offline.
        </Text>
      </View>
    </View>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.headingTitle}>
        {title}
      </Text>
      <Text style={styles.headingDescription}>{description}</Text>
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.onPrimary} size="small" />
      ) : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollContent: {
      alignItems: "center",
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xxl,
    },
    container: {
      gap: theme.spacing.xl,
      maxWidth: 720,
      width: "100%",
    },
    backButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    backText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    brandRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    logo: {
      borderRadius: theme.borderRadius.large,
      height: 56,
      width: 56,
    },
    brandCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    brandName: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    brandTagline: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    stepContent: {
      gap: theme.spacing.xl,
    },
    heading: {
      gap: theme.spacing.sm,
    },
    headingTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.display,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.7,
      lineHeight: theme.typography.lineHeight.display,
    },
    headingDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.base,
      maxWidth: 620,
    },
    optionList: {
      gap: theme.spacing.md,
    },
    privacyRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    privacyText: {
      color: theme.colors.textMuted,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      textAlign: "center",
    },
    infoCard: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.info}10`,
      borderColor: `${theme.colors.info}35`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    infoText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    samplePreview: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      ...theme.shadows.card,
    },
    samplePreviewHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    sampleIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.info}14`,
      borderRadius: theme.borderRadius.medium,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    samplePreviewCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    samplePreviewTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    samplePreviewDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    bulletRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    bulletDot: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 7,
      marginTop: 7,
      width: 7,
    },
    bulletText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      minHeight: 52,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    primaryButtonPressed: {
      opacity: 0.85,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    restoreFootnote: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      textAlign: "center",
    },
  });
}
