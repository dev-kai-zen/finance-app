import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown } from "lucide-react-native";

import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ProFeatureModal, useProGuard } from "@/modules/pro";
import {
  useExperiencePreferences,
  type FormFieldPreferenceKey,
  type TransactionFormFieldPreferences,
} from "@/modules/settings";

const LOCKED_FIELDS = [
  "amount",
  "account",
  "category",
  "date",
] as const;

const OPTIONAL_FIELDS: FormFieldPreferenceKey[] = [
  "transactionName",
  "attachments",
  "split",
  "installments",
  "labels",
  "note",
  "quickPresets",
  "exactTime",
];

const PRO_FORM_FIELDS: ReadonlySet<FormFieldPreferenceKey> = new Set([
  "attachments",
  "split",
  "installments",
  "labels",
  "quickPresets",
]);

const PRO_FIELD_META: Record<
  string,
  { title: string; description: string }
> = {
  attachments: {
    title: "Receipt Attachments",
    description:
      "Attach photos, invoices, and documents directly to transactions for complete bookkeeping with Kaizen Pro.",
  },
  split: {
    title: "Split Transactions",
    description:
      "Break down single receipts and transactions across multiple categories or accounts with Kaizen Pro.",
  },
  installments: {
    title: "Installments & Subscriptions",
    description:
      "Track installment purchases, recurring payment plans, and pay-off schedules with Kaizen Pro.",
  },
  labels: {
    title: "Custom Labels & Tags",
    description:
      "Tag transactions with custom labels, projects, and event markers for deep dimensional filtering with Kaizen Pro.",
  },
  quickPresets: {
    title: "Quick Presets",
    description:
      "Log frequent transactions in one tap with customized amounts, categories, and account templates with Kaizen Pro.",
  },
};

interface TransactionFormFieldPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TransactionFormFieldPreferencesModal({
  visible,
  onClose,
}: TransactionFormFieldPreferencesModalProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { formFields, setFormField } = useExperiencePreferences();
  const { isPro, guardAction, paywallVisible, closePaywall, guardMeta } =
    useProGuard();

  const labelForOptional = (field: FormFieldPreferenceKey) =>
    t(`transactionForm.fields.${field}` as never);

  const handleToggleField = (
    field: FormFieldPreferenceKey,
    value: boolean,
  ) => {
    if (value && !isPro && PRO_FORM_FIELDS.has(field)) {
      const meta = PRO_FIELD_META[field] ?? {
        title: labelForOptional(field),
        description: `Unlock ${labelForOptional(field)} and advanced transaction customization with Kaizen Pro.`,
      };
      guardAction(
        () => {
          setFormField(field, true);
        },
        {
          featureTitle: meta.title,
          featureDescription: meta.description,
        },
      );
      return;
    }
    setFormField(field, value);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t("transactionForm.customizeFieldsTitle")}
            </Text>
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            {t("transactionForm.customizeFieldsSubtitle")}
          </Text>

          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {LOCKED_FIELDS.map((field) => (
              <View key={field} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>
                    {t(`transactionForm.fields.${field}` as never)}
                  </Text>
                  <Text style={styles.rowHint}>
                    {t("transactionForm.alwaysOn")}
                  </Text>
                </View>
              </View>
            ))}

            {OPTIONAL_FIELDS.map((field) => {
              const isFieldPro = PRO_FORM_FIELDS.has(field);
              return (
                <View key={field} style={styles.row}>
                  <View style={styles.labelRow}>
                    <Text style={styles.rowLabel}>
                      {labelForOptional(field)}
                    </Text>
                    {isFieldPro && !isPro && (
                      <View style={styles.proChip}>
                        <Crown color="#D97706" size={10} />
                        <Text style={styles.proChipText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <ThemedSwitch
                    accessibilityLabel={labelForOptional(field)}
                    onValueChange={(value) => handleToggleField(field, value)}
                    value={
                      formFields[
                        field as keyof TransactionFormFieldPreferences
                      ]
                    }
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      gap: theme.spacing.md,
      maxHeight: "78%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeBtn: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    closeBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 18,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    list: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.lg,
    },
    row: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      minHeight: 52,
      paddingVertical: theme.spacing.sm,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    rowHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    labelRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    proChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(217, 119, 6, 0.4)",
    },
    proChipText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#D97706",
      letterSpacing: 0.4,
    },
  });
}
