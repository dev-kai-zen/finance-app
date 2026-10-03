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
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Plus,
  RotateCcw,
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
  PresetSortBy,
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";
import { QuickPresetFormModal } from "./quick-preset-form-modal";

interface QuickPresetsModalProps {
  visible: boolean;
  presets: TransactionPreset[];
  archivedPresets?: TransactionPreset[];
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  categories: Category[];
  loading?: boolean;
  pending?: boolean;
  error?: string | null;
  sortBy?: PresetSortBy;
  onChangeSortBy?: (sortBy: PresetSortBy) => void;
  onClearError: () => void;
  onClose: () => void;
  onSelect: (preset: TransactionPreset) => void;
  onSave: (input: TransactionPresetInput, id?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onArchive?: (id: string) => Promise<boolean>;
  onRestore?: (id: string) => Promise<boolean>;
  onPermanentlyDelete?: (id: string) => Promise<boolean>;
  onReorder: (orderedIds: string[]) => Promise<boolean>;
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...(category.subcategories ?? []),
  ]);
}

function formatLastUsed(date: Date | null): string {
  if (!date) return "Never used";
  const d = new Date(date);
  return `Last used ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function QuickPresetsModal({
  visible,
  presets,
  archivedPresets,
  accounts,
  pockets,
  categories,
  loading = false,
  pending = false,
  error = null,
  sortBy,
  onChangeSortBy,
  onClearError,
  onClose,
  onSelect,
  onSave,
  onDelete,
  onArchive,
  onRestore,
  onPermanentlyDelete,
  onReorder,
}: QuickPresetsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [internalSortBy, setInternalSortBy] = useState<PresetSortBy>("sort_order");
  const [showArchived, setShowArchived] = useState(false);
  const [editingPreset, setEditingPreset] = useState<TransactionPreset | null>();
  const [pendingArchive, setPendingArchive] = useState<TransactionPreset | null>(null);
  const [pendingRestore, setPendingRestore] = useState<TransactionPreset | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<TransactionPreset | null>(null);

  const currentSortBy = sortBy ?? internalSortBy;

  const handleSortChange = (newSort: PresetSortBy) => {
    if (onChangeSortBy) {
      onChangeSortBy(newSort);
    } else {
      setInternalSortBy(newSort);
    }
  };

  const categoryList = useMemo(() => flattenCategories(categories), [categories]);

  const activePresets = useMemo(
    () => presets.filter((p) => !p.deletedAt),
    [presets],
  );

  const archivedList = useMemo(
    () => archivedPresets ?? presets.filter((p) => Boolean(p.deletedAt)),
    [archivedPresets, presets],
  );

  const sortedActivePresets = useMemo(() => {
    const list = [...activePresets];
    if (currentSortBy === "last_used_at") {
      return list.sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        if (aTime === 0 && bTime === 0) {
          return (
            a.sortOrder - b.sortOrder ||
            a.transactionName.localeCompare(b.transactionName)
          );
        }
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        if (bTime !== aTime) return bTime - aTime;
        return (
          a.sortOrder - b.sortOrder ||
          a.transactionName.localeCompare(b.transactionName)
        );
      });
    }
    return list.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.transactionName.localeCompare(b.transactionName),
    );
  }, [activePresets, currentSortBy]);

  const sortedArchivedPresets = useMemo(() => {
    const list = [...archivedList];
    if (currentSortBy === "last_used_at") {
      return list.sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        if (aTime === 0 && bTime === 0) {
          return (
            a.sortOrder - b.sortOrder ||
            a.transactionName.localeCompare(b.transactionName)
          );
        }
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        if (bTime !== aTime) return bTime - aTime;
        return (
          a.sortOrder - b.sortOrder ||
          a.transactionName.localeCompare(b.transactionName)
        );
      });
    }
    return list.sort((a, b) => {
      const aDel = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bDel = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      if (bDel !== aDel) return bDel - aDel;
      return (
        a.sortOrder - b.sortOrder ||
        a.transactionName.localeCompare(b.transactionName)
      );
    });
  }, [archivedList, currentSortBy]);

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
    setPendingArchive(null);
    setPendingRestore(null);
    setPendingPermanentDelete(null);
    onClose();
  };

  const movePreset = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedActivePresets.length) return;
    const reordered = [...sortedActivePresets];
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

  const hasAnyPresets = activePresets.length > 0 || archivedList.length > 0;

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

          {/* Controls Bar: Sort by selection & Show archived checkbox */}
          {hasAnyPresets && (
            <View style={styles.controlsContainer}>
              <View style={styles.controlsRow}>
                <View style={styles.sortGroup}>
                  <Text style={styles.controlLabel}>Sort</Text>
                  <View style={styles.sortPills}>
                    <Pressable
                      accessibilityLabel="Sort by sort order"
                      accessibilityRole="button"
                      onPress={() => handleSortChange("sort_order")}
                      style={[
                        styles.sortPill,
                        currentSortBy === "sort_order" && styles.sortPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortPillText,
                          currentSortBy === "sort_order" &&
                            styles.sortPillTextActive,
                        ]}
                      >
                        Sort Order
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Sort by last used"
                      accessibilityRole="button"
                      onPress={() => handleSortChange("last_used_at")}
                      style={[
                        styles.sortPill,
                        currentSortBy === "last_used_at" &&
                          styles.sortPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortPillText,
                          currentSortBy === "last_used_at" &&
                            styles.sortPillTextActive,
                        ]}
                      >
                        Last Used
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  accessibilityLabel="Show archived presets"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: showArchived }}
                  onPress={() => setShowArchived((prev) => !prev)}
                  style={styles.checkboxRow}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      showArchived && styles.checkboxBoxChecked,
                    ]}
                  >
                    {showArchived && (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Show archived</Text>
                  {archivedList.length > 0 && (
                    <Text style={styles.archivedCountBadge}>
                      ({archivedList.length})
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : !hasAnyPresets ? (
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
            <>
              {/* Active Presets Section */}
              {showArchived && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Active Presets ({sortedActivePresets.length})
                  </Text>
                </View>
              )}

              {sortedActivePresets.length === 0 ? (
                <View style={styles.emptySectionContainer}>
                  <Text style={styles.emptySectionTitle}>
                    {archivedList.length > 0
                      ? "All presets are archived"
                      : "No active presets"}
                  </Text>
                  <Text style={styles.emptySectionText}>
                    {archivedList.length > 0
                      ? showArchived
                        ? "You can restore them from the archived list below."
                        : "Turn on \"Show archived\" above to view or restore them."
                      : "Tap \"+\" to create a new preset."}
                  </Text>
                </View>
              ) : (
                sortedActivePresets.map((preset, index) => {
                  const unavailableReason = availability(preset);
                  const account = accounts.find(
                    (item) => item.id === preset.accountId,
                  );
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
                        <View style={styles.rowBottomMeta}>
                          <Text
                            style={
                              unavailableReason
                                ? styles.unavailableText
                                : styles.amountText
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
                          {currentSortBy === "last_used_at" && (
                            <Text style={styles.lastUsedText}>
                              {formatLastUsed(preset.lastUsedAt)}
                            </Text>
                          )}
                        </View>
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
                          accessibilityLabel={`Archive ${preset.transactionName}`}
                          onPress={() => setPendingArchive(preset)}
                          style={styles.iconButton}
                        >
                          <Archive color={theme.colors.textSecondary} size={17} />
                        </Pressable>
                        {currentSortBy === "sort_order" && (
                          <>
                            <Pressable
                              accessibilityLabel={`Move ${preset.transactionName} up`}
                              disabled={pending || index === 0}
                              onPress={() => void movePreset(index, -1)}
                              style={[
                                styles.orderButton,
                                index === 0 && styles.disabled,
                              ]}
                            >
                              <ArrowUp
                                color={theme.colors.textSecondary}
                                size={15}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Move ${preset.transactionName} down`}
                              disabled={
                                pending || index === sortedActivePresets.length - 1
                              }
                              onPress={() => void movePreset(index, 1)}
                              style={[
                                styles.orderButton,
                                index === sortedActivePresets.length - 1 &&
                                  styles.disabled,
                              ]}
                            >
                              <ArrowDown
                                color={theme.colors.textSecondary}
                                size={15}
                              />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}

              {/* Archived Presets Section */}
              {showArchived && (
                <View style={styles.archivedSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Archived Presets ({sortedArchivedPresets.length})
                    </Text>
                  </View>

                  {sortedArchivedPresets.length === 0 ? (
                    <View style={styles.emptySectionContainer}>
                      <Text style={styles.emptySectionText}>
                        No archived presets
                      </Text>
                    </View>
                  ) : (
                    sortedArchivedPresets.map((preset) => {
                      const account = accounts.find(
                        (item) => item.id === preset.accountId,
                      );
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
                        <View
                          key={preset.id}
                          style={[styles.row, styles.archivedRow]}
                        >
                          <View style={styles.rowMain}>
                            <View style={styles.rowTitleLine}>
                              <Text
                                numberOfLines={1}
                                style={[styles.rowTitle, styles.archivedTitle]}
                              >
                                {preset.transactionName}
                              </Text>
                              <View style={styles.archivedPill}>
                                <Text style={styles.archivedPillText}>
                                  Archived
                                </Text>
                              </View>
                              <View style={styles.typePill}>
                                <Text style={styles.typePillText}>
                                  {preset.type}
                                </Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={styles.rowDetail}>
                              {detail}
                            </Text>
                            <View style={styles.rowBottomMeta}>
                              <Text style={styles.archivedAmountText}>
                                {preset.amountCents === null
                                  ? "No amount set"
                                  : formatCurrency(
                                      Math.abs(preset.amountCents),
                                      account?.currencyCode ?? "PHP",
                                    )}
                              </Text>
                              {preset.lastUsedAt && (
                                <Text style={styles.lastUsedText}>
                                  {formatLastUsed(preset.lastUsedAt)}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={styles.rowActions}>
                            <Pressable
                              accessibilityLabel={`Restore ${preset.transactionName}`}
                              onPress={() => setPendingRestore(preset)}
                              style={styles.iconButton}
                            >
                              <RotateCcw
                                color={theme.colors.success}
                                size={17}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Permanently delete ${preset.transactionName}`}
                              onPress={() => setPendingPermanentDelete(preset)}
                              style={styles.iconButton}
                            >
                              <Trash2
                                color={theme.colors.danger}
                                size={17}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
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

      {/* Archive Modal */}
      <ConfirmModal
        confirmLabel="Archive"
        message={`Archive “${pendingArchive?.transactionName ?? "this preset"}”? It will be hidden from your active quick presets. You can view or restore it anytime by checking "Show archived".`}
        pending={pending}
        title="Archive Quick Preset?"
        variant="destructive"
        visible={pendingArchive !== null}
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => {
          if (!pendingArchive) return;
          const archiveAction = onArchive ?? onDelete;
          void archiveAction(pendingArchive.id).then((archived) => {
            if (archived) setPendingArchive(null);
          });
        }}
      />

      {/* Restore Modal */}
      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Restore"
        message={`Restore “${pendingRestore?.transactionName ?? "this preset"}”? It will return to your active quick presets list.`}
        pending={pending}
        title="Restore Quick Preset?"
        variant="restore"
        visible={pendingRestore !== null}
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (!pendingRestore || !onRestore) return;
          void onRestore(pendingRestore.id).then((restored) => {
            if (restored) setPendingRestore(null);
          });
        }}
      />

      {/* Permanently Delete Modal */}
      <ConfirmModal
        confirmLabel="Delete Permanently"
        message={`Permanently delete “${pendingPermanentDelete?.transactionName ?? "this preset"}”? This preset will be completely removed and cannot be recovered. Existing transactions will not be affected.`}
        pending={pending}
        title="Permanently Delete Quick Preset?"
        variant="destructive"
        visible={pendingPermanentDelete !== null}
        onCancel={() => setPendingPermanentDelete(null)}
        onConfirm={() => {
          if (!pendingPermanentDelete) return;
          const deleteAction = onPermanentlyDelete ?? onDelete;
          void deleteAction(pendingPermanentDelete.id).then((deleted) => {
            if (deleted) setPendingPermanentDelete(null);
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
      marginBottom: theme.spacing.xs,
    },
    controlsContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    controlsRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    sortGroup: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    controlLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    sortPills: {
      flexDirection: "row",
      gap: 4,
    },
    sortPill: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
    },
    sortPillActive: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: theme.colors.primary,
    },
    sortPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sortPillTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    checkboxRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    checkboxBox: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 4,
      borderWidth: 1.5,
      height: 18,
      justifyContent: "center",
      width: 18,
    },
    checkboxBoxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    archivedCountBadge: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sectionHeader: {
      marginBottom: 2,
      marginTop: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    emptySectionContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      gap: 4,
      padding: theme.spacing.lg,
    },
    emptySectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emptySectionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      textAlign: "center",
    },
    archivedSection: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
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
    archivedRow: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      opacity: 0.9,
    },
    rowMain: { flex: 1, minWidth: 0, padding: theme.spacing.xs },
    rowTitleLine: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    archivedTitle: {
      color: theme.colors.textSecondary,
    },
    archivedPill: {
      backgroundColor: `${theme.colors.textSecondary}20`,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    archivedPillText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
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
    rowBottomMeta: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: 3,
    },
    amountText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    archivedAmountText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    unavailableText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    lastUsedText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontStyle: "italic",
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
