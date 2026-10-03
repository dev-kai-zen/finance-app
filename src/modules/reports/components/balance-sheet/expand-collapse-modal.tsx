import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ChevronsDown,
  ChevronsUp,
  FolderMinus,
  FolderPlus,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { CollapseLevel, ExpandLevel } from "../../types/reports.types";

interface ExpandCollapseModalProps {
  visible: boolean;
  onClose: () => void;
  onExpandAll: (level: ExpandLevel) => void;
  onCollapseAll: (level: CollapseLevel) => void;
}

export function ExpandCollapseModal({
  visible,
  onClose,
  onExpandAll,
  onCollapseAll,
}: ExpandCollapseModalProps) {
  const styles = useThemeStyles(createStyles);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Display Hierarchy</Text>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={20} color={styles.closeIcon.color} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>EXPAND</Text>
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onExpandAll("pockets");
                onClose();
              }}
            >
              <View style={styles.iconWrap}>
                <ChevronsDown size={18} color={styles.accentIcon.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.optionTitle}>Expand All (Down to Pockets)</Text>
                <Text style={styles.optionSubtitle}>
                  View all account types, accounts, and individual pockets
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onExpandAll("accounts");
                onClose();
              }}
            >
              <View style={styles.iconWrap}>
                <FolderPlus size={18} color={styles.accentIcon.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.optionTitle}>Expand to Accounts</Text>
                <Text style={styles.optionSubtitle}>
                  Show accounts but keep pocket breakdown collapsed
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>COLLAPSE</Text>
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onCollapseAll("types");
                onClose();
              }}
            >
              <View style={styles.iconWrap}>
                <FolderMinus size={18} color={styles.mutedIcon.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.optionTitle}>Collapse to Account Types</Text>
                <Text style={styles.optionSubtitle}>
                  Show only high-level categories (e.g. Bank, Cash, Credit Card)
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onCollapseAll("groups");
                onClose();
              }}
            >
              <View style={styles.iconWrap}>
                <ChevronsUp size={18} color={styles.mutedIcon.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.optionTitle}>Collapse to Groups</Text>
                <Text style={styles.optionSubtitle}>
                  Summarize by Asset and Liability totals only
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    sheet: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    closeIcon: {
      color: theme.colors.textMuted,
    },
    accentIcon: {
      color: theme.colors.primary,
    },
    mutedIcon: {
      color: theme.colors.textSecondary,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textWrap: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    optionSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: 14,
    },
  });
}
