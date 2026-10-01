import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import {
  ConfirmModal,
  FullScreenFormModal,
  NotificationModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";
import type {
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";
import { QuickPresetFormModal } from "./quick-preset-form-modal";

interface QuickPresetsModalProps {
  visible: boolean;
  presets: TransactionPreset[];
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  loading?: boolean;
  pending?: boolean;
  error?: string | null;
  onClearError: () => void;
  onClose: () => void;
  onSelect: (preset: TransactionPreset) => void;
  onSave: (input: TransactionPresetInput, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReorder: (orderedIds: string[]) => Promise<boolean>;
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...(category.subcategories ?? []),
  ]);
}

export function QuickPresetsModal({
  visible,
  presets,
  accounts,
  pockets,
  categories,
  loading = false,
  pending = false,
  error = null,
  onClearError,
  onClose,
  onSelect,
  onSave,
  onDelete,
  onReorder,
}: QuickPresetsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [editingPreset, setEditingPreset] = useState<TransactionPreset | null>();
  const [pendingDelete, setPendingDelete] = useState<TransactionPreset | null>(null);
  const categoryList = useMemo(() => flattenCategories(categories), [categories]);

  const openEditor = (preset: TransactionPreset | null) => {
    onClearError();
    setEditingPreset(preset);
  };

  const closeEditor = () => {
    onClearError();
    setEditingPreset(undefined);
  };

  const closeManager = () => {
    onClearError();
    setEditingPreset(undefined);
    setPendingDelete(null);
    onClose();
  };

  const movePreset = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= presets.length) return;
    const reordered = [...presets];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    await onReorder(reordered.map((preset) => preset.id));
  };

  const availability = (preset: TransactionPreset) => {
    const account = accounts.find((item) => item.id === preset.accountId);
    if (!account || account.isArchived) return "Source account unavailable";
    if (
      preset.pocketId &&
      !pockets.some(
        (pocket) => pocket.id === preset.pocketId && !pocket.isArchived,
      )
    ) {
      return "Source pocket unavailable";
    }
    if (preset.type === "transfer") {
      const destination = accounts.find((item) => item.id === preset.toAccountId);
      if (!destination || destination.isArchived) {
        return "Destination account unavailable";
      }
      if (
        preset.toPocketId &&
        !pockets.some(
          (pocket) => pocket.id === preset.toPocketId && !pocket.isArchived,
        )
      ) {
        return "Destination pocket unavailable";
      }
    } else if (
      !categoryList.some((category) => category.id === preset.categoryId)
    ) {
      return "Category unavailable";
    }
    return null;
  };

  return (
    <>
      <FullScreenFormModal
        headerRight={
          <Pressable
            accessibilityLabel="Create Quick Preset"
            accessibilityRole="button"
            onPress={() => openEditor(null)}
            style={styles.addButton}
          >
            <Plus color={theme.colors.onPrimary} size={20} />
          </Pressable>
        }
        title="Quick Presets"
        visible={visible}
        onClose={closeManager}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>
            Tap a preset to fill the transaction form. You can review every field
            before saving the transaction.
          </Text>

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : presets.length === 0 ? (
            <View style={styles.emptyState}>
              <Sparkles color={theme.colors.primary} size={30} />
              <Text style={styles.emptyTitle}>No Quick Presets yet</Text>
              <Text style={styles.emptyText}>
                Create one here, or select “Save as a Quick Preset” when recording
                a transaction.
              </Text>
              <Pressable
                onPress={() => openEditor(null)}
                style={styles.emptyAction}
              >
                <Plus color={theme.colors.onPrimary} size={17} />
                <Text style={styles.emptyActionText}>New Quick Preset</Text>
              </Pressable>
            </View>
          ) : (
            presets.map((preset, index) => {
              const unavailableReason = availability(preset);
              const account = accounts.find((item) => item.id === preset.accountId);
              const destination = accounts.find(
                (item) => item.id === preset.toAccountId,
              );
              const category = categoryList.find(
                (item) => item.id === preset.categoryId,
              );
              const detail =
                preset.type === "transfer"
                  ? `${account?.name ?? "Missing account"} → ${destination?.name ?? "Missing account"}`
                  : `${category?.name ?? "Missing category"} · ${account?.name ?? "Missing account"}`;

              return (
                <View key={preset.id} style={styles.row}>
                  <Pressable
                    accessibilityLabel={`Use ${preset.transactionName}`}
                    accessibilityRole="button"
                    disabled={Boolean(unavailableReason)}
                    onPress={() => onSelect(preset)}
                    style={styles.rowMain}
                  >
                    <View style={styles.rowTitleLine}>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {preset.transactionName}
                      </Text>
                      <View style={styles.typePill}>
                        <Text style={styles.typePillText}>{preset.type}</Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.rowDetail}>
                      {detail}
                    </Text>
                    <Text
                      style={
                        unavailableReason ? styles.unavailableText : styles.amountText
                      }
                    >
                      {unavailableReason ??
                        (preset.amountCents === null
                          ? "Enter amount"
                          : formatCurrency(
                              Math.abs(preset.amountCents),
                              account?.currencyCode ?? "PHP",
                            ))}
                    </Text>
                  </Pressable>

                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityLabel={`Edit ${preset.transactionName}`}
                      onPress={() => openEditor(preset)}
                      style={styles.iconButton}
                    >
                      <Edit3 color={theme.colors.primary} size={17} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete ${preset.transactionName}`}
                      onPress={() => setPendingDelete(preset)}
                      style={styles.iconButton}
                    >
                      <Trash2 color={theme.colors.danger} size={17} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Move ${preset.transactionName} up`}
                      disabled={pending || index === 0}
                      onPress={() => void movePreset(index, -1)}
                      style={[styles.orderButton, index === 0 && styles.disabled]}
                    >
                      <ArrowUp color={theme.colors.textSecondary} size={15} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Move ${preset.transactionName} down`}
                      disabled={pending || index === presets.length - 1}
                      onPress={() => void movePreset(index, 1)}
                      style={[
                        styles.orderButton,
                        index === presets.length - 1 && styles.disabled,
                      ]}
                    >
                      <ArrowDown color={theme.colors.textSecondary} size={15} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </FullScreenFormModal>

      <QuickPresetFormModal
        accounts={accounts}
        categories={categories}
        error={error}
        onClearError={onClearError}
        onClose={closeEditor}
        onSave={onSave}
        pending={pending}
        pockets={pockets}
        preset={editingPreset ?? null}
        visible={editingPreset !== undefined}
      />

      <ConfirmModal
        confirmLabel="Delete"
        message={`Delete “${pendingDelete?.transactionName ?? "this preset"}”? Existing transactions will not be affected.`}
        pending={pending}
        title="Delete Quick Preset?"
        variant="destructive"
        visible={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          void onDelete(pendingDelete.id).then((deleted) => {
            if (deleted) setPendingDelete(null);
          });
        }}
      />

      <NotificationModal
        message={error ?? ""}
        onClose={onClearError}
        title="Quick Presets unavailable"
        variant="error"
        visible={visible && editingPreset === undefined && Boolean(error)}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    addButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    content: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      marginBottom: theme.spacing.sm,
    },
    emptyState: {
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
    },
    emptyAction: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    emptyActionText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    row: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      padding: theme.spacing.sm,
      ...theme.shadows.card,
    },
    rowMain: { flex: 1, minWidth: 0, padding: theme.spacing.xs },
    rowTitleLine: { alignItems: "center", flexDirection: "row", gap: theme.spacing.xs },
    rowTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    typePill: {
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    typePillText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    rowDetail: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 3,
    },
    amountText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: 3,
    },
    unavailableText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: 3,
    },
    rowActions: { alignItems: "center", flexDirection: "row", gap: 2 },
    iconButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    orderButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 30,
      justifyContent: "center",
      width: 28,
    },
    disabled: { opacity: 0.25 },
  });
}
