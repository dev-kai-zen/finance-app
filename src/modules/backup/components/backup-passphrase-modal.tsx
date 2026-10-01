import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, KeyRound, ShieldOff, X } from "lucide-react-native";

import { NotificationModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { validateBackupPassphrase } from "@/modules/backup/utils/backup-format";

interface BackupPassphraseModalProps {
  visible: boolean;
  mode: "create" | "restore";
  pending: boolean;
  onCancel: () => void;
  onSubmit: (passphrase: string | null) => Promise<boolean>;
}

export function BackupPassphraseModal({
  visible,
  mode,
  pending,
  onCancel,
  onSubmit,
}: BackupPassphraseModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [protection, setProtection] = useState<"password" | "none">("password");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassphrase("");
      setConfirmation("");
      setProtection("password");
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (mode === "create" && protection === "none") {
      setError(null);
      const succeeded = await onSubmit(null);
      if (succeeded) onCancel();
      return;
    }

    const validationError = validateBackupPassphrase(passphrase);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (mode === "create" && passphrase !== confirmation) {
      setError("The passphrases do not match.");
      return;
    }

    setError(null);
    const succeeded = await onSubmit(passphrase);
    if (succeeded) onCancel();
  };

  return (
    <>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!pending) onCancel();
        }}
        transparent
        visible={visible}
      >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Dismiss passphrase form"
          accessibilityRole="button"
          disabled={pending}
          onPress={onCancel}
          style={styles.backdrop}
        />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <KeyRound color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>
                  {mode === "create" ? "Backup protection" : "Unlock backup"}
                </Text>
                <Text style={styles.subtitle}>
                  {mode === "create"
                    ? "Choose whether this backup needs a password to restore."
                    : "Enter the password used when this backup was created."}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={pending}
              hitSlop={10}
              onPress={onCancel}
            >
              <X color={theme.colors.textMuted} size={20} />
            </Pressable>
          </View>

          {mode === "create" ? (
            <View style={styles.protectionChoices}>
              <ProtectionChoice
                description="Encrypt the backup. You will need this password to restore it."
                disabled={pending}
                icon="password"
                label="Use a password"
                onPress={() => {
                  setProtection("password");
                  setError(null);
                }}
                selected={protection === "password"}
              />
              <ProtectionChoice
                description="Restore without a password. Anyone with the file can read it."
                disabled={pending}
                icon="none"
                label="No password"
                onPress={() => {
                  setProtection("none");
                  setError(null);
                }}
                selected={protection === "none"}
              />
            </View>
          ) : null}

          {mode === "restore" || protection === "password" ? (
            <TextInput
              accessibilityLabel="Backup password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pending}
              onChangeText={setPassphrase}
              onSubmitEditing={mode === "restore" ? handleSubmit : undefined}
              placeholder="At least 12 characters"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType={mode === "restore" ? "done" : "next"}
              secureTextEntry
              style={styles.input}
              value={passphrase}
            />
          ) : null}

          {mode === "create" && protection === "password" ? (
            <TextInput
              accessibilityLabel="Confirm backup passphrase"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pending}
              onChangeText={setConfirmation}
              onSubmitEditing={handleSubmit}
              placeholder="Confirm passphrase"
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              value={confirmation}
            />
          ) : null}

          <Text style={styles.warning}>
            {mode === "create" && protection === "none"
              ? "This backup will not be encrypted. Keep the file and your Google account secure."
              : "Kaizen Finance cannot recover a forgotten password."}
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={onCancel}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton, pending && styles.disabled]}
            >
              {pending ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "create" ? "Create backup" : "Restore"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      </Modal>

      <NotificationModal
        message={error ?? ""}
        onClose={() => setError(null)}
        title="Check backup protection"
        variant="warning"
        visible={visible && Boolean(error)}
      />
    </>
  );
}

function ProtectionChoice({
  description,
  disabled,
  icon,
  label,
  onPress,
  selected,
}: {
  description: string;
  disabled: boolean;
  icon: "password" | "none";
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const Icon = icon === "password" ? KeyRound : ShieldOff;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.protectionChoice,
        selected && styles.protectionChoiceSelected,
        disabled && styles.disabled,
      ]}
    >
      <Icon
        color={selected ? theme.colors.primary : theme.colors.textMuted}
        size={19}
      />
      <View style={styles.protectionCopy}>
        <Text style={styles.protectionLabel}>{label}</Text>
        <Text style={styles.protectionDescription}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Check color={theme.colors.onPrimary} size={13} /> : null}
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      maxWidth: 440,
      padding: theme.spacing.xl,
      width: "100%",
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    titleRow: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: 999,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    titleCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    input: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    protectionChoices: {
      gap: theme.spacing.sm,
    },
    protectionChoice: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 68,
      padding: theme.spacing.md,
    },
    protectionChoiceSelected: {
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: theme.colors.primary,
    },
    protectionCopy: {
      flex: 1,
      gap: 2,
    },
    protectionLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    protectionDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    radio: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    radioSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    warning: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    button: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
    },
    cancelButton: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    submitText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    disabled: {
      opacity: 0.6,
    },
  });
}
