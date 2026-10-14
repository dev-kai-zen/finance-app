import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check } from "lucide-react-native";

import {
  AmountCalculatorField,
  AmountCalculatorModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  CURRENCY_NAMES,
  SUPPORTED_CURRENCY_CODES,
} from "@/modules/currencies";
import {
  SUPPORTED_LANGUAGES,
  useLocalization,
  type LanguagePreference,
} from "@/infrastructure/localization";
import type { InitialAccountTemplate } from "@/modules/accounts";
import {
  GUIDED_ONBOARDING_PROGRESS_INDEX,
  GUIDED_ONBOARDING_STEP_COUNT,
} from "@/modules/onboarding/constants/guided-onboarding.constants";
import { OnboardingStepShell } from "@/modules/onboarding/components/onboarding-step-shell";

const ACCOUNT_TEMPLATES: Array<{
  id: InitialAccountTemplate;
  labelKey: string;
}> = [
  { id: "cash", labelKey: "onboarding.accountTemplateCash" },
  { id: "bank", labelKey: "onboarding.accountTemplateBank" },
  { id: "ewallet", labelKey: "onboarding.accountTemplateEwallet" },
  { id: "savings", labelKey: "onboarding.accountTemplateSavings" },
];

const guidedProgress = GUIDED_ONBOARDING_PROGRESS_INDEX;
const guidedTotal = GUIDED_ONBOARDING_STEP_COUNT;

export function GuidedWelcomeStep({
  disabled,
  onGetStarted,
  onRestore,
  onSample,
  onFullSetup,
}: {
  disabled: boolean;
  onGetStarted: () => void;
  onRestore: () => void;
  onSample: () => void;
  onFullSetup: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <OnboardingStepShell
      description={t("onboarding.welcomeDescription")}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            disabled={disabled}
            label={t("onboarding.getStarted")}
            loading={false}
            onPress={onGetStarted}
          />
          <View style={styles.quietLinks}>
            <QuietLink disabled={disabled} label={t("onboarding.restoreBackup")} onPress={onRestore} />
            <QuietLink disabled={disabled} label={t("onboarding.seeExample")} onPress={onSample} />
            <QuietLink disabled={disabled} label={t("onboarding.setupMyself")} onPress={onFullSetup} />
          </View>
        </View>
      }
      progressIndex={guidedProgress.welcome}
      progressTotal={guidedTotal}
      title={t("onboarding.welcomeTitle")}
    >
      <View style={styles.bulletList}>
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.bulletRow}>
            <Check color={theme.colors.success} size={18} />
            <Text style={styles.bulletText}>
              {t(`onboarding.welcomePoint${index}` as never)}
            </Text>
          </View>
        ))}
      </View>
    </OnboardingStepShell>
  );
}

