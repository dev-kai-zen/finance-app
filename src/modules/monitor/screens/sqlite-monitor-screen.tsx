import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { PageContainer, PageHeader } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useMonitor } from "../hooks/use-monitor";
import type { MonitorTab, TableInfo } from "../types/monitor.types";

const QUERY_PRESETS = [
  { label: "Accounts", sql: "SELECT id, name, currency_code, opening_balance_minor_units, is_archived FROM accounts;" },
  { label: "Transactions", sql: "SELECT id, type, amount_cents, account_id, category_id, occurred_at FROM transactions ORDER BY occurred_at DESC LIMIT 20;" },
  { label: "Categories", sql: "SELECT id, name, type, color, icon, is_system FROM categories ORDER BY type, name;" },
  { label: "Account Types", sql: "SELECT id, name, account_group, color, icon_key FROM account_types;" },
  { label: "Settings", sql: "SELECT * FROM settings;" },
  { label: "Database Info", sql: "PRAGMA page_count; PRAGMA page_size;" },
];

export function SqliteMonitorScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const {
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    queryResult,
    queryError,
    runQuery,
    vacuum,
    refreshTables,
  } = useMonitor();

  const [activeTab, setActiveTab] = useState<MonitorTab>("tables");
  const [customQuery, setCustomQuery] = useState("SELECT * FROM accounts LIMIT 20;");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const totalRecords = tables.reduce((acc, t) => acc + t.rowCount, 0);

  const handleRunQuery = () => {
    runQuery(customQuery);
  };

  const handleSelectPreset = (sql: string) => {
    setCustomQuery(sql);
    runQuery(sql);
  };

  const handleOpenTable = (tableName: string) => {
    setSelectedTable(tableName);
    setIsRecordModalOpen(true);
  };

  const handleVacuum = () => {
    vacuum();
    if (Platform.OS === "web") {
      window.alert("Database vacuumed successfully. Unused pages reclaimed.");
    } else {
      Alert.alert("SQLite Vacuum", "Database vacuumed successfully. Unused pages reclaimed.");
    }
  };

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Developer Tools"
          primaryAction={{
            label: "⚡ VACUUM DB",
            onPress: handleVacuum,
          }}
          subtitle="Real-time SQLite table browser, schema inspector, and query console."
          title="SQLite Monitor"
        />
      }
    >
      <View style={styles.container}>
        {/* Summary Overview Banner */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL TABLES</Text>
            <Text style={styles.metricValue}>{tables.length}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL ROWS RECORDED</Text>
            <Text style={[styles.metricValue, styles.primaryValue]}>
              {totalRecords.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>JOURNAL MODE</Text>
            <Text style={styles.metricValue}>WAL</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          {(["tables", "console", "schema"] as const).map((tab) => {
            const active = activeTab === tab;
            const labels = {
              tables: `Tables (${tables.length})`,
              console: "SQL Console",
              schema: "Schema DDL",
            };

            return (
              <Pressable
                key={tab}
                accessibilityLabel={labels[tab]}
                accessibilityRole="button"
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, active && styles.tabItemActive]}
              >
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                >
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab 1: Tables Browser */}
        {activeTab === "tables" && (
          <View style={styles.tablesGrid}>
            {tables.map((tbl) => (
              <Pressable
                key={tbl.name}
                accessibilityLabel={`View table ${tbl.name}`}
                accessibilityRole="button"
                onPress={() => handleOpenTable(tbl.name)}
                style={({ pressed }) => [
                  styles.tableCard,
                  pressed && styles.tableCardPressed,
                ]}
              >
                <View style={styles.tableCardHeader}>
                  <Text numberOfLines={1} style={styles.tableNameText}>
                    {tbl.name}
                  </Text>
                  <View style={styles.rowCountBadge}>
                    <Text style={styles.rowCountText}>
                      {tbl.rowCount} {tbl.rowCount === 1 ? "row" : "rows"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.columnSummaryText}>
                  {tbl.columns.length} columns: {tbl.columns.map((c) => c.name).slice(0, 4).join(", ")}
                  {tbl.columns.length > 4 ? "..." : ""}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.inspectLink}>Browse Records ➔</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Tab 2: SQL Console */}
        {activeTab === "console" && (
          <View style={styles.consoleCard}>
            <Text style={styles.consoleTitle}>EXECUTE RAW SQL QUERY</Text>

            {/* Presets */}
            <ScrollView
              contentContainerStyle={styles.presetsScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {QUERY_PRESETS.map((p) => (
                <Pressable
                  key={p.label}
                  accessibilityLabel={`Run preset ${p.label}`}
                  accessibilityRole="button"
                  onPress={() => handleSelectPreset(p.sql)}
                  style={styles.presetPill}
                >
                  <Text style={styles.presetText}>{p.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* SQL Input */}
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={4}
              onChangeText={setCustomQuery}
              placeholder="Enter SQL query (e.g. SELECT * FROM transactions;)"
              placeholderTextColor={styles.placeholder.color}
              style={styles.sqlInput}
              value={customQuery}
            />

            <View style={styles.consoleActionsRow}>
              <Pressable
                accessibilityLabel="Execute query"
                accessibilityRole="button"
                onPress={handleRunQuery}
                style={styles.runQueryBtn}
              >
                <Text style={styles.runQueryBtnText}>▶ Run Query</Text>
              </Pressable>
            </View>

            {/* Query Error */}
            {queryError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>Error: {queryError}</Text>
              </View>
            )}

            {/* Query Results */}
            {queryResult && (
              <View style={styles.resultBox}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultMetaText}>
                    {queryResult.rowCount} rows returned in {queryResult.executionTimeMs}ms
                  </Text>
                </View>

                {queryResult.rows.length === 0 ? (
                  <Text style={styles.emptyQueryText}>Query completed with 0 rows returned.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={styles.tableGrid}>
                      {/* Table Header Row */}
                      <View style={styles.gridHeaderRow}>
                        {queryResult.columns.map((col) => (
                          <View key={col} style={styles.gridHeaderCell}>
                            <Text numberOfLines={1} style={styles.gridHeaderCellText}>
                              {col}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Table Data Rows */}
                      {queryResult.rows.map((row, rIdx) => (
                        <View key={rIdx} style={styles.gridDataRow}>
                          {queryResult.columns.map((col) => (
                            <View key={col} style={styles.gridDataCell}>
                              <Text numberOfLines={2} style={styles.gridDataCellText}>
                                {row[col] !== null && row[col] !== undefined
                                  ? String(row[col])
                                  : "NULL"}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}

        {/* Tab 3: Schema DDL */}
        {activeTab === "schema" && (
          <View style={styles.schemaList}>
            {tables.map((tbl) => (
              <View key={tbl.name} style={styles.schemaCard}>
                <View style={styles.schemaCardHeader}>
                  <Text style={styles.schemaTableName}>{tbl.name}</Text>
                  <Text style={styles.schemaColCount}>{tbl.columns.length} columns</Text>
                </View>

                {/* Column Table */}
                <View style={styles.colDetailsTable}>
                  <View style={styles.colTableHeaderRow}>
                    <Text style={[styles.colHeaderCell, { flex: 2 }]}>COLUMN</Text>
                    <Text style={[styles.colHeaderCell, { flex: 2 }]}>TYPE</Text>
                    <Text style={[styles.colHeaderCell, { flex: 1 }]}>PK</Text>
                    <Text style={[styles.colHeaderCell, { flex: 1 }]}>NOT NULL</Text>
                  </View>
                  {tbl.columns.map((col) => (
                    <View key={col.cid} style={styles.colTableRow}>
                      <Text style={[styles.colCell, { flex: 2, fontWeight: "600" }]}>
                        {col.name}
                      </Text>
                      <Text style={[styles.colCell, { flex: 2, color: styles.typeColor.color }]}>
                        {col.type || "BLOB"}
                      </Text>
                      <Text style={[styles.colCell, { flex: 1 }]}>
                        {col.pk ? "✓" : "—"}
                      </Text>
                      <Text style={[styles.colCell, { flex: 1 }]}>
                        {col.notnull ? "✓" : "—"}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* DDL SQL Block */}
                {tbl.sql ? (
                  <View style={styles.ddlBlock}>
                    <Text style={styles.ddlCodeText}>{tbl.sql};</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Selected Table Records Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsRecordModalOpen(false)}
        transparent
        visible={isRecordModalOpen}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Dismiss records view"
            onPress={() => setIsRecordModalOpen(false)}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.modalSheet,
              isDesktop && styles.modalSheetDesktop,
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedTable}</Text>
                <Text style={styles.modalSubtitle}>
                  {tableData?.totalCount ?? 0} total records
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={() => setIsRecordModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView horizontal style={styles.modalTableScroll}>
              <View>
                {/* Table Header */}
                <View style={styles.gridHeaderRow}>
                  {tableData?.columns.map((col) => (
                    <View key={col} style={styles.gridHeaderCell}>
                      <Text numberOfLines={1} style={styles.gridHeaderCellText}>
                        {col}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Table Rows */}
                <ScrollView style={{ maxHeight: 420 }}>
                  {tableData?.rows.length === 0 ? (
                    <View style={{ padding: 24, alignItems: "center" }}>
                      <Text style={styles.emptyQueryText}>No records found in this table.</Text>
                    </View>
                  ) : (
                    tableData?.rows.map((row, rIdx) => (
                      <View key={rIdx} style={styles.gridDataRow}>
                        {tableData.columns.map((col) => (
                          <View key={col} style={styles.gridDataCell}>
                            <Text numberOfLines={2} style={styles.gridDataCellText}>
                              {row[col] !== null && row[col] !== undefined
                                ? String(row[col])
                                : "NULL"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
      paddingBottom: 80,
    },
    placeholder: {
      color: theme.colors.textSecondary,
    },
    typeColor: {
      color: theme.colors.primary,
    },
    metricsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
    },
    metricCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flex: 1,
      minWidth: 130,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    primaryValue: {
      color: theme.colors.primary,
    },
    tabBar: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      padding: 4,
    },
    tabItem: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      flex: 1,
      paddingVertical: 10,
    },
    tabItemActive: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: "700",
    },
    tablesGrid: {
      gap: 12,
    },
    tableCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    tableCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    tableCardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    tableNameText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    rowCountBadge: {
      backgroundColor: `${theme.colors.primary}20`,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    rowCountText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    columnSummaryText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    cardFooter: {
      alignItems: "flex-end",
      marginTop: 10,
    },
    inspectLink: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    consoleCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    consoleTitle: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    presetsScroll: {
      gap: 8,
      marginBottom: 12,
    },
    presetPill: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    presetText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    sqlInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontSize: 13,
      minHeight: 90,
      padding: 12,
      textAlignVertical: "top",
    },
    consoleActionsRow: {
      alignItems: "flex-end",
      marginTop: 12,
    },
    runQueryBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    runQueryBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    errorBox: {
      backgroundColor: "rgba(255, 92, 92, 0.15)",
      borderColor: theme.colors.danger,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 12,
      padding: 10,
    },
    errorBoxText: {
      color: theme.colors.danger,
      fontSize: 13,
    },
    resultBox: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      marginTop: 16,
      paddingTop: 14,
    },
    resultHeader: {
      marginBottom: 8,
    },
    resultMetaText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    emptyQueryText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontStyle: "italic",
      marginTop: 8,
    },
    tableGrid: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      overflow: "hidden",
      marginTop: 6,
    },
    gridHeaderRow: {
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: "row",
    },
    gridHeaderCell: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      width: 130,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    gridHeaderCellText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    gridDataRow: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: "row",
    },
    gridDataCell: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      width: 130,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      justifyContent: "center",
    },
    gridDataCellText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    schemaList: {
      gap: 14,
    },
    schemaCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    schemaCardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    schemaTableName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    schemaColCount: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    colDetailsTable: {
      borderColor: theme.colors.border,
      borderRadius: 6,
      borderWidth: 1,
      marginBottom: 12,
      overflow: "hidden",
    },
    colTableHeaderRow: {
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    colHeaderCell: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    colTableRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    colCell: {
      color: theme.colors.textPrimary,
      fontSize: 12,
    },
    ddlBlock: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 6,
      padding: 10,
    },
    ddlCodeText: {
      color: theme.colors.textSecondary,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      fontSize: 11,
      lineHeight: 16,
    },
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    modalSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "85%",
      padding: 20,
      width: "100%",
    },
    modalSheetDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      height: "80%",
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 750,
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    modalSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "bold",
    },
    modalTableScroll: {
      flex: 1,
    },
  });
}
