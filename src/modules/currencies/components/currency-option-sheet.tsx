import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface CurrencyOption<T extends string | number> {
  label: string;
  value: T;
}

export function CurrencyOptionSheet<T extends string | number>({
  title,
  description,
  options,
  selectedValue,
  visible,
  cancelLabel,
  confirmLabel,
  searchable = false,
  searchPlaceholder = "Search",
  emptyLabel = "No matching options",
  onChange,
  onClose,
  onConfirm,
}: {
  title: string;
  description?: string;
  options: CurrencyOption<T>[];
  selectedValue: T;
  visible: boolean;
  cancelLabel: string;
  confirmLabel: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  onChange: (value: T) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${String(option.value)}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Pressable
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalBackdrop}
        />

        <View
          style={[
            styles.modalPanel,
            isDesktop && styles.modalPanelDesktop,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                {title}
              </Text>
              {description ? (
                <Text style={styles.modalDescription}>{description}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={cancelLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalClose,
                pressed && styles.pressed,
              ]}
            >
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>

          {searchable ? (
            <View style={styles.searchField}>
              <Search color={theme.colors.textMuted} size={18} />
              <TextInput
                accessibilityLabel={searchPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
            </View>
          ) : null}

          <View style={styles.modalToolbar}>
            <Text style={styles.optionCount}>
              {filteredOptions.length} / {options.length}
            </Text>
          </View>

          <FlatList
            contentContainerStyle={styles.options}
            data={filteredOptions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(option) => String(option.value)}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Search color={theme.colors.textMuted} size={28} />
                <Text style={styles.emptyLabel}>{emptyLabel}</Text>
              </View>
            }
            renderItem={({ item: option }) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => onChange(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator
            style={styles.optionsList}
          />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={styles.actionText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                styles.confirmAction,
                pressed && styles.confirmActionPressed,
              ]}
            >
              <Text style={styles.confirmActionText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    modalPanel: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "88%",
      overflow: "hidden",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      width: "100%",
      ...theme.shadows.modal,
    },
    modalPanelDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 620,
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    modalTitleCopy: { flex: 1, gap: theme.spacing.xs },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    modalDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    modalClose: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    searchField: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      minHeight: 46,
      paddingVertical: 0,
    },
    modalToolbar: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    optionCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    optionsList: { flexGrow: 0, maxHeight: 460 },
    options: { gap: theme.spacing.sm, paddingVertical: theme.spacing.md },
    option: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    optionSelected: {
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: theme.colors.primary,
    },
    radio: {
      alignItems: "center",
      borderColor: theme.colors.textSecondary,
      borderRadius: 13,
      borderWidth: 2,
      height: 26,
      justifyContent: "center",
      width: 26,
    },
    radioSelected: { borderColor: theme.colors.primary },
    radioDot: {
      backgroundColor: theme.colors.primary,
      borderRadius: 7,
      height: 14,
      width: 14,
    },
    optionLabel: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
    },
    emptyState: {
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 150,
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    emptyLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
    },
    actions: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
      paddingTop: theme.spacing.md,
    },
    action: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 88,
      paddingHorizontal: theme.spacing.lg,
    },
    actionText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    confirmAction: { backgroundColor: theme.colors.primary },
    confirmActionPressed: { opacity: 0.76 },
    confirmActionText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pressed: { opacity: 0.78 },
  });
}
