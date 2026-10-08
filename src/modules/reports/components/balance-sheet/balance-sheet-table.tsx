import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Minus,
  WalletCards,
} from "lucide-react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import type {
  BalanceSheetComparisonData,
  ReportAccountNode,
  ReportAccountTypeNode,
  ReportGroupNode,
  ReportPocketNode,
} from "../../types/reports.types";
import { BalanceSheetDiffCell } from "./balance-sheet-diff-cell";

interface BalanceSheetTableProps {
  data: BalanceSheetComparisonData;
  isExpanded: (key: string) => boolean;
  onToggleExpanded: (key: string) => void;
}

export function BalanceSheetTable({
  data,
  isExpanded,
  onToggleExpanded,
}: BalanceSheetTableProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const { width } = useWindowDimensions();
  const isNarrow = width < 560;

  return (
    <View style={styles.container}>
      {isNarrow ? (
        <View style={styles.scrollHint}>
          <Text style={styles.scrollHintText}>
            ⇄ Scroll horizontally to view all columns
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        <View style={styles.tableWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={[styles.colAccount, styles.headerCol]}>
              <Text style={styles.headerText}>ACCOUNT / HIERARCHY</Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text numberOfLines={1} style={styles.headerText}>
                {data.range.prevLabel}
              </Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text numberOfLines={1} style={styles.headerText}>
                {data.range.currentLabel}
              </Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text style={styles.headerText}>DIFFERENCE</Text>
            </View>
          </View>

          {/* Group 1: ASSETS */}
          <GroupSection
            groupNode={data.assets}
            groupKey="group:asset"
            isExpanded={isExpanded}
            onToggleExpanded={onToggleExpanded}
          />

          {/* Group 2: LIABILITIES */}
          <GroupSection
            groupNode={data.liabilities}
            groupKey="group:liability"
            isExpanded={isExpanded}
            onToggleExpanded={onToggleExpanded}
          />

          {/* Net Worth Summary Row */}
          <View style={styles.netWorthRow}>
            <View style={[styles.colAccount, styles.netWorthCol]}>
              <Text style={styles.netWorthTitle}>NET WORTH</Text>
            </View>
            <View style={[styles.colNumeric, styles.netWorthCol]}>
              <Text numberOfLines={1} style={styles.netWorthAmount}>
                {formatCurrency(data.netWorth.prevMinorUnits, currencyCode)}
              </Text>
            </View>
            <View style={[styles.colNumeric, styles.netWorthCol]}>
              <Text numberOfLines={1} style={styles.netWorthAmount}>
                {formatCurrency(data.netWorth.currentMinorUnits, currencyCode)}
              </Text>
            </View>
            <View style={[styles.colNumeric, styles.netWorthCol]}>
              <BalanceSheetDiffCell variance={data.netWorth.variance} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function GroupSection({
  groupNode,
  groupKey,
  isExpanded,
  onToggleExpanded,
}: {
  groupNode: ReportGroupNode;
  groupKey: string;
  isExpanded: (key: string) => boolean;
  onToggleExpanded: (key: string) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const expanded = isExpanded(groupKey);

  return (
    <View style={styles.groupSection}>
      {/* Group Header Row */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${groupNode.title}, Total Current: ${formatCurrency(
          groupNode.variance.currentMinorUnits,
          currencyCode,
        )}. Tap to ${expanded ? "collapse" : "expand"}.`}
        onPress={() => onToggleExpanded(groupKey)}
        style={({ pressed }) => [
          styles.groupHeaderRow,
          pressed && styles.pressedRow,
        ]}
      >
        <View style={styles.colAccount}>
          <View style={styles.nameWithIcon}>
            {expanded ? (
              <ChevronDown size={16} color={styles.groupChevron.color} />
            ) : (
              <ChevronRight size={16} color={styles.groupChevron.color} />
            )}
            <Text style={styles.groupTitleText}>{groupNode.title}</Text>
          </View>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.groupNumericText}>
            {formatCurrency(groupNode.variance.prevMinorUnits, currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.groupNumericText}>
            {formatCurrency(groupNode.variance.currentMinorUnits, currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <BalanceSheetDiffCell variance={groupNode.variance} />
        </View>
      </Pressable>

      {/* Account Types */}
      {expanded ? (
        groupNode.accountTypes.length > 0 ? (
          groupNode.accountTypes.map((typeNode) => (
            <AccountTypeSection
              key={typeNode.id}
              typeNode={typeNode}
              isExpanded={isExpanded}
              onToggleExpanded={onToggleExpanded}
            />
          ))
        ) : (
          <View style={styles.emptyGroupRow}>
            <Text style={styles.emptyText}>No active accounts found in this category.</Text>
          </View>
        )
      ) : null}
    </View>
  );
}

function AccountTypeSection({
  typeNode,
  isExpanded,
  onToggleExpanded,
}: {
  typeNode: ReportAccountTypeNode;
  isExpanded: (key: string) => boolean;
  onToggleExpanded: (key: string) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const typeKey = `type:${typeNode.id}`;
  const expanded = isExpanded(typeKey);

  return (
    <View style={styles.typeSection}>
      {/* Account Type Header Row */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${typeNode.name}, Current: ${formatCurrency(
          typeNode.variance.currentMinorUnits,
          currencyCode,
        )}. Tap to ${expanded ? "collapse" : "expand"}.`}
        onPress={() => onToggleExpanded(typeKey)}
        style={({ pressed }) => [
          styles.typeHeaderRow,
          pressed && styles.pressedRow,
        ]}
      >
        <View style={styles.colAccount}>
          <View style={[styles.nameWithIcon, { paddingLeft: 16 }]}>
            {expanded ? (
              <ChevronDown size={14} color={styles.typeChevron.color} />
            ) : (
              <ChevronRight size={14} color={styles.typeChevron.color} />
            )}
            <View
              style={[
                styles.typeIconBadge,
                typeNode.color ? { backgroundColor: `${typeNode.color}20` } : null,
              ]}
            >
              <IconHelper
                color={typeNode.color ?? styles.defaultTypeIcon.color}
                name={typeNode.iconKey ?? "landmark"}
                size={12}
              />
            </View>
            <Text numberOfLines={1} style={styles.typeTitleText}>
              {typeNode.name}
            </Text>
          </View>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.typeNumericText}>
            {formatCurrency(typeNode.variance.prevMinorUnits, currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.typeNumericText}>
            {formatCurrency(typeNode.variance.currentMinorUnits, currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <BalanceSheetDiffCell variance={typeNode.variance} />
        </View>
      </Pressable>

      {/* Accounts */}
      {expanded
        ? typeNode.accounts.map((accNode) => (
            <AccountRow
              key={accNode.id}
              accountNode={accNode}
              isExpanded={isExpanded}
              onToggleExpanded={onToggleExpanded}
            />
          ))
        : null}
    </View>
  );
}

function AccountRow({
  accountNode,
  isExpanded,
  onToggleExpanded,
}: {
  accountNode: ReportAccountNode;
  isExpanded: (key: string) => boolean;
  onToggleExpanded: (key: string) => void;
}) {
  const styles = useThemeStyles(createStyles);
  const accKey = `account:${accountNode.id}`;
  const hasPockets = accountNode.pocketEnabled && accountNode.pockets.length > 0;
  const expanded = hasPockets ? isExpanded(accKey) : false;

  return (
    <View style={styles.accountBlock}>
      <Pressable
        accessibilityRole={hasPockets ? "button" : "text"}
        accessibilityLabel={`${accountNode.name}, Current: ${formatCurrency(
          accountNode.variance.currentMinorUnits,
          accountNode.currencyCode,
        )}`}
        onPress={() => {
          if (hasPockets) {
            onToggleExpanded(accKey);
          }
        }}
        style={({ pressed }) => [
          styles.accountRow,
          hasPockets && pressed && styles.pressedRow,
        ]}
      >
        <View style={styles.colAccount}>
          <View style={[styles.nameWithIcon, { paddingLeft: 34 }]}>
            {hasPockets ? (
              expanded ? (
                <ChevronDown size={13} color={styles.accountChevron.color} />
              ) : (
                <ChevronRight size={13} color={styles.accountChevron.color} />
              )
            ) : (
              <Minus size={11} color={styles.accountChevron.color} />
            )}
            <Text numberOfLines={1} style={styles.accountTitleText}>
              {accountNode.name}
            </Text>
          </View>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.accountNumericText}>
            {formatCurrency(accountNode.variance.prevMinorUnits, accountNode.currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <Text numberOfLines={1} style={styles.accountNumericText}>
            {formatCurrency(accountNode.variance.currentMinorUnits, accountNode.currencyCode)}
          </Text>
        </View>
        <View style={styles.colNumeric}>
          <BalanceSheetDiffCell variance={accountNode.variance} />
        </View>
      </Pressable>

      {/* Pockets under this account */}
      {hasPockets && expanded
        ? accountNode.pockets.map((pocketNode) => (
            <PocketRow
              key={pocketNode.id}
              pocketNode={pocketNode}
              currencyCode={accountNode.currencyCode}
            />
          ))
        : null}
    </View>
  );
}

function PocketRow({
  pocketNode,
  currencyCode,
}: {
  pocketNode: ReportPocketNode;
  currencyCode: string;
}) {
  const styles = useThemeStyles(createStyles);
  const isAvailable = pocketNode.id === "__available__";

  return (
    <View style={styles.pocketRow}>
      <View style={styles.colAccount}>
        <View style={[styles.nameWithIcon, { paddingLeft: 56 }]}>
          {isAvailable ? (
            <WalletCards size={12} color={styles.pocketIcon.color} />
          ) : (
            <Folder size={12} color={styles.pocketIcon.color} />
          )}
          <Text numberOfLines={1} style={styles.pocketTitleText}>
            {pocketNode.name}
          </Text>
        </View>
      </View>
      <View style={styles.colNumeric}>
        <Text numberOfLines={1} style={styles.pocketNumericText}>
          {formatCurrency(pocketNode.variance.prevMinorUnits, currencyCode)}
        </Text>
      </View>
      <View style={styles.colNumeric}>
        <Text numberOfLines={1} style={styles.pocketNumericText}>
          {formatCurrency(pocketNode.variance.currentMinorUnits, currencyCode)}
        </Text>
      </View>
      <View style={styles.colNumeric}>
        <BalanceSheetDiffCell variance={pocketNode.variance} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollHint: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: 5,
      paddingHorizontal: 16,
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    scrollHintText: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    horizontalScrollContent: {
      minWidth: "100%",
    },
    tableWrapper: {
      minWidth: 540,
      width: "100%",
      backgroundColor: theme.colors.surface,
    },
    // Columns
    colAccount: {
      flex: 1.6,
      minWidth: 190,
      justifyContent: "center",
      paddingLeft: 12,
      paddingRight: 8,
    },
    colNumeric: {
      flex: 1,
      minWidth: 115,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    // Header
    headerRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerCol: {
      justifyContent: "center",
    },
    headerText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    // Group Level
    groupSection: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    groupHeaderRow: {
      flexDirection: "row",
      paddingVertical: 10,
      backgroundColor: `${theme.colors.primary}0A`,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    groupTitleText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      letterSpacing: 0.5,
    },
    groupNumericText: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    groupChevron: {
      color: theme.colors.textPrimary,
    },
    // Type Level
    typeSection: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    typeHeaderRow: {
      flexDirection: "row",
      paddingVertical: 9,
      backgroundColor: theme.colors.surface,
    },
    typeTitleText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    typeNumericText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    typeIconBadge: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    typeChevron: {
      color: theme.colors.textSecondary,
    },
    defaultTypeIcon: {
      color: theme.colors.textSecondary,
    },
    // Account Level
    accountBlock: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.border}60`,
    },
    accountRow: {
      flexDirection: "row",
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
    },
    accountTitleText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    accountNumericText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    accountChevron: {
      color: theme.colors.textMuted,
    },
    // Pocket Level
    pocketRow: {
      flexDirection: "row",
      paddingVertical: 6,
      backgroundColor: `${theme.colors.surfaceMuted}40`,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${theme.colors.border}40`,
    },
    pocketTitleText: {
      fontSize: 11,
      fontWeight: "400",
      color: theme.colors.textSecondary,
    },
    pocketNumericText: {
      fontSize: 11,
      fontWeight: "400",
      color: theme.colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    pocketIcon: {
      color: theme.colors.textMuted,
    },
    // Net Worth Summary
    netWorthRow: {
      flexDirection: "row",
      paddingVertical: 14,
      backgroundColor: `${theme.colors.primary}15`,
      borderTopWidth: 2,
      borderTopColor: theme.colors.primary,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.primary,
    },
    netWorthCol: {
      justifyContent: "center",
    },
    netWorthTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.primary,
      letterSpacing: 0.8,
    },
    netWorthAmount: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    // Shared
    nameWithIcon: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    pressedRow: {
      opacity: 0.7,
      backgroundColor: theme.colors.surfaceMuted,
    },
    emptyGroupRow: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.surface,
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
    },
  });
}
