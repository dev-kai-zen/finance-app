import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { TransactionDateTimePickerControl } from "./transaction-date-time-picker-control";

type PickerMode = "date" | "time";

interface TransactionDateTimePickerModalProps {
  mode: PickerMode;
  onClose: () => void;
  onConfirm: (value: Date) => void;
  value: Date;
  visible: boolean;
}

export function TransactionDateTimePickerModal({
  mode,
  onClose,
  onConfirm,
  value,
  visible,
}: TransactionDateTimePickerModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  if (!visible) return null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={`Dismiss transaction ${mode} picker`}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheet,
            isDesktop && styles.sheetDesktop,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {mode === "date" ? "Transaction Date" : "Transaction Time"}
            </Text>
            <Pressable
              accessibilityLabel="Close picker"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <X color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          <TransactionDateTimePickerControl
            mode={mode}
            onValueChange={setDraft}
            style={mode === "date" ? styles.datePicker : styles.timePicker}
            value={draft}
          />

          <Pressable
            accessibilityLabel={`Use selected transaction ${mode}`}
            accessibilityRole="button"
            onPress={() => onConfirm(draft)}
            style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: theme.colors.overlay,
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
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    datePicker: {
      minHeight: 320,
      width: "100%",
    },
    timePicker: {
      minHeight: 190,
      width: "100%",
    },
    doneButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      minHeight: 46,
      marginTop: theme.spacing.sm,
    },
    doneButtonPressed: {
      opacity: 0.82,
    },
    doneButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
