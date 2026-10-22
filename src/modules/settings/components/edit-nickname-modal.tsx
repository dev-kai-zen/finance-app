import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Smile } from "lucide-react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { AppButton } from "@/components/app-button";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface EditNicknameModalProps {
  currentNickname: string | null;
  visible: boolean;
  onCancel: () => void;
  onSave: (newNickname: string) => void;
}

export function EditNicknameModal({
  currentNickname,
  visible,
  onCancel,
  onSave,
}: EditNicknameModalProps) {
  const [value, setValue] = useState(currentNickname ?? "");
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  useEffect(() => {
    if (visible) {
      setValue(currentNickname ?? "");
    }
  }, [currentNickname, visible]);

  const handleSave = () => {
    onSave(value.trim());
    onCancel();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      onShow={() => inputRef.current?.focus()}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Dismiss nickname modal"
          accessibilityRole="button"
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.dialog,
            isTabletOrDesktop(width) && styles.dialogTablet,
          ]}
        >
          <View style={styles.iconCircle}>
            <Smile color={theme.colors.primary} size={24} />
          </View>
          <Text style={styles.title}>{t("settings.editNicknameTitle")}</Text>
          <Text style={styles.prompt}>{t("settings.editNicknamePrompt")}</Text>

          <TextInput
            ref={inputRef}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            onChangeText={setValue}
            placeholder={t("onboarding.nicknamePlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={value}
          />

          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <AppButton
                label={t("settings.nicknameCancel")}
                onPress={onCancel}
                variant="secondary"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <AppButton
                label={t("settings.nicknameSave")}
                onPress={handleSave}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    dialog: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      maxWidth: 420,
      padding: theme.spacing.xl,
      width: "100%",
      ...theme.shadows.card,
    },
    dialogTablet: {
      maxWidth: 480,
    },
    iconCircle: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    prompt: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      textAlign: "center",
    },
    input: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    buttonWrapper: {
      flex: 1,
    },
  });
}
