import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

const DEFAULT_CELL_WIDTH = 148;

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function MonitorQueryResultGrid({
  columns,
  rows,
  cellWidth = DEFAULT_CELL_WIDTH,
  maxBodyHeight = 420,
}: {
  columns: string[];
  rows: ReadonlyArray<Record<string, unknown>>;
  cellWidth?: number;
  maxBodyHeight?: number;
}) {
  const styles = useThemeStyles(createStyles);
  const tableWidth = Math.max(columns.length * cellWidth, cellWidth);

  if (columns.length === 0) {
    return (
      <Text style={styles.emptyText}>Query completed with 0 columns returned.</Text>
    );
  }

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      style={styles.horizontalScroll}
    >
      <View style={[styles.tableGrid, { width: tableWidth }]}>
        <View style={styles.gridHeaderRow}>
          {columns.map((col) => (
            <View key={col} style={[styles.gridHeaderCell, { width: cellWidth }]}>
              <Text selectable style={styles.gridHeaderCellText}>
                {col}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={{ maxHeight: maxBodyHeight }}
        >
          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No rows returned.</Text>
            </View>
          ) : (
            rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridDataRow}>
                {columns.map((col) => (
                  <View key={col} style={[styles.gridDataCell, { width: cellWidth }]}>
                    <Text selectable style={styles.gridDataCellText}>
                      {formatCellValue(row[col])}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    horizontalScroll: {
      flexGrow: 0,
    },
    tableGrid: {
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden",
    },
    gridHeaderRow: {
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
    },
    gridHeaderCell: {
      borderRightColor: theme.colors.border,
      borderRightWidth: 1,
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    gridHeaderCellText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    gridDataRow: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
    },
    gridDataCell: {
      borderRightColor: theme.colors.border,
      borderRightWidth: 1,
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    gridDataCellText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    emptyRow: {
      alignItems: "center",
      padding: 24,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontStyle: "italic",
    },
  });
}
