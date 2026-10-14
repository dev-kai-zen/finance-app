import { useEffect, useState } from "react";
import {
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
import { GoogleDriveBackupPanel } from "@/modules/google-drive-backup";
import { OnboardingOptionCard } from "@/modules/onboarding/components/onboarding-option-card";
import {
  GuidedAccountStep,
  GuidedCurrencyStep,
  GuidedLanguageStep,
  GuidedReadyStep,
  GuidedWelcomeStep,
  PrimaryButton,
} from "@/modules/onboarding/components/guided-onboarding-steps";
import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";
import { useCurrencyPreferences } from "@/modules/currencies";
import type { InitialAccountTemplate } from "@/modules/accounts";
import { openingAmountInput } from "@/modules/accounts/utils/account-input";
import { useLocalization } from "@/infrastructure/localization";

type OnboardingStep =
  | "welcome"
  | "language"
  | "currency"
  | "account"
  | "ready"
  | "fullSetup"
  | "manual"
  | "recommended"
  | "sample"
  | "restore";

export function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const workspace = useWorkspace();
  const { preferences: currencyPreferences } = useCurrencyPreferences();
  const { t } = useLocalization();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [guidedCurrency, setGuidedCurrency] = useState(
    currencyPreferences.defaultCurrency,
  );
  const [accountTemplate, setAccountTemplate] =
    useState<InitialAccountTemplate>("cash");
  const [accountName, setAccountName] = useState("");
  const [openingAmountMinor, setOpeningAmountMinor] = useState(0);

  useEffect(() => {
    setGuidedCurrency(currencyPreferences.defaultCurrency);
  }, [currencyPreferences.defaultCurrency]);

  const isGuidedFlexStep =
    step === "welcome" ||
    step === "language" ||
    step === "currency" ||
    step === "account" ||
    step === "ready";

  const goBack = () => {
    workspace.clearError();
    if (workspace.personalSetupRequested && step === "welcome") {
      workspace.cancelPersonalSetup();
      return;
    }
    if (step === "language") {
      setStep("welcome");
      return;
    }
    if (step === "currency") {
      setStep("language");
      return;
    }
    if (step === "account") {
      setStep("currency");
      return;
    }
    if (step === "ready") {
      setStep("account");
      return;
    }
    if (step === "fullSetup" || step === "manual" || step === "recommended" || step === "sample" || step === "restore") {
      setStep(workspace.personalSetupRequested ? "welcome" : "welcome");
      return;
    }
    setStep("welcome");
  };

  const stepBody = (
        <View style={[styles.container, isGuidedFlexStep && styles.guidedContainer]}>
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
            workspace.personalSetupRequested ? (
              <WelcomeStep
                disabled={workspace.busy}
                personalOnly
                onChoose={(nextStep) => {
                  workspace.clearError();
                  setStep(nextStep);
                }}
              />
            ) : (
              <View style={styles.guidedStepHost}>
                <GuidedWelcomeStep
                  disabled={workspace.busy}
                  onFullSetup={() => {
                    workspace.clearError();
                    setStep("fullSetup");
                  }}
                  onGetStarted={() => {
                    workspace.clearError();
                    setStep("language");
                  }}
                  onRestore={() => {
                    workspace.clearError();
                    setStep("restore");
                  }}
                  onSample={() => {
                    workspace.clearError();
                    setStep("sample");
                  }}
                />
              </View>
            )
          ) : null}

          {step === "language" ? (
            <View style={styles.guidedStepHost}>
              <GuidedLanguageStep
                onContinue={() => {
                  workspace.clearError();
                  setStep("currency");
                }}
              />
            </View>
          ) : null}

          {step === "currency" ? (
            <View style={styles.guidedStepHost}>
              <GuidedCurrencyStep
                onChange={setGuidedCurrency}
                onContinue={() => {
                  workspace.clearError();
                  setStep("account");
                }}
                selectedCode={guidedCurrency}
              />
            </View>
          ) : null}

          {step === "account" ? (
            <View style={styles.guidedStepHost}>
              <GuidedAccountStep
                accountName={accountName}
                busy={workspace.busy}
                currencyCode={guidedCurrency}
                onChangeName={setAccountName}
                onChangeOpeningAmountMinor={setOpeningAmountMinor}
                onChangeTemplate={setAccountTemplate}
                onContinue={() => {
                  workspace.clearError();
                  setStep("ready");
                }}
                openingAmountMinor={openingAmountMinor}
                template={accountTemplate}
              />
            </View>
          ) : null}

          {step === "ready" ? (
            <View style={styles.guidedStepHost}>
              <GuidedReadyStep
                accountName={accountName}
                busy={workspace.busy}
                currencyCode={guidedCurrency}
                onFinish={() =>
                  void workspace.completeGuidedSetup({
                    currencyCode: guidedCurrency,
                    account: {
                      name: accountName,
                      openingAmount: openingAmountInput(
                        openingAmountMinor,
                        guidedCurrency,
                      ),
                      template: accountTemplate,
                    },
                  })
                }
              />
            </View>
          ) : null}

          {step === "fullSetup" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description={t("onboarding.fullSetupDescription")}
                title={t("onboarding.fullSetupTitle")}
              />
              <View style={styles.optionList}>
                <OnboardingOptionCard
                  description={t("onboarding.manualSetupDescription")}
                  disabled={workspace.busy}
                  icon={<Wallet color={theme.colors.textSecondary} size={23} />}
                  onPress={() => setStep("manual")}
                  title={t("onboarding.manualSetupTitle")}
                />
                <OnboardingOptionCard
                  badge={t("onboarding.recommendedBadge")}
                  description={t("onboarding.recommendedSetupDescription")}
                  disabled={workspace.busy}
                  icon={<Sparkles color={theme.colors.primary} size={23} />}
                  onPress={() => setStep("recommended")}
                  title={t("onboarding.recommendedSetupTitle")}
                />
              </View>
            </View>
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
                  "Cash, payroll bank, emergency savings (with a pocket), and e-wallet",
                  "Everyday credit card and a personal loan liability",
                  "Complete income and expense category groups with subcategories",
                  "Realistic opening balances in PHP — no sample transaction history",
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
                  "8 accounts: assets, two extra liabilities, credit card, and one archived account",
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
              <GoogleDriveBackupPanel />
              <Text style={styles.restoreFootnote}>
                After a successful restore, the app will reopen using the restored
                accounts and transaction history.
              </Text>
            </View>
          ) : null}
        </View>
  );

  return (
    <View style={styles.screen}>
      {isGuidedFlexStep ? (
        <View style={[styles.guidedScreen, styles.scrollContent]}>
          {stepBody}
        </View>
      ) : (
        <KeyboardAwareForm
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
        >
          {stepBody}
        </KeyboardAwareForm>
      )}

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
          badge="Recommended"
          description="Employee-friendly accounts, liabilities, and complete category presets with realistic opening balances."
          disabled={disabled}
          icon={<Sparkles color={theme.colors.primary} size={23} />}
          onPress={() => onChoose("recommended")}
          title="Use recommended setup"
        />
        <OnboardingOptionCard
          description="Define your own account types, accounts, category groups, and subcategories with a guided checklist."
          disabled={disabled}
          icon={<Wallet color={theme.colors.textSecondary} size={23} />}
          onPress={() => onChoose("manual")}
          title="Start from scratch"
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
    guidedStepHost: {
      flex: 1,
      minHeight: 0,
      width: "100%",
    },
    container: {
      gap: theme.spacing.xl,
      maxWidth: 720,
      width: "100%",
    },
    guidedScreen: {
      flex: 1,
    },
    guidedContainer: {
      flex: 1,
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
