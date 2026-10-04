import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  ArrowUpDown,
  Check,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react-native";

import { ActionBottomSheet } from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import type { NoteSortOption, NoteViewMode } from "../types/note.types";

export interface NoteSortFilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  viewMode: NoteViewMode;
  onViewModeChange: (mode: NoteViewMode) => void;
  sortBy: NoteSortOption;
  onSortByChange: (sort: NoteSortOption) => void;
}

const SORT_OPTIONS: { id: NoteSortOption; label: string }[] = [
  { id: "last_modified_desc", label: "Last Modified (Newest First)" },
  { id: "last_modified_asc", label: "Last Modified (Oldest First)" },
  { id: "title_asc", label: "Title (A → Z)" },
  { id: "title_desc", label: "Title (Z → A)" },
];

export function NoteSortFilterBar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: NoteSortFilterBarProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const currentSortLabel =
    sortBy === "title_asc" || sortBy === "title_desc"
      ? "Title"
      : "Modified";

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search color={theme.colors.textMuted} size={16} />
        <TextInput
          accessibilityLabel="Search notes"
          clearButtonMode="while-editing"
          onChangeText={onSearchChange}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear search"
            hitSlop={6}
            onPress={() => onSearchChange("")}
          >
            <X color={theme.colors.textMuted} size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* Action Controls: View Switch + Sort Trigger */}
      <View style={styles.controlsRow}>
        {/* View Mode Toggle */}
        <View style={styles.segmentedControl}>
          <Pressable
            accessibilityLabel="Tiles View"
            accessibilityRole="button"
            onPress={() => onViewModeChange("tiles")}
            style={[
              styles.segmentButton,
              viewMode === "tiles" && styles.segmentButtonActive,
            ]}
          >
            <LayoutGrid
              color={
                viewMode === "tiles"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={17}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Table View"
            accessibilityRole="button"
            onPress={() => onViewModeChange("table")}
            style={[
              styles.segmentButton,
              viewMode === "table" && styles.segmentButtonActive,
            ]}
          >
            <List
              color={
                viewMode === "table"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
              size={17}
            />
          </Pressable>
        </View>

        {/* Sort Button */}
        <Pressable
          accessibilityLabel="Sort options"
          accessibilityRole="button"
          onPress={() => setSortSheetOpen(true)}
          style={styles.sortButton}
        >
          <ArrowUpDown color={theme.colors.textSecondary} size={15} />
          <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
        </Pressable>
      </View>

      {/* Sort selection action bottom sheet */}
      <ActionBottomSheet
        items={SORT_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
          icon:
            sortBy === opt.id ? (
              <Check color={theme.colors.primary} size={18} />
            ) : (
              <View style={{ width: 18 }} />
            ),
          onPress: () => {
            onSortByChange(opt.id);
            setSortSheetOpen(false);
          },
          selected: sortBy === opt.id,
        }))}
        onClose={() => setSortSheetOpen(false)}
        title="Sort Notes By"
        visible={sortSheetOpen}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    searchContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      height: 42,
      paddingHorizontal: theme.spacing.md,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      height: "100%",
    },
    controlsRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    segmentedControl: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      padding: 2,
    },
    segmentButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      height: 32,
      justifyContent: "center",
      width: 40,
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.surface,
      elevation: 1,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    sortButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      height: 34,
      paddingHorizontal: theme.spacing.md,
    },
    sortButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
