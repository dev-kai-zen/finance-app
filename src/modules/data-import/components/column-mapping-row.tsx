import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Check, AlertTriangle, Info } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type {
  DateFormatPattern,
  FieldDefinition,
} from "../constants/data-import.constants";
import { checkFirstRowFormat } from "../services/detect-format.service";

interface ColumnMappingRowProps {
  field: FieldDefinition;
  headers: string[];
  rawRows: string[][];
  selectedColumn?: string;
  activeCurrencyCodes: Set<string>;
  activeDateFormat: DateFormatPattern;
  onSelectColumn: (colName: string | undefined) => void;
  onSelectDateFormat?: (pattern: DateFormatPattern) => void;
}

export function ColumnMappingRow({
  field,
  headers,
  rawRows,
  selectedColumn,
  activeCurrencyCodes,
  activeDateFormat,
  onSelectColumn,
  onSelectDateFormat,
}: ColumnMappingRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isMapped = Boolean(selectedColumn);

  // Check first row value and format
  const formatCheck = useMemo(() => {
    if (!selectedColumn) return null;
    return checkFirstRowFormat(
      selectedColumn,
      headers,
      rawRows,
      field.format,
      activeCurrencyCodes,
      activeDateFormat,
    );
  }, [activeCurrencyCodes, activeDateFormat, field.format, headers, rawRows, selectedColumn]);

  const statusColor = isMapped ? theme.colors.success : theme.colors.warning;
  const statusBg = isMapped ? `${theme.colors.success}18` : `${theme.colors.warning}18`;
  const statusText = isMapped ? "Mapped" : "Not mapped";

  return (
    <View style={styles.card}>
      {/* What Kaizen needs */}
      <View style={styles.fieldHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.fieldName}>{field.defaultLabel}</Text>
          <View style={[styles.badge, field.required ? styles.requiredBadge : styles.optionalBadge]}>
            <Text style={[styles.badgeText, field.required ? styles.requiredText : styles.optionalText]}>
              {field.required ? "Required" : "Optional"}
            </Text>
          </View>
        </View>
        <Text style={styles.formatText}>Format: {field.format}</Text>
      </View>

      {/* Column in your file dropdown trigger */}
      <View style={styles.mappingSection}>
        <Text style={styles.sectionLabel}>Column in your file</Text>
        <Pressable
          accessibilityLabel={`Select file column for ${field.defaultLabel}`}
          accessibilityRole="combobox"
          onPress={() => setDropdownOpen(true)}
          style={[styles.dropdownTrigger, { borderColor: statusColor }]}
        >
          <View style={styles.dropdownLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusIndicatorText, { color: statusColor }]}>{statusText}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.columnSelectedText, !isMapped && styles.notMappedText]}>
              {selectedColumn || "Not mapped"}
            </Text>
          </View>
          <ChevronDown color={theme.colors.textSecondary} size={18} />
        </Pressable>
      </View>

      {/* Example from your file */}
      {isMapped && formatCheck && formatCheck.exampleValue ? (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>Example from your file:</Text>
          <Text numberOfLines={2} style={styles.exampleValue}>
            "{formatCheck.exampleValue}"
          </Text>
          {formatCheck.reading ? (
            <Text style={styles.readingText}>Reading: {formatCheck.reading}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Warning on format mismatch */}
      {isMapped && formatCheck && !formatCheck.isMatch && formatCheck.warning ? (
        <View style={styles.warningContainer}>
          <AlertTriangle color={theme.colors.warning} size={16} />
          <Text style={styles.warningText}>{formatCheck.warning}</Text>
        </View>
      ) : null}

      {/* Ambiguous date prompt (e.g. 01/02/2026) */}
      {isMapped && field.format === "Date" && formatCheck?.isAmbiguousDate && formatCheck.dateOption1 && formatCheck.dateOption2 ? (
        <View style={styles.ambiguousContainer}>
          <Text style={styles.ambiguousTitle}>
            Which date matches the first row in your file?
          </Text>
          <View style={styles.ambiguousOptions}>
            <Pressable
              accessibilityRole="radio"
              onPress={() => onSelectDateFormat?.(formatCheck.dateOption1!.format)}
              style={[
                styles.ambiguousButton,
                activeDateFormat === formatCheck.dateOption1.format && styles.ambiguousButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.ambiguousButtonText,
                  activeDateFormat === formatCheck.dateOption1.format && styles.ambiguousButtonTextActive,
                ]}
              >
                {formatCheck.dateOption1.reading}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              onPress={() => onSelectDateFormat?.(formatCheck.dateOption2!.format)}
              style={[
                styles.ambiguousButton,
                activeDateFormat === formatCheck.dateOption2.format && styles.ambiguousButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.ambiguousButtonText,
                  activeDateFormat === formatCheck.dateOption2.format && styles.ambiguousButtonTextActive,
                ]}
              >
                {formatCheck.dateOption2.reading}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Later dates needing attention notice */}
      {isMapped && field.format === "Date" && formatCheck && (formatCheck.invalidLaterDateCount ?? 0) > 0 ? (
        <View style={styles.infoNotice}>
          <Info color={theme.colors.info} size={14} />
          <Text style={styles.infoNoticeText}>
            {formatCheck.invalidLaterDateCount} later {formatCheck.invalidLaterDateCount === 1 ? "date needs" : "dates need"} attention. You can review them before importing.
          </Text>
        </View>
      ) : null}

      {/* Modal Dropdown Picker */}
      <Modal animationType="fade" onRequestClose={() => setDropdownOpen(false)} transparent visible={dropdownOpen}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setDropdownOpen(false)} style={styles.modalBackdrop} />
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>Choose column for {field.defaultLabel}</Text>
            <Pressable
              onPress={() => {
                onSelectColumn(undefined);
                setDropdownOpen(false);
              }}
              style={[styles.optionRow, !isMapped && styles.optionRowSelected]}
            >
              <Text style={[styles.optionText, !isMapped && styles.optionTextSelected]}>
                Not mapped
              </Text>
              {!isMapped && <Check color={theme.colors.primary} size={18} />}
            </Pressable>

            {headers.map((colName) => {
              const selected = selectedColumn === colName;
              return (
                <Pressable
                  key={colName}
                  onPress={() => {
                    onSelectColumn(colName);
                    setDropdownOpen(false);
                  }}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {colName}
                  </Text>
                  {selected && <Check color={theme.colors.primary} size={18} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    fieldHeader: {
      marginBottom: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    fieldName: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    requiredBadge: {
      backgroundColor: `${theme.colors.primary}18`,
    },
    optionalBadge: {
      backgroundColor: `${theme.colors.textMuted}18`,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600",
    },
    requiredText: {
      color: theme.colors.primary,
    },
    optionalText: {
      color: theme.colors.textSecondary,
    },
    formatText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    mappingSection: {
      marginTop: theme.spacing.sm,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      marginBottom: 4,
      textTransform: "uppercase",
    },
    dropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
    },
    dropdownLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    statusIndicator: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusIndicatorText: {
      fontSize: 11,
      fontWeight: "700",
    },
    columnSelectedText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
    },
    notMappedText: {
      color: theme.colors.textMuted,
      fontWeight: "500",
    },
    exampleContainer: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: `${theme.colors.border}40`,
      borderRadius: theme.borderRadius.sm,
    },
    exampleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    exampleValue: {
      fontSize: 13,
      color: theme.colors.text,
      fontStyle: "italic",
      marginTop: 2,
    },
    readingText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: "600",
      marginTop: 4,
    },
    warningContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${theme.colors.warning}14`,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },
    warningText: {
      fontSize: 12,
      color: theme.colors.warning,
      flex: 1,
      lineHeight: 16,
    },
    ambiguousContainer: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      backgroundColor: `${theme.colors.info}12`,
      borderRadius: theme.borderRadius.sm,
    },
    ambiguousTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    ambiguousOptions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    ambiguousButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
    },
    ambiguousButtonActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}18`,
    },
    ambiguousButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    ambiguousButtonTextActive: {
      color: theme.colors.primary,
    },
    infoNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: theme.spacing.xs,
    },
    infoNoticeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    dropdownModal: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      maxHeight: "75%",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    optionRowSelected: {
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: theme.borderRadius.sm,
    },
    optionText: {
      fontSize: 15,
      color: theme.colors.text,
    },
    optionTextSelected: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
  });
}

