import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import {
  useAppTheme,
  useThemeStyles,
} from "@/hooks/use-app-theme";

export const RESET_DATA_CONFIRMATION_PHRASE = "KAIZEN";

interface ResetDataModalProps {
  error: string | null;
  pending: boolean;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetDataModal({
  error,
  pending,
  visible,
  onCancel,
  onConfirm,
}: ResetDataModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isConfirmed = confirmation === RESET_DATA_CONFIRMATION_PHRASE;

  useEffect(() => {
    if (!visible) setConfirmation("");
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!pending) onCancel();
      }}
      onShow={() => inputRef.current?.focus()}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Dismiss reset data confirmation"
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          style={styles.backdrop}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View
            style={[
              styles.card,
              isTabletOrDesktop(width) && styles.cardDesktop,
            ]}
          >
            <View style={styles.iconCircle}>
              <AlertTriangle color={theme.colors.danger} size={26} />
            </View>

            <Text style={styles.title}>Reset all data?</Text>
            <Text style={styles.message}>
              This permanently deletes your accounts, transactions, budgets,
              goals, notes, settings, attachments, and app-managed local
              backups from this device.
            </Text>
            <Text style={styles.externalNote}>
              Exported files and Google Drive backups will not be deleted.
            </Text>

            <Text style={styles.inputLabel}>
              Type <Text style={styles.confirmationPhrase}>KAIZEN</Text> to
              confirm
            </Text>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Type KAIZEN to confirm resetting all data"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!pending}
              onChangeText={setConfirmation}
              placeholder="KAIZEN"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={confirmation}
            />

            {error ? (
              <Text accessibilityRole="alert" selectable style={styles.error}>
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <AppButton
                disabled={pending}
                label="Cancel"
                onPress={onCancel}
                style={styles.action}
                variant="secondary"
              />
              <AppButton
                disabled={!isConfirmed}
                label="Delete all data"
                loading={pending}
                onPress={onConfirm}
                style={styles.action}
                variant="destructive"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "center",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    scrollView: {
      flexGrow: 0,
      maxHeight: "100%",
      width: "100%",
    },
    scrollContent: {
      alignItems: "center",
      flexGrow: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      padding: theme.spacing.xl,
      width: "100%",
      ...theme.shadows.modal,
    },
    cardDesktop: {
      maxWidth: 460,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: 999,
      borderWidth: 1,
      height: 58,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 58,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    message: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    externalNote: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.xs,
      marginTop: theme.spacing.xl,
    },
    confirmationPhrase: {
      color: theme.colors.danger,
      fontWeight: theme.typography.fontWeight.bold,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      width: "100%",
    },
    error: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xl,
    },
    action: {
      flex: 1,
    },
  });
}
