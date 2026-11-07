import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X, Trash2, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { ImportBatchRecord } from "../types/data-import.types";
import {
  getLatestImportBatches,
  removeImportBatch,
} from "../services/import-history.service";

interface PastImportsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PastImportsModal({ visible, onClose }: PastImportsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const refresh = () => {
    try {
      const list = getLatestImportBatches(30);
      setBatches(list);
    } catch {
      setBatches([]);
    }
  };

  useEffect(() => {
    if (visible) {
      refresh();
    }
  }, [visible]);

  const handleDelete = (id: string) => {
    removeImportBatch(id);
    refresh();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Past imports</Text>
            <Pressable accessibilityLabel="Close past imports" onPress={onClose} style={styles.closeBtn}>
              <X color={theme.colors.textSecondary} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {batches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No past imports recorded yet.</Text>
              </View>
            ) : (
              batches.map((batch) => {
                const isExpanded = expandedBatchId === batch.id;
                const leftOutRows = batch.summary.leftOutRows || [];

                return (
                  <View key={batch.id} style={styles.batchCard}>
                    <View style={styles.batchHeader}>
                      <View style={styles.fileTitleGroup}>
                        <FileText color={theme.colors.primary} size={18} />
                        <Text numberOfLines={1} style={styles.fileName}>{batch.fileName}</Text>
                      </View>

                      <Pressable
                        accessibilityLabel={`Delete history for ${batch.fileName}`}
                        accessibilityRole="button"
                        onPress={() => handleDelete(batch.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 color={theme.colors.danger} size={16} />
                      </Pressable>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        Type: {batch.importType === "transactions" ? "Transactions" : "Accounts"}
                      </Text>
                      <Text style={styles.metaText}>Source: {batch.sourceName}</Text>
                      <Text style={styles.metaText}>{batch.createdAt.toLocaleDateString()}</Text>
                    </View>

                    <View style={styles.countsRow}>
                      <Text style={[styles.countPill, { color: theme.colors.success }]}>
                        {batch.importedCount} imported
                      </Text>
                      <Text style={[styles.countPill, { color: theme.colors.textMuted }]}>
                        {batch.leftOutCount} left out
                      </Text>
                    </View>

                    {/* Expandable details */}
                    <Pressable
                      onPress={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                      style={styles.expandTrigger}
                    >
                      <Text style={styles.expandTriggerText}>
                        {isExpanded ? "Hide details" : "View details"}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp color={theme.colors.textSecondary} size={16} />
                      ) : (
                        <ChevronDown color={theme.colors.textSecondary} size={16} />
                      )}
                    </Pressable>

                    {isExpanded ? (
                      <View style={styles.expandedDetails}>
                        {leftOutRows.length > 0 ? (
                          <View style={styles.leftOutSection}>
                            <Text style={styles.sectionHeading}>Left out rows:</Text>
                            {leftOutRows.slice(0, 10).map((r, idx) => (
                              <Text key={idx} style={styles.leftOutItem}>
                                • Row #{r.rowNumber}: {r.reason}
                              </Text>
                            ))}
                            {leftOutRows.length > 10 ? (
                              <Text style={styles.leftOutMore}>
                                + {leftOutRows.length - 10} more left out rows
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
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
    emptyContainer: {
      padding: theme.spacing.xl,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    batchCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      gap: 6,
    },
    batchHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    fileTitleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 1,
    },
    fileName: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.text,
      flex: 1,
    },
    deleteBtn: {
      padding: 4,
    },
    metaRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      flexWrap: "wrap",
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    countsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: 2,
    },
    countPill: {
      fontSize: 12,
      fontWeight: "600",
    },
    expandTrigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    expandTriggerText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    expandedDetails: {
      marginTop: 4,
      paddingTop: 4,
    },
    leftOutSection: {
      gap: 2,
    },
    sectionHeading: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textMuted,
    },
    leftOutItem: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    leftOutMore: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
  });
}

