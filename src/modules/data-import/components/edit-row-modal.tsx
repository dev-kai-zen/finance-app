import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { X, Check } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import type { NormalizedTransactionType, ParsedDataRow } from "../types/data-import.types";

interface EditRowModalProps {
  visible: boolean;
  row: ParsedDataRow | null;
  onClose: () => void;
  onApply: (rowNumber: number, override: Partial<ParsedDataRow>) => void;
}

export function EditRowModal({ visible, row, onClose, onApply }: EditRowModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (!row) return null;

  return (
    <EditRowModalContent
      key={row.rowNumber}
      onApply={onApply}
      onClose={onClose}
      row={row}
      styles={styles}
      theme={theme}
      visible={visible}
    />
  );
}

function EditRowModalContent({
  visible,
  row,
  theme,
  styles,
  onClose,
  onApply,
}: {
  visible: boolean;
  row: ParsedDataRow;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onApply: (rowNumber: number, override: Partial<ParsedDataRow>) => void;
}) {
  const exponent = getCurrencyMinorUnitExponent(row.currencyCode || "PHP");

  const [dateStr, setDateStr] = useState(row.date ? row.date.toISOString().split("T")[0] : "");
  const [type, setType] = useState<NormalizedTransactionType>(row.type || "expense");
  const [amountStr, setAmountStr] = useState(
    row.amountMinorUnits !== undefined
      ? (Math.abs(row.amountMinorUnits) / 10 ** exponent).toString()
      : "",
  );
  const [accountName, setAccountName] = useState(row.accountName || "");
  const [toAccountName, setToAccountName] = useState(row.toAccountName || "");
  const [categoryName, setCategoryName] = useState(row.categoryName || "");
  const [subcategoryName, setSubcategoryName] = useState(row.subcategoryName || "");
  const [description, setDescription] = useState(row.description || "");
  const [note, setNote] = useState(row.note || "");
  const [labelsStr, setLabelsStr] = useState(row.labels ? row.labels.join("; ") : "");

  const handleSave = () => {
    let parsedDate: Date | undefined;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const major = parseFloat(amountStr.replace(/,/g, "")) || 0;
    const minorUnits = Math.round(major * 10 ** exponent) * (type === "expense" ? -1 : 1);

    const labels = labelsStr
      .split(";")
      .map((l) => l.trim())
      .filter(Boolean);

    onApply(row.rowNumber, {
      date: parsedDate,
      type,
      amountMinorUnits: minorUnits,
      accountName: accountName.trim(),
      toAccountName: toAccountName.trim() || undefined,
      categoryName: categoryName.trim() || undefined,
      subcategoryName: subcategoryName.trim() || undefined,
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      labels: labels.length > 0 ? labels : undefined,
    });

    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit row #{row.rowNumber}</Text>
            <Pressable accessibilityLabel="Cancel edit" onPress={onClose} style={styles.closeBtn}>
              <X color={theme.colors.textSecondary} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              onChangeText={setDateStr}
              placeholder="2026-03-24"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={dateStr}
            />

            <Text style={styles.label}>Transaction type</Text>
            <View style={styles.typeRow}>
              {(["expense", "income", "transfer"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              keyboardType="numeric"
              onChangeText={setAmountStr}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={amountStr}
            />

            <Text style={styles.label}>Account name</Text>
            <TextInput
              onChangeText={setAccountName}
              placeholder="Account"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={accountName}
            />

            {type === "transfer" ? (
              <>
                <Text style={styles.label}>Destination account</Text>
                <TextInput
                  onChangeText={setToAccountName}
                  placeholder="To Account"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  value={toAccountName}
                />
              </>
            ) : null}

            {type !== "transfer" ? (
              <>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  onChangeText={setCategoryName}
                  placeholder="Category"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  value={categoryName}
                />

                <Text style={styles.label}>Subcategory</Text>
                <TextInput
                  onChangeText={setSubcategoryName}
                  placeholder="Subcategory"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  value={subcategoryName}
                />
              </>
            ) : null}

            <Text style={styles.label}>Description / Payee</Text>
            <TextInput
              onChangeText={setDescription}
              placeholder="Name or payee"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={description}
            />

            <Text style={styles.label}>Note</Text>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Additional details"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { height: 60 }]}
              value={note}
            />

            <Text style={styles.label}>Labels (separated by semicolons)</Text>
            <TextInput
              onChangeText={setLabelsStr}
              placeholder="Groceries; Food"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={labelsStr}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={handleSave} style={styles.applyBtn}>
              <Check color={theme.colors.primaryContrast} size={18} />
              <Text style={styles.applyBtnText}>Apply draft</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.colors.cardBackground,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: "85%",
      padding: theme.spacing.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
    },
    closeBtn: {
      padding: 4,
    },
    body: {
      marginVertical: theme.spacing.xs,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      marginTop: theme.spacing.sm,
      marginBottom: 4,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.text,
    },
    typeRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    typeBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}18`,
    },
    typeBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    typeBtnTextActive: {
      color: theme.colors.primary,
    },
    footer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    applyBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 12,
    },
    applyBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.primaryContrast,
    },
  });
}

