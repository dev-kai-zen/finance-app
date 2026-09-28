import { Check, Smartphone, X } from "lucide-react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { ThemePresetCard } from "@/modules/settings/components/theme-preset-card";

export interface ThemePickerModalProps {
  visible: boolean;
  selectedThemeId: string;
  isFollowingSystem: boolean;
  themes: AppTheme[];
  onClose: () => void;
  onSelectTheme: (themeId: string) => void;
  onFollowSystem: () => void;
}

export function ThemePickerModal({
  visible,
  selectedThemeId,
  isFollowingSystem,
  themes,
  onClose,
  onSelectTheme,
  onFollowSystem,
}: ThemePickerModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close theme picker"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheet,
            isWide && styles.sheetWide,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Choose appearance</Text>
              <Text style={styles.subtitle}>
                Preview the full app palette before you leave this screen.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close theme picker"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <X color={theme.colors.textSecondary} size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityLabel="Follow device appearance"
              accessibilityRole="button"
              accessibilityState={{ selected: isFollowingSystem }}
              onPress={onFollowSystem}
              style={({ pressed }) => [
                styles.systemOption,
                isFollowingSystem && styles.systemOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.systemIcon}>
                <Smartphone color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.systemCopy}>
                <Text style={styles.systemTitle}>Follow device appearance</Text>
                <Text style={styles.systemDescription}>
                  Paper in light mode and Ink in dark mode.
                </Text>
              </View>
              <View
                style={[
                  styles.selection,
                  isFollowingSystem && styles.selectionSelected,
                ]}
              >
                {isFollowingSystem ? (
                  <Check
                    color={theme.colors.onPrimary}
                    size={14}
                    strokeWidth={3}
                  />
                ) : null}
              </View>
            </Pressable>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>PALETTES</Text>
              <Text style={styles.sectionHint}>{themes.length} choices</Text>
            </View>

            <View style={styles.cards}>
              {themes.map((preset) => (
                <ThemePresetCard
                  key={preset.id}
                  onPress={() => onSelectTheme(preset.id)}
                  preset={preset}
                  selected={!isFollowingSystem && preset.id === selectedThemeId}
                  style={isWide ? styles.cardWide : undefined}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "92%",
      overflow: "hidden",
      paddingTop: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetWide: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxHeight: "88%",
      maxWidth: 920,
    },
    header: {
      alignItems: "flex-start",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    headerCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.round,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    content: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    systemOption: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 76,
      padding: theme.spacing.md,
    },
    systemOptionSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    systemIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.medium,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    systemCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    systemTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    systemDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    selection: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1.5,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    selectionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    sectionHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    sectionHint: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    cards: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
    },
    cardWide: {
      flexBasis: "48%",
      flexGrow: 1,
    },
    pressed: {
      opacity: 0.76,
    },
  });
}
