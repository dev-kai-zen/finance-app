import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  Check,
  CloudDownload,
  Database,
  FlaskConical,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react-native";

import { KeyboardAwareForm } from "@/components/keyboard-aware-form";
import { APP_BRAND } from "@/constants/brand";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { GoogleDriveBackupSettings } from "@/modules/backup";
import { OnboardingOptionCard } from "@/modules/onboarding/components/onboarding-option-card";
import { useWorkspace } from "@/modules/onboarding/providers/workspace-provider";
import type { InitialAccountTemplate } from "@/modules/accounts";
import type { CategorySetup } from "@/modules/categories";

type OnboardingStep = "welcome" | "personal" | "sample" | "restore";

const ACCOUNT_TEMPLATES: Array<{
  id: InitialAccountTemplate;
  label: string;
  defaultName: string;
  icon: typeof Wallet;
}> = [
  { id: "bank", label: "Bank", defaultName: "Everyday Account", icon: Landmark },
  { id: "cash", label: "Cash", defaultName: "Cash Wallet", icon: Wallet },
  { id: "ewallet", label: "E-Wallet", defaultName: "Everyday E-Wallet", icon: Smartphone },
  { id: "savings", label: "Savings", defaultName: "Savings Account", icon: PiggyBank },
];

export function OnboardingScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const workspace = useWorkspace();
  const [step, setStep] = useState<OnboardingStep>(() =>
    workspace.personalSetupRequested ? "personal" : "welcome",
  );
  const [template, setTemplate] = useState<InitialAccountTemplate>("bank");
  const [accountName, setAccountName] = useState("Everyday Account");
  const [openingAmount, setOpeningAmount] = useState("0.00");
  const [categorySetup, setCategorySetup] =
    useState<CategorySetup>("recommended");
  const [nameEdited, setNameEdited] = useState(false);

  const chooseTemplate = (nextTemplate: InitialAccountTemplate) => {
    setTemplate(nextTemplate);
    if (!nameEdited) {
      setAccountName(
        ACCOUNT_TEMPLATES.find(({ id }) => id === nextTemplate)?.defaultName ??
          "My Account",
      );
    }
  };

  const goBack = () => {
    workspace.clearError();
    if (workspace.personalSetupRequested) {
      workspace.cancelPersonalSetup();
      return;
    }
    setStep("welcome");
  };

  const submitPersonalSetup = async () => {
    await workspace.completePersonalSetup({
      account: { name: accountName, openingAmount, template },
      categorySetup,
    });
  };

  return (
    <View style={styles.screen}>
      <KeyboardAwareForm
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.container}>
          {step !== "welcome" ? (
            <Pressable
              accessibilityLabel={
                workspace.personalSetupRequested
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
                {workspace.personalSetupRequested ? "Back to sample" : "Back"}
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
              onChoose={(nextStep) => {
                workspace.clearError();
                setStep(nextStep);
              }}
            />
          ) : null}

          {step === "personal" ? (
            <View style={styles.stepContent}>
              <StepHeading
                description="Create one real account now. You can add more accounts and customize everything later."
                title="Set up your finances"
              />

              {workspace.state.mode === "sample" ? (
                <View style={styles.infoCard}>
                  <ShieldCheck color={theme.colors.info} size={20} />
                  <Text style={styles.infoText}>
                    Finishing setup replaces all fictional sample records. Your
                    selected category starter set will remain.
                  </Text>
                </View>
              ) : null}

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>PRIMARY CURRENCY</Text>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyValue}>Philippine peso</Text>
                  <Text style={styles.currencyCode}>PHP</Text>
                </View>
                <Text style={styles.helperText}>
                  Multi-currency account creation can be added later; the current
                  app records new accounts in PHP.
                </Text>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>FIRST ACCOUNT</Text>
                <View style={styles.templateGrid}>
                  {ACCOUNT_TEMPLATES.map((item) => {
                    const Icon = item.icon;
                    const selected = item.id === template;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityLabel={`${item.label} account`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={workspace.busy}
                        onPress={() => chooseTemplate(item.id)}
                        style={({ pressed }) => [
                          styles.templateButton,
                          selected && styles.templateButtonSelected,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Icon
                          color={
                            selected
                              ? theme.colors.primary
                              : theme.colors.textSecondary
                          }
                          size={20}
                        />
                        <Text
                          style={[
                            styles.templateLabel,
                            selected && styles.templateLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Account name</Text>
                  <TextInput
                    accessibilityLabel="Account name"
                    autoCapitalize="words"
                    editable={!workspace.busy}
                    maxLength={100}
                    onChangeText={(value) => {
                      setNameEdited(true);
                      setAccountName(value);
                    }}
                    placeholder="e.g. Everyday Account"
                    placeholderTextColor={theme.colors.textMuted}
                    returnKeyType="next"
                    style={styles.textInput}
                    value={accountName}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Current balance</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountPrefix}>₱</Text>
                    <TextInput
                      accessibilityLabel="Current account balance"
                      editable={!workspace.busy}
                      keyboardType="decimal-pad"
                      onChangeText={setOpeningAmount}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textMuted}
                      returnKeyType="done"
                      style={styles.amountInput}
                      value={openingAmount}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    This becomes the account’s opening balance as of today.
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>CATEGORY STARTER SET</Text>
                <View style={styles.optionList}>
                  <OnboardingOptionCard
                    badge="Recommended"
                    description="Complete groups for bills, food, transport, health, income, and more."
                    disabled={workspace.busy}
                    icon={<Sparkles color={theme.colors.primary} size={22} />}
                    onPress={() => setCategorySetup("recommended")}
                    selected={categorySetup === "recommended"}
                    title="Recommended categories"
                  />
                  <OnboardingOptionCard
                    description="Only salary, food, transport, utilities, and fallback categories."
                    disabled={workspace.busy}
                    icon={<Check color={theme.colors.success} size={22} />}
                    onPress={() => setCategorySetup("essentials")}
                    selected={categorySetup === "essentials"}
                    title="Essentials only"
                  />
                </View>
              </View>

              <WorkspaceError message={workspace.error} />
              <PrimaryButton
                disabled={workspace.busy}
                label="Create my workspace"
                loading={workspace.busy}
                onPress={() => void submitPersonalSetup()}
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

              <WorkspaceError message={workspace.error} />
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
    </View>
  );
}

function WelcomeStep({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (step: Exclude<OnboardingStep, "welcome">) => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.stepContent}>
      <StepHeading
        description="Begin with your real finances, explore a safe fictional workspace, or restore an existing backup."
        title="How would you like to begin?"
      />
      <View style={styles.optionList}>
        <OnboardingOptionCard
          badge="Recommended"
          description="Create your first real account and choose a category starter set."
          disabled={disabled}
          icon={<Landmark color={theme.colors.primary} size={23} />}
          onPress={() => onChoose("personal")}
          title="Set up my finances"
        />
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

function WorkspaceError({ message }: { message: string | null }) {
  const styles = useThemeStyles(createStyles);
  return message ? (
    <View accessibilityRole="alert" style={styles.errorCard}>
      <Text selectable style={styles.errorText}>
        {message}
      </Text>
    </View>
  ) : null;
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
    formSection: {
      gap: theme.spacing.md,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    readonlyField: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
    },
    readonlyValue: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    currencyCode: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    templateGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    templateButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexBasis: "47%",
      flexDirection: "row",
      flexGrow: 1,
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    templateButtonSelected: {
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: theme.colors.primary,
    },
    templateLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    templateLabelSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    fieldGroup: {
      gap: theme.spacing.sm,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    amountInputRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
    },
    amountPrefix: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    amountInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontVariant: ["tabular-nums"],
      minHeight: 50,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
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
    errorCard: {
      backgroundColor: `${theme.colors.danger}10`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
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
