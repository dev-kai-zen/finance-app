import { useMemo, useState, type ReactNode } from "react";
import { Host, Switch } from "@expo/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BadgeDollarSign,
  Eye,
  Hash,
  ListOrdered,
  Minus,
  Palette,
} from "lucide-react-native";
import { InfoModal, PageContainer } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import {
  CURRENCY_SYMBOLS,
  type CurrencyPreferences,
  type DecimalFormat,
  type NegativeNumberFormat,
} from "@/utils/currency";
import {
  CURRENCY_NAMES,
  SUPPORTED_CURRENCY_CODES,
} from "../constants/currency-preferences.constants";
import { CurrencyOptionSheet } from "../components/currency-option-sheet";
import { useCurrencyPreferences } from "../hooks/use-currency-preferences";

type SheetKind = "currency" | "negative" | "digits" | "format" | null;

export function CurrencySetupScreen({
  helpVisible,
  onCloseHelp,
}: {
  helpVisible: boolean;
  onCloseHelp: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { preferences, updatePreferences } = useCurrencyPreferences();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [draft, setDraft] = useState<CurrencyPreferences>(preferences);

  const currencyOptions = useMemo(
    () =>
      SUPPORTED_CURRENCY_CODES.map((code) => ({
        label: `${code} · ${CURRENCY_NAMES[code] ?? code}`,
        value: code,
      })),
    [],
  );
  const digitOptions = useMemo(
    () => Array.from({ length: 10 }, (_, value) => ({ label: String(value), value })),
    [],
  );
  const negativeOptions = [
    { label: "-100", value: "minus" as NegativeNumberFormat },
    { label: "(100)", value: "parentheses" as NegativeNumberFormat },
  ];
  const formatOptions = [
    {
      label: t("currency.automaticFormat"),
      value: "automatic" as DecimalFormat,
    },
    { label: "1,234.56", value: "comma-dot" as DecimalFormat },
    { label: "1.234,56", value: "dot-comma" as DecimalFormat },
    { label: "1 234.56", value: "space-dot" as DecimalFormat },
    { label: "1 234,56", value: "space-comma" as DecimalFormat },
  ];

  const openSheet = (kind: Exclude<SheetKind, null>) => {
    setDraft(preferences);
    setSheet(kind);
  };
  const confirmSheet = () => {
    updatePreferences(draft);
    setSheet(null);
  };

  return (
    <PageContainer contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <SettingRow
          icon={<BadgeDollarSign color={theme.colors.primary} size={24} />}
          label={t("currency.defaultCurrency")}
          onPress={() => openSheet("currency")}
          value={`${preferences.defaultCurrency} · ${CURRENCY_NAMES[preferences.defaultCurrency]}`}
        />
        <Divider />
        <SettingRow
          icon={<Eye color={theme.colors.primary} size={24} />}
          label={t("currency.displayCurrency")}
          description={t("currency.displayCurrencyDescription")}
          accessory={
            <Host matchContents>
              <Switch
                value={preferences.displayCurrency}
                onValueChange={(displayCurrency) =>
                  updatePreferences({ displayCurrency })
                }
              />
            </Host>
          }
        />
        <Divider />
        <SettingRow
          icon={<Palette color={theme.colors.primary} size={24} />}
          label={t("currency.colorAmounts")}
          description={t("currency.colorAmountsDescription")}
          accessory={
            <Host matchContents>
              <Switch
                value={preferences.colorAmounts}
                onValueChange={(colorAmounts) =>
                  updatePreferences({ colorAmounts })
                }
              />
            </Host>
          }
        />
        <Divider />
        <SettingRow
          icon={<Minus color={theme.colors.primary} size={24} />}
          label={t("currency.negativeNumber")}
          onPress={() => openSheet("negative")}
          value={preferences.negativeFormat === "minus" ? "-100" : "(100)"}
        />
        <Divider />
        <SettingRow
          icon={<Hash color={theme.colors.primary} size={24} />}
          label={t("currency.decimalDigits")}
          onPress={() => openSheet("digits")}
          value={String(preferences.decimalDigits)}
        />
        <Divider />
        <SettingRow
          icon={<ListOrdered color={theme.colors.primary} size={24} />}
          label={t("currency.decimalFormat")}
          onPress={() => openSheet("format")}
          value={
            formatOptions.find((option) => option.value === preferences.decimalFormat)
              ?.label
          }
        />
      </View>

      <CurrencyOptionSheet
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.ok")}
        description={t("currency.chooseCurrencyDescription")}
        emptyLabel={t("currency.noCurrenciesFound")}
        onChange={(value) => setDraft((current) => ({ ...current, defaultCurrency: value }))}
        onClose={() => setSheet(null)}
        onConfirm={confirmSheet}
        options={currencyOptions}
        selectedValue={draft.defaultCurrency}
        searchable
        searchPlaceholder={t("currency.searchCurrencies")}
        title={t("currency.chooseCurrency")}
        visible={sheet === "currency"}
      />
      <CurrencyOptionSheet
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.ok")}
        description={t("currency.negativeNumberDescription")}
        onChange={(value) => setDraft((current) => ({ ...current, negativeFormat: value }))}
        onClose={() => setSheet(null)}
        onConfirm={confirmSheet}
        options={negativeOptions}
        selectedValue={draft.negativeFormat}
        title={t("currency.negativeNumber")}
        visible={sheet === "negative"}
      />
      <CurrencyOptionSheet
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.ok")}
        description={t("currency.decimalDigitsDescription")}
        onChange={(value) => setDraft((current) => ({ ...current, decimalDigits: value }))}
        onClose={() => setSheet(null)}
        onConfirm={confirmSheet}
        options={digitOptions}
        selectedValue={draft.decimalDigits}
        title={t("currency.decimalDigits")}
        visible={sheet === "digits"}
      />
      <CurrencyOptionSheet
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.ok")}
        description={t("currency.decimalFormatDescription")}
        onChange={(value) => setDraft((current) => ({ ...current, decimalFormat: value }))}
        onClose={() => setSheet(null)}
        onConfirm={confirmSheet}
        options={formatOptions}
        selectedValue={draft.decimalFormat}
        title={t("currency.decimalFormat")}
        visible={sheet === "format"}
      />

      <InfoModal
        message={t("currency.helpMessage")}
        onClose={onCloseHelp}
        title={t("currency.helpTitle")}
        visible={helpVisible}
      />

    </PageContainer>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  accessory,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  value?: string;
  accessory?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const content = (
    <>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {value ? <Text selectable style={styles.value}>{value}</Text> : null}
      </View>
      {accessory}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityLabel={`${label}, ${value ?? ""}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

function Divider() {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.divider} />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: { gap: theme.spacing.md, paddingTop: theme.spacing.md },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 84,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    icon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: theme.borderRadius.round,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    copy: { flex: 1, gap: 2, minWidth: 0 },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    value: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
    },
    divider: { backgroundColor: theme.colors.border, height: 1, marginLeft: 76 },
    pressed: { backgroundColor: theme.colors.surfaceMuted, opacity: 0.82 },
  });
}
