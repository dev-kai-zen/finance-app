import React, { useMemo, useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  EyeOff,
  Eye,
  Check,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type {
  AccountListItem,
} from "@/modules/accounts";
import type {
  ImportPreviewSummary,
  ImportType,
  ParsedDataRow,
  RowStatus,
} from "../types/data-import.types";
import { EditRowModal } from "./edit-row-modal";

interface StepReviewProps {
  importType: ImportType;
  rows: ParsedDataRow[];
  summary: ImportPreviewSummary;
  existingAccounts: AccountListItem[];
  defaultCurrencyCode: string;
  isSaving: boolean;
  onToggleExclude: (rowNumber: number) => void;
  onConfirmSimilar: (rowNumber: number) => void;
  onApplyOverride: (rowNumber: number, override: Partial<ParsedDataRow>) => void;
  onConfirmImport: () => void;
}

export function StepReview({
  importType,
  rows,
  summary,
  existingAccounts,
  defaultCurrencyCode,
  isSaving,
  onToggleExclude,
  onConfirmSimilar,
  onApplyOverride,
  onConfirmImport,
}: StepReviewProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [activeTab, setActiveTab] = useState<RowStatus>("needs_attention");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRow, setEditingRow] = useState<ParsedDataRow | null>(null);

  // If there are no rows needing attention, default activeTab to ready
  React.useEffect(() => {
    if (summary.needsAttentionCount === 0 && activeTab === "needs_attention") {
      setActiveTab("ready");
    }
  }, [activeTab, summary.needsAttentionCount]);

  // Filter rows by search and tab
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.status !== activeTab) return false;
      if (!q) return true;

      // Match row number
      if (r.rowNumber.toString() === q) return true;
      // Match type
      if (r.type?.toLowerCase().includes(q)) return true;
      // Match account
      if (r.accountName?.toLowerCase().includes(q)) return true;
      if (r.toAccountName?.toLowerCase().includes(q)) return true;
      // Match category
      if (r.categoryName?.toLowerCase().includes(q)) return true;
      // Match description
      if (r.description?.toLowerCase().includes(q)) return true;
      // Match note
      if (r.note?.toLowerCase().includes(q)) return true;
      // Match paired row
      if (r.pairedRowNumber && r.pairedRowNumber.toString() === q) return true;
      // Match raw values
      for (const val of Object.values(r.rawValues)) {
        if (val.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [activeTab, rows, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Guidance Header */}
      <View style={styles.guidanceCard}>
        <Text style={styles.stepTitle}>Review before saving</Text>
        <Text style={styles.guidanceText}>
          Nothing has been saved to your Kaizen records yet. Review your entries, make corrections, or choose to leave rows out.
        </Text>
      </View>

      {/* Financial Preview Summary Card */}
      {importType === "transactions" ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Import preview totals</Text>
          <View style={styles.summaryMetricsRow}>
            <View style={styles.metricItem}>
              <View style={styles.metricHeader}>
                <TrendingUp color={theme.colors.success} size={16} />
                <Text style={styles.metricLabel}>Total Income</Text>
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.success }]}>
                {formatCurrency(summary.totalIncomeMinorUnits, defaultCurrencyCode)}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricHeader}>
                <TrendingDown color={theme.colors.danger} size={16} />
                <Text style={styles.metricLabel}>Total Spending</Text>
              </View>
              <Text style={[styles.metricValue, { color: theme.colors.danger }]}>
                {formatCurrency(summary.totalExpenseMinorUnits, defaultCurrencyCode)}
              </Text>
            </View>
          </View>

          {/* Account balance deltas preview */}
          {Object.keys(summary.accountBalanceDeltas).length > 0 ? (
            <View style={styles.balancesSection}>
              <Text style={styles.balancesSectionTitle}>Account balance impact:</Text>
              {Object.entries(summary.accountBalanceDeltas).map(([accId, delta]) => {
                const existing = existingAccounts.find((a) => a.id === accId);
                const accName = existing ? existing.name : accId.replace("new:", "");
                const before = existing ? existing.currentBalanceMinorUnits : 0;
                const after = before + delta;
                const curr = existing ? existing.currencyCode : defaultCurrencyCode;

                return (
                  <View key={accId} style={styles.accountDeltaRow}>
                    <Text numberOfLines={1} style={styles.accDeltaName}>{accName}</Text>
                    <Text style={styles.accDeltaValue}>
                      {formatCurrency(before, curr)} → {formatCurrency(after, curr)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Tabs: Needs Attention | Left Out | Ready */}
      <View style={styles.tabsRow}>
        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("needs_attention")}
          style={[styles.tabBtn, activeTab === "needs_attention" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "needs_attention" && styles.tabBtnTextActive,
            ]}
          >
            Needs attention ({summary.needsAttentionCount})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("ready")}
          style={[styles.tabBtn, activeTab === "ready" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "ready" && styles.tabBtnTextActive,
            ]}
          >
            Ready ({summary.readyCount})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          onPress={() => setActiveTab("left_out")}
          style={[styles.tabBtn, activeTab === "left_out" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "left_out" && styles.tabBtnTextActive,
            ]}
          >
            Left out ({summary.leftOutCount})
          </Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search color={theme.colors.textMuted} size={18} />
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Search by row number, account, text..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      {/* Rows List */}
      <View style={styles.rowsList}>
        {filteredRows.length === 0 ? (
          <View style={styles.emptyListCard}>
            <Text style={styles.emptyListText}>
              {searchQuery ? "No matching rows found." : `No rows in "${activeTab.replace("_", " ")}".`}
            </Text>
          </View>
        ) : (
          filteredRows.map((row) => {
            const isAttention = row.status === "needs_attention";
            const isLeftOut = row.status === "left_out";

            return (
              <View
                key={row.rowNumber}
                style={[
                  styles.rowCard,
                  isAttention && styles.rowCardAttention,
                  isLeftOut && styles.rowCardLeftOut,
                ]}
              >
                <View style={styles.rowCardHeader}>
                  <View style={styles.rowNumberPill}>
                    <Text style={styles.rowNumberText}>Row #{row.rowNumber}</Text>
                  </View>

                  <View style={styles.rowStatusRight}>
                    {row.type ? (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {row.type.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}

                    {row.amountMinorUnits !== undefined && row.currencyCode ? (
                      <Text style={styles.amountText}>
                        {formatCurrency(row.amountMinorUnits, row.currencyCode)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Main Details */}
                <View style={styles.rowDetailsBody}>
                  {row.description ? (
                    <Text style={styles.rowDescription}>{row.description}</Text>
                  ) : null}

                  <Text style={styles.rowAccountText}>
                    Account: {row.accountName || "None"}
                    {row.toAccountName ? ` → ${row.toAccountName}` : ""}
                  </Text>

                  {row.categoryName ? (
                    <Text style={styles.rowCategoryText}>
                      Category: {row.categoryName}
                      {row.subcategoryName ? ` > ${row.subcategoryName}` : ""}
                    </Text>
                  ) : null}

                  {row.date ? (
                    <Text style={styles.rowDateText}>
                      Date: {row.date.toLocaleDateString()}
                    </Text>
                  ) : null}

                  {row.pairedRowNumber ? (
                    <Text style={styles.pairedNoticeText}>
                      Paired with row #{row.pairedRowNumber}
                    </Text>
                  ) : null}
                </View>

                {/* Issues banner if needs attention */}
                {row.issues.length > 0 ? (
                  <View style={styles.issuesCard}>
                    <AlertTriangle color={theme.colors.warning} size={16} />
                    <View style={styles.issuesCopy}>
                      {row.issues.map((iss, i) => (
                        <Text key={i} style={styles.issueText}>{iss}</Text>
                      ))}
                      {row.fixAction ? (
                        <Text style={styles.fixActionText}>Action: {row.fixAction}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Similar purchase confirmation action */}
                {row.isSimilarExisting && !row.userConfirmedSimilar ? (
                  <Pressable
                    onPress={() => onConfirmSimilar(row.rowNumber)}
                    style={styles.confirmSimilarBtn}
                  >
                    <Check color={theme.colors.info} size={16} />
                    <Text style={styles.confirmSimilarBtnText}>
                      Confirm as separate purchase
                    </Text>
                  </Pressable>
                ) : null}

                {/* Actions: Edit, Leave out / Include */}
                <View style={styles.rowActionsRow}>
                  <Pressable
                    accessibilityLabel={`Edit row ${row.rowNumber}`}
                    accessibilityRole="button"
                    onPress={() => setEditingRow(row)}
                    style={styles.rowActionBtn}
                  >
                    <Edit2 color={theme.colors.primary} size={15} />
                    <Text style={styles.rowActionBtnText}>Edit row</Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel={row.userExcluded ? `Include row ${row.rowNumber}` : `Leave out row ${row.rowNumber}`}
                    accessibilityRole="button"
                    onPress={() => onToggleExclude(row.rowNumber)}
                    style={styles.rowActionBtn}
                  >
                    {row.userExcluded ? (
                      <>
                        <Eye color={theme.colors.textSecondary} size={15} />
                        <Text style={styles.rowActionBtnText}>Include row</Text>
                      </>
                    ) : (
                      <>
                        <EyeOff color={theme.colors.textSecondary} size={15} />
                        <Text style={styles.rowActionBtnText}>Leave out</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Edit Modal */}
      <EditRowModal
        onApply={onApplyOverride}
        onClose={() => setEditingRow(null)}
        row={editingRow}
        visible={Boolean(editingRow)}
      />

      {/* Footer / Confirm Import Button */}
      <View style={styles.footerContainer}>
        {!summary.canImport ? (
          <View style={styles.importBlockedBanner}>
            <AlertTriangle color={theme.colors.warning} size={18} />
            <Text style={styles.importBlockedText}>
              {summary.needsAttentionCount > 0
                ? `Fix or leave out the ${summary.needsAttentionCount} row${summary.needsAttentionCount === 1 ? "" : "s"} needing attention before importing.`
                : "At least one row must be included and ready to import."}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel={`Import ${summary.readyCount} rows`}
          accessibilityRole="button"
          disabled={!summary.canImport || isSaving}
          onPress={onConfirmImport}
          style={[styles.importButton, (!summary.canImport || isSaving) && styles.importButtonDisabled]}
        >
          {isSaving ? (
            <>
              <ActivityIndicator color={theme.colors.primaryContrast} />
              <Text style={styles.importButtonText}>Saving... please keep screen open</Text>
            </>
          ) : (
            <>
              <Text style={styles.importButtonText}>
                Import {summary.readyCount} {summary.readyCount === 1 ? "record" : "records"}
              </Text>
              <ArrowRight color={theme.colors.primaryContrast} size={18} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    guidanceCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    stepTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 6,
    },
    guidanceText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    summaryCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
    },
    summaryMetricsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    metricItem: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metricHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: "700",
    },
    balancesSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
      gap: 4,
    },
    balancesSectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    accountDeltaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 2,
    },
    accDeltaName: {
      fontSize: 13,
      color: theme.colors.text,
      flex: 1,
      fontWeight: "500",
    },
    accDeltaValue: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    tabsRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    tabBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}15`,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    tabBtnTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.cardBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
    },
    rowsList: {
      gap: theme.spacing.md,
    },
    emptyListCard: {
      padding: theme.spacing.xl,
      alignItems: "center",
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyListText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    rowCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    rowCardAttention: {
      borderColor: `${theme.colors.warning}80`,
      backgroundColor: `${theme.colors.warning}06`,
    },
    rowCardLeftOut: {
      opacity: 0.6,
    },
    rowCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowNumberPill: {
      backgroundColor: `${theme.colors.textMuted}20`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    rowNumberText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.text,
    },
    rowStatusRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: `${theme.colors.primary}18`,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    amountText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
    },
    rowDetailsBody: {
      gap: 2,
      marginVertical: 4,
    },
    rowDescription: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    rowAccountText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    rowCategoryText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    rowDateText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    pairedNoticeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.info,
    },
    issuesCard: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: `${theme.colors.warning}18`,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: 4,
    },
    issuesCopy: {
      flex: 1,
      gap: 2,
    },
    issueText: {
      fontSize: 12,
      color: theme.colors.warning,
      fontWeight: "600",
    },
    fixActionText: {
      fontSize: 12,
      color: theme.colors.text,
      fontStyle: "italic",
      marginTop: 2,
    },
    confirmSimilarBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${theme.colors.info}18`,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      alignSelf: "flex-start",
      marginTop: 4,
    },
    confirmSimilarBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.info,
    },
    rowActionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    rowActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
    },
    rowActionBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    footerContainer: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    importBlockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${theme.colors.warning}18`,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    importBlockedText: {
      fontSize: 13,
      color: theme.colors.warning,
      flex: 1,
      fontWeight: "600",
      lineHeight: 18,
    },
    importButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
    },
    importButtonDisabled: {
      opacity: 0.5,
    },
    importButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.primaryContrast,
    },
  });
}