export function GuidedLanguageStep({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { preference, setLanguagePreference, t } = useLocalization();

  const select = (next: LanguagePreference) => {
    setLanguagePreference(next);
    onContinue();
  };

  return (
    <OnboardingStepShell
      description={t("onboarding.languageDescription")}
      progressIndex={guidedProgress.language}
      progressTotal={guidedTotal}
      title={t("onboarding.languageTitle")}
    >
      <View style={styles.optionList}>
        <Pressable
          accessibilityRole="button"
          onPress={() => select("system")}
          style={({ pressed }) => [
            styles.choiceRow,
            preference === "system" && styles.choiceRowActive,
            pressed && styles.choiceRowPressed,
          ]}
        >
          <Text style={styles.choiceLabel}>{t("language.systemDefault")}</Text>
          {preference === "system" ? (
            <Check color={theme.colors.primary} size={18} />
          ) : null}
        </Pressable>
        {SUPPORTED_LANGUAGES.map((language) => (
          <Pressable
            key={language.code}
            accessibilityRole="button"
            onPress={() => select(language.code)}
            style={({ pressed }) => [
              styles.choiceRow,
              preference === language.code && styles.choiceRowActive,
              pressed && styles.choiceRowPressed,
            ]}
          >
            <Text style={styles.choiceLabel}>{language.nativeName}</Text>
            {preference === language.code ? (
              <Check color={theme.colors.primary} size={18} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </OnboardingStepShell>
  );
}

export function GuidedCurrencyStep({
  selectedCode,
  onChange,
  onContinue,
}: {
  selectedCode: string;
  onChange: (code: string) => void;
  onContinue: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const codes = useMemo(() => SUPPORTED_CURRENCY_CODES, []);

  return (
    <OnboardingStepShell
      description={t("onboarding.currencyDescription")}
      footer={
        <PrimaryButton
          disabled={false}
          label={t("onboarding.continue")}
          loading={false}
          onPress={onContinue}
        />
      }
      progressIndex={guidedProgress.currency}
      progressTotal={guidedTotal}
      title={t("onboarding.currencyTitle")}
    >
      <View style={styles.optionList}>
        {codes.map((code) => {
          const active = selectedCode === code;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              onPress={() => onChange(code)}
              style={({ pressed }) => [
                styles.choiceRow,
                active && styles.choiceRowActive,
                pressed && styles.choiceRowPressed,
              ]}
            >
              <View style={styles.choiceCopy}>
                <Text style={styles.choiceLabel}>{code}</Text>
                <Text style={styles.choiceHint}>{CURRENCY_NAMES[code]}</Text>
              </View>
              {active ? <Check color={theme.colors.primary} size={18} /> : null}
            </Pressable>
          );
        })}
      </View>
    </OnboardingStepShell>
  );
}

export function GuidedAccountStep({
  accountName,
  currencyCode,
  openingAmountMinor,
  template,
  onChangeName,
  onChangeOpeningAmountMinor,
  onChangeTemplate,
  onContinue,
  busy,
}: {
  accountName: string;
  currencyCode: string;
  openingAmountMinor: number;
  template: InitialAccountTemplate;
  onChangeName: (value: string) => void;
  onChangeOpeningAmountMinor: (minorUnits: number) => void;
  onChangeTemplate: (value: InitialAccountTemplate) => void;
  onContinue: () => void;
  busy: boolean;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  return (
    <OnboardingStepShell
      description={t("onboarding.accountDescription")}
      footer={
        <PrimaryButton
          disabled={busy || !accountName.trim()}
          label={t("onboarding.continue")}
          loading={busy}
          onPress={onContinue}
        />
      }
      progressIndex={guidedProgress.account}
      progressTotal={guidedTotal}
      title={t("onboarding.accountTitle")}
    >
      <Text style={styles.fieldLabel}>{t("onboarding.accountTypeLabel")}</Text>
      <View style={styles.chipRow}>
        {ACCOUNT_TEMPLATES.map((item) => {
          const active = template === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChangeTemplate(item.id)}
              style={[
                styles.chip,
                active && {
                  backgroundColor: `${theme.colors.primary}18`,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Text style={[styles.chipText, active && { color: theme.colors.primary }]}>
                {t(item.labelKey as never)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.fieldLabel}>{t("onboarding.accountNameLabel")}</Text>
      <TextInput
        maxLength={100}
        onChangeText={onChangeName}
        placeholder={t("onboarding.accountNamePlaceholder")}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textInput}
        value={accountName}
      />
      <AmountCalculatorField
        amountMinorUnits={openingAmountMinor}
        currencyCode={currencyCode}
        label={t("onboarding.openingBalanceLabel")}
        onOpenCalculator={() => setCalculatorOpen(true)}
        showCurrencyPill={false}
        showSignToggle={false}
      />
      <Text style={styles.helperText}>{t("onboarding.openingBalanceHint")}</Text>
      <AmountCalculatorModal
        currencyCode={currencyCode}
        initialMinorUnits={openingAmountMinor}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(minorUnits) => {
          onChangeOpeningAmountMinor(Math.abs(minorUnits));
          setCalculatorOpen(false);
        }}
        title={t("onboarding.openingBalanceLabel")}
        visible={calculatorOpen}
      />
    </OnboardingStepShell>
  );
}

export function GuidedReadyStep({
  accountName,
  currencyCode,
  busy,
  onFinish,
}: {
  accountName: string;
  currencyCode: string;
  busy: boolean;
  onFinish: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <OnboardingStepShell
      description={t("onboarding.readyDescription")}
      footer={
        <PrimaryButton
          disabled={busy}
          label={t("onboarding.finishSetup")}
          loading={busy}
          onPress={onFinish}
        />
      }
      progressIndex={guidedProgress.ready}
      progressTotal={guidedTotal}
      title={t("onboarding.readyTitle")}
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLine}>
          {t("onboarding.readyCurrency", { currency: currencyCode })}
        </Text>
        <Text style={styles.summaryLine}>
          {t("onboarding.readyAccount", { name: accountName.trim() })}
        </Text>
      </View>
    </OnboardingStepShell>
  );
}

function QuietLink({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quietLink, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.quietLinkText}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
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
    footerStack: { gap: theme.spacing.md },
    bulletList: { gap: theme.spacing.sm },
    bulletRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    bulletText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    quietLinks: {
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    quietLink: { minHeight: 44, justifyContent: "center" },
    quietLinkText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    optionList: { gap: theme.spacing.xs },
    choiceRow: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    choiceRowActive: {
      borderColor: `${theme.colors.primary}55`,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    choiceRowPressed: { opacity: 0.85 },
    choiceCopy: { flex: 1, gap: 2 },
    choiceLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    choiceHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    fieldLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
    chip: {
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    summaryLine: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
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
    primaryButtonPressed: { opacity: 0.85 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
