import { useEffect, useRef, type PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AppTheme } from "@/constants/theme";
import { AccountButton, AccountError, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";

export function AccountModalSheet({ title, onClose, pending = false, error, children }: PropsWithChildren<{
  title: string; onClose: () => void; pending?: boolean; error?: string | null;
}>) {
  const s = useThemeStyles(styles);
  const common = useThemeStyles(accountStyles);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { if (error) scroll.current?.scrollTo({ y: 0, animated: true }); }, [error]);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => { if (!pending) onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <View accessibilityViewIsModal style={[s.sheet, { marginTop: insets.top + 16, marginBottom: insets.bottom + 16 }]}>
          <View style={common.spread}>
            <AccountText heading>{title}</AccountText>
            <AccountButton label="Close" onPress={onClose} disabled={pending} />
          </View>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <AccountError message={error} />
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function styles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.lg },
    sheet: { width: "100%", maxWidth: 620, maxHeight: "92%", flexShrink: 1, backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large, padding: theme.spacing.lg, gap: theme.spacing.md, ...theme.shadows.modal },
    content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  });
}
