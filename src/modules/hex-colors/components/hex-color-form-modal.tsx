import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { KeyboardAwareForm } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { HexColor, HexColorInput } from "../types/hex-color.types";

export interface HexColorFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: HexColorInput, id?: string) => Promise<boolean> | boolean;
  initialColor?: HexColor | null;
}

const PRESET_SWATCHES = [
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Violet", hex: "#7C3AED" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Fuchsia", hex: "#D946EF" },
  { name: "Mint", hex: "#059669" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Gold", hex: "#EAB308" },
  { name: "Indigo Light", hex: "#6366F1" },
];

function isValidHex(hex: string): boolean {
  const trimmed = hex.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(withHash);
}

export function HexColorFormModal({
  visible,
  onClose,
  onSave,
  initialColor = null,
}: HexColorFormModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [name, setName] = useState("");
  const [hex, setHex] = useState("#");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialColor) {
        setName(initialColor.name);
        setHex(initialColor.hex.startsWith("#") ? initialColor.hex : `#${initialColor.hex}`);
      } else {
        setName("");
        setHex("#");
      }
      setError(null);
      setPending(false);
    }
  }, [visible, initialColor]);

  const handleHexChange = (input: string) => {
    let formatted = input.trim();
    if (!formatted.startsWith("#")) {
      formatted = `#${formatted}`;
    }
    setHex(formatted.toUpperCase());
  };

  const handleSelectPreset = (preset: { name: string; hex: string }) => {
    setHex(preset.hex);
    if (!name.trim()) {
      setName(preset.name);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a color name.");
      return;
    }

    const formattedHex = hex.trim().startsWith("#") ? hex.trim() : `#${hex.trim()}`;
    if (!isValidHex(formattedHex)) {
      setError("Invalid hex color format. Use 6-digit hex like #10B981.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const success = await onSave(
        { name: trimmedName, hex: formattedHex.toUpperCase() },
        initialColor?.id,
      );
      if (success !== false) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save hex color.");
    } finally {
      setPending(false);
    }
  };

  const currentPreviewColor = isValidHex(hex) ? hex : theme.colors.surfaceMuted;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Dismiss form"
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheet,
            isDesktop && styles.sheetDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>
              {initialColor ? "Edit Custom Color" : "New Custom Color"}
            </Text>
            <Pressable accessibilityLabel="Close form" onPress={onClose} style={styles.closeBtn}>
              <X color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <KeyboardAwareForm style={styles.formScroll}>
            {/* Color Preview & Swatch */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewSwatch,
                  { backgroundColor: currentPreviewColor },
                ]}
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{name.trim() || "Color Preview"}</Text>
                <Text style={styles.previewHex}>
                  {isValidHex(hex) ? hex.toUpperCase() : "Enter valid hex code"}
                </Text>
              </View>
            </View>

            {/* Color Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>COLOR NAME</Text>
              <TextInput
                editable={!pending}
                maxLength={50}
                onChangeText={setName}
                placeholder="e.g. Emerald Green, Sunset Orange"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.textInput}
                value={name}
              />
            </View>

            {/* Hex Code Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>HEX COLOR CODE</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!pending}
                maxLength={9}
                onChangeText={handleHexChange}
                placeholder="#10B981"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.textInput, styles.hexInput]}
                value={hex}
              />
            </View>

            {/* Quick Preset Palette Swatches */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>QUICK PALETTE PRESETS</Text>
              <View style={styles.presetRow}>
                {PRESET_SWATCHES.map((preset) => {
                  const isSelected = hex.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <Pressable
                      key={preset.hex}
                      accessibilityLabel={`Select preset color ${preset.name}`}
                      onPress={() => handleSelectPreset(preset)}
                      style={[
                        styles.presetChip,
                        { backgroundColor: preset.hex },
                        isSelected && styles.presetChipSelected,
                      ]}
                    >
                      {isSelected ? <Check color="#FFFFFF" size={14} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </KeyboardAwareForm>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <Pressable accessibilityLabel="Cancel" onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={pending ? "Saving..." : "Save Color"}
              disabled={pending}
              onPress={handleSave}
              style={[styles.saveBtn, pending && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>{pending ? "Saving..." : "Save Color"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 440,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    formScroll: {
      maxHeight: 380,
    },
    previewContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    previewSwatch: {
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 2,
      height: 48,
      width: 48,
      ...theme.shadows.card,
    },
    previewInfo: {
      flex: 1,
      gap: 2,
    },
    previewName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    previewHex: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
    },
    inputGroup: {
      marginBottom: theme.spacing.md,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    hexInput: {
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 1,
    },
    presetRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 4,
    },
    presetChip: {
      alignItems: "center",
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 999,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    presetChipSelected: {
      borderColor: theme.colors.textPrimary,
      borderWidth: 2.5,
      transform: [{ scale: 1.15 }],
    },
    footerRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    saveBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
