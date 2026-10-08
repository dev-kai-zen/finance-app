import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
import { useCurrencies } from "@/modules/currencies/hooks/use-currencies";

export function TransactionCurrencyPickerModal({
  visible,
  selectedCode,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedCode: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { currencies, loading } = useCurrencies();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = currencies.filter((c) => c.isActive);
    if (!q) return active;
    return active.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [currencies, search]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Transaction currency</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
              <X color={theme.colors.textSecondary} size={22} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Amounts are entered in this currency. Your account balance uses the account
            currency at the current rate when they differ.
          </Text>
          <AccountSearchBox
            clearAccessibilityLabel="Clear"
            placeholder="Search currencies"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {loading ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : filtered.length === 0 ? (
              <Text style={styles.muted}>No currencies found.</Text>
            ) : (
              filtered.map((currency) => {
                const selected =
                  currency.code.toUpperCase() === selectedCode.trim().toUpperCase();
                return (
                  <Pressable
                    key={currency.code}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelect(currency.code);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.symbolBadge}>
                      <Text style={styles.symbolText}>{currency.symbol.trim()}</Text>
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.code}>{currency.code}</Text>
                      <Text style={styles.name} numberOfLines={1}>
                        {currency.name}
                      </Text>
                    </View>
                    {selected ? <Text style={styles.check}>Selected</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      gap: theme.spacing.md,
      maxHeight: "78%",
      paddingBottom: theme.spacing.xl,
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
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    list: { gap: theme.spacing.xs, paddingBottom: theme.spacing.lg },
    row: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    rowSelected: {
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}55`,
    },
    pressed: { opacity: 0.85 },
    symbolBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      minWidth: 40,
    },
    symbolText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    copy: { flex: 1, minWidth: 0 },
    code: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    name: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    check: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    muted: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      paddingVertical: theme.spacing.lg,
      textAlign: "center",
    },
  });
}
