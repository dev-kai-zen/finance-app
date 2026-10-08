import { ChevronRight, Coins, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ConfirmModal,
  FullScreenFormModal,
  NotificationModal,
} from "@/components";
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useCurrencies } from "../hooks/use-currencies";
import { useCurrencyMutations } from "../hooks/use-currency-mutations";
import type { CurrencyListItem } from "../types/currency.types";

type EditorValue = {
  code: string;
  name: string;
  symbol: string;
  minorUnitExponent: string;
};

type EditorState = {
  mode: "create" | "edit";
  source: CurrencyListItem | null;
  value: EditorValue;
};

const emptyEditor = (): EditorValue => ({
  code: "",
  name: "",
  symbol: "",
  minorUnitExponent: "2",
});

export function CurrencyCatalogModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { currencies, loading, refresh } = useCurrencies();
  const mutations = useCurrencyMutations(refresh);
  const [searchQuery, setSearchQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      setEditor(null);
      setConfirmDelete(false);
      mutations.clearError();
    }
  }, [visible]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return currencies;
    return currencies.filter(
      (currency) =>
        currency.code.toLocaleLowerCase().includes(normalizedSearch) ||
        currency.name.toLocaleLowerCase().includes(normalizedSearch) ||
        currency.symbol.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [currencies, normalizedSearch]);

  const openCreate = () => {
    mutations.clearError();
    setEditor({ mode: "create", source: null, value: emptyEditor() });
  };

  const openEdit = (currency: CurrencyListItem) => {
    mutations.clearError();
    setEditor({
      mode: "edit",
      source: currency,
      value: {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        minorUnitExponent: String(currency.minorUnitExponent),
      },
    });
  };

  const requestBack = () => {
    if (editor) {
      setEditor(null);
      return;
    }
    onClose();
  };

  const parseExponent = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!/^\d{1,2}$/.test(trimmed)) return null;
    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < 0 || value > 18) return null;
    return value;
  };

  const saveEditor = () => {
    if (!editor) return;
    const exponent = parseExponent(editor.value.minorUnitExponent);
    if (exponent === null) return;

    const ok =
      editor.mode === "create"
        ? mutations.create({
            code: editor.value.code.trim().toUpperCase(),
            name: editor.value.name.trim(),
            symbol: editor.value.symbol.trim(),
            minorUnitExponent: exponent,
          })
        : mutations.update({
            code: editor.value.code,
            name: editor.value.name.trim(),
            symbol: editor.value.symbol.trim(),
            minorUnitExponent: exponent,
          });

    if (ok) setEditor(null);
  };

  const confirmRemove = () => {
    if (!editor?.source?.isCustom) return;
    const ok = mutations.remove(editor.source.code);
    setConfirmDelete(false);
    if (ok) setEditor(null);
  };

  const editorLocked = editor?.mode === "edit" && editor.source?.isUsed;
  const canEditIdentity =
    editor?.mode === "create" ||
    (editor?.mode === "edit" && editor.source?.isCustom && !editor.source.isUsed);
  const canEditExponent = !editorLocked;
  const canSave =
    !editorLocked &&
    editor?.value.name.trim() &&
    editor?.value.symbol.trim() &&
    parseExponent(editor.value.minorUnitExponent) !== null &&
    (editor.mode === "edit" || /^[A-Z0-9]{3,8}$/.test(editor.value.code.trim().toUpperCase()));

  const managerHeader = (
    <Pressable
      accessibilityLabel={t("currency.addCurrency")}
      accessibilityRole="button"
      disabled={mutations.pending}
      onPress={openCreate}
      style={({ pressed }) => [styles.headerAddBtn, pressed && styles.pressed]}
    >
      <Plus color={theme.colors.primary} size={22} />
    </Pressable>
  );

  const title = editor
    ? editor.mode === "create"
      ? t("currency.addCurrency")
      : editor.source?.code ?? t("currency.catalogTitle")
    : t("currency.catalogTitle");

  return (
    <>
      <FullScreenFormModal
        deleteDisabled={mutations.pending || editorLocked || !editor?.source?.isCustom}
        pending={mutations.pending}
        saveDisabled={!canSave || mutations.pending}
        title={title}
        visible={visible}
        headerRight={editor ? undefined : managerHeader}
        onClose={requestBack}
        onDelete={
          editor?.mode === "edit" && editor.source?.isCustom && !editor.source.isUsed
            ? () => setConfirmDelete(true)
            : undefined
        }
        onSave={editor && !editorLocked ? saveEditor : undefined}
      >
        {editor ? (
          <ScrollView
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {editorLocked ? (
              <View style={styles.usedBanner}>
                <View style={styles.usedChip}>
                  <Text style={styles.usedChipText}>{t("currency.usedChip")}</Text>
                </View>
                <Text style={styles.usedBannerText}>{t("currency.usedLockedMessage")}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("currency.fieldCode")}</Text>
              <TextInput
                accessibilityLabel={t("currency.fieldCode")}
                autoCapitalize="characters"
                editable={canEditIdentity && !mutations.pending}
                maxLength={8}
                placeholder="BTC"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.textInput, !canEditIdentity && styles.textInputDisabled]}
                value={editor.value.code}
                onChangeText={(code) =>
                  setEditor((current) =>
                    current
                      ? {
                          ...current,
                          value: { ...current.value, code: code.toUpperCase() },
                        }
                      : current,
                  )
                }
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("currency.fieldName")}</Text>
              <TextInput
                accessibilityLabel={t("currency.fieldName")}
                editable={canEditIdentity && !mutations.pending}
                maxLength={80}
                placeholder={t("currency.fieldNamePlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.textInput, !canEditIdentity && styles.textInputDisabled]}
                value={editor.value.name}
                onChangeText={(name) =>
                  setEditor((current) =>
                    current
                      ? { ...current, value: { ...current.value, name } }
                      : current,
                  )
                }
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("currency.fieldSymbol")}</Text>
              <TextInput
                accessibilityLabel={t("currency.fieldSymbol")}
                editable={canEditIdentity && !mutations.pending}
                maxLength={12}
                placeholder="₿"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.textInput, !canEditIdentity && styles.textInputDisabled]}
                value={editor.value.symbol}
                onChangeText={(symbol) =>
                  setEditor((current) =>
                    current
                      ? { ...current, value: { ...current.value, symbol } }
                      : current,
                  )
                }
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("currency.fieldDecimalPlaces")}</Text>
              <TextInput
                accessibilityLabel={t("currency.fieldDecimalPlaces")}
                editable={canEditExponent && !mutations.pending}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="2"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.textInput, !canEditExponent && styles.textInputDisabled]}
                value={editor.value.minorUnitExponent}
                onChangeText={(minorUnitExponent) =>
                  setEditor((current) =>
                    current
                      ? { ...current, value: { ...current.value, minorUnitExponent } }
                      : current,
                  )
                }
              />
              <Text style={styles.fieldHint}>{t("currency.fieldDecimalPlacesHint")}</Text>
            </View>

            {!editorLocked && editor.mode === "edit" && !editor.source?.isCustom ? (
              <Text style={styles.fieldHint}>{t("currency.builtinEditHint")}</Text>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoBanner}>
              <Coins color={theme.colors.primary} size={20} />
              <Text style={styles.infoText}>{t("currency.catalogDescription")}</Text>
            </View>

            <AccountSearchBox
              accessibilityLabel={t("currency.searchCurrencies")}
              clearAccessibilityLabel={t("common.cancel")}
              placeholder={t("currency.searchCurrencies")}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : filtered.length === 0 ? (
              <Text style={styles.empty}>{t("currency.noCurrenciesFound")}</Text>
            ) : (
              <View style={styles.list}>
                {filtered.map((currency) => (
                  <Pressable
                    key={currency.code}
                    accessibilityLabel={`${currency.code}, ${currency.name}`}
                    accessibilityRole="button"
                    onPress={() => openEdit(currency)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.symbolBadge}>
                      <Text style={styles.symbolText}>{currency.symbol.trim()}</Text>
                    </View>
                    <View style={styles.copy}>
                      <View style={styles.titleRow}>
                        <Text style={styles.codeName}>
                          {currency.code} · {currency.name}
                        </Text>
                        {currency.isUsed ? (
                          <View style={styles.usedChip}>
                            <Text style={styles.usedChipText}>{t("currency.usedChip")}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.meta}>
                        {t("currency.decimalPlacesLabel", {
                          count: currency.minorUnitExponent,
                        })}
                      </Text>
                    </View>
                    <ChevronRight color={theme.colors.textMuted} size={18} />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel={t("currency.deleteAction")}
        message={t("currency.deleteConfirm", { code: editor?.source?.code ?? "" })}
        title={t("currency.deleteTitle")}
        visible={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmRemove}
      />

      <NotificationModal
        message={mutations.error ?? ""}
        title={t("currency.errorTitle")}
        variant="error"
        visible={Boolean(mutations.error)}
        onClose={mutations.clearError}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    editorContent: {
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    headerAddBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    infoBanner: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.primary}12`,
      borderColor: `${theme.colors.primary}33`,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    infoText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    loader: { marginTop: theme.spacing.xl },
    empty: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.lg,
      textAlign: "center",
    },
    list: {
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
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    pressed: { opacity: 0.82 },
    symbolBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 44,
      justifyContent: "center",
      minWidth: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    symbolText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    copy: { flex: 1, gap: 2, minWidth: 0 },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    codeName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    usedChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    usedChipText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
    },
    usedBanner: {
      gap: theme.spacing.sm,
    },
    usedBannerText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    fieldGroup: { gap: theme.spacing.xs },
    fieldLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    fieldHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    textInputDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted,
    },
  });
}
