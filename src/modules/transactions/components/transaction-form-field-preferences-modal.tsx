import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
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

  const labelForOptional = (field: FormFieldPreferenceKey) =>
    t(`transactionForm.fields.${field}` as never);

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

            {OPTIONAL_FIELDS.map((field) => (
              <View key={field} style={styles.row}>
                <Text style={styles.rowLabel}>{labelForOptional(field)}</Text>
                <ThemedSwitch
                  accessibilityLabel={labelForOptional(field)}
                  onValueChange={(value) => setFormField(field, value)}
                  value={formFields[field as keyof TransactionFormFieldPreferences]}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
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
  });
}
