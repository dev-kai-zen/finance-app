import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  type ListRenderItemInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountSearchBox } from "@/modules/accounts";
import { PageLoadingState } from "@/components/page-container";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import { useCurrencyOptions } from "../hooks/use-currency-options";
import type { Currency } from "../types/currency.types";

export interface CurrencyPickerModalProps {
  visible: boolean;
  selectedCode: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}

export function CurrencyPickerModal(props: CurrencyPickerModalProps) {
  if (!props.visible) return null;
  return <CurrencyPickerModalContent {...props} />;
}

function CurrencyPickerModalContent({
  visible,
  selectedCode,
  title = "Select currency",
  subtitle,
  onClose,
  onSelect,
}: CurrencyPickerModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { currencies, loading } = useCurrencyOptions();
  const [search, setSearch] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const selectionPendingRef = useRef(false);
  const cancelSelectionRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelSelectionRef.current?.(), []);

  const handleClose = useCallback(() => {
    cancelSelectionRef.current?.();
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSelect = useCallback((code: string) => {
    if (selectionPendingRef.current) return;
    selectionPendingRef.current = true;
    setPendingCode(code);
    Keyboard.dismiss();
    cancelSelectionRef.current = scheduleAfterPaint(() => {
      cancelSelectionRef.current = null;
      onSelect(code);
      handleClose();
    });
  }, [onSelect, handleClose]);

  const effectiveSelectedCode = (pendingCode ?? selectedCode).trim().toUpperCase();
  const renderItem = useCallback(({ item }: ListRenderItemInfo<Currency>) => (
    <CurrencyRow
      currency={item}
      selected={item.code.toUpperCase() === effectiveSelectedCode}
      disabled={pendingCode !== null}
      onSelect={handleSelect}
    />
  ), [effectiveSelectedCode, pendingCode, handleSelect]);

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
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.overlay}
      >
        <Pressable accessibilityLabel="Close" style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={handleClose}>
              <X color={theme.colors.textSecondary} size={22} />
            </Pressable>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <AccountSearchBox
            accessibilityLabel="Search currencies"
            clearAccessibilityLabel="Clear"
            placeholder="Search currencies"
            value={search}
            onChangeText={setSearch}
          />
          {loading ? (
            <PageLoadingState message="Loading currencies" variant="list" />
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={currencyKeyExtractor}
              extraData={effectiveSelectedCode}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={5}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={CurrencySeparator}
              ListEmptyComponent={<Text style={styles.muted}>No currencies found.</Text>}
              keyboardShouldPersistTaps="handled"
              style={styles.listScroll}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function currencyKeyExtractor(currency: Currency): string {
  return currency.code;
}

function CurrencySeparator() {
  const styles = useThemeStyles(createStyles);
  return <View style={styles.separator} />;
}

const CurrencyRow = memo(function CurrencyRow({
  currency,
  selected,
  disabled,
  onSelect,
}: {
  currency: Currency;
  selected: boolean;
  disabled: boolean;
  onSelect: (code: string) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const handlePress = useCallback(() => onSelect(currency.code), [onSelect, currency.code]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={handlePress}
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
        <Text style={styles.name} numberOfLines={1}>{currency.name}</Text>
      </View>
      {selected ? <Text style={styles.check}>Selected</Text> : null}
    </Pressable>
  );
});

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
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      width: "100%",
    },
    listScroll: {
      flexGrow: 0,
      flexShrink: 1,
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
    list: { paddingBottom: theme.spacing.lg },
    separator: { height: theme.spacing.xs },
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
