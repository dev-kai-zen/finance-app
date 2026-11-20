import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppToast,
  InfoModal,
  KeyboardAwareForm,
  ModalScreenHeader,
  PageContainer,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { GoogleDriveBackupPanel } from "@/modules/google-drive-backup/components/google-drive-backup-panel";

export function GoogleDriveBackupScreen({
  helpVisible,
  onCloseHelp,
}: {
  helpVisible?: boolean;
  onCloseHelp?: () => void;
} = {}) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [internalHelpVisible, setInternalHelpVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isHelpVisible = helpVisible ?? internalHelpVisible;
  const handleCloseHelp = onCloseHelp ?? (() => setInternalHelpVisible(false));
  const handleShowToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);
  const handleCloseToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return (
    <View style={styles.container}>
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        helpAccessibilityHint={t("googleDriveBackup.helpTitle")}
        helpAccessibilityLabel={t("googleDriveBackup.helpTitle")}
        onPressHelp={() => setInternalHelpVisible(true)}
        title={t("navigation.googleDriveBackup")}
      />
      <KeyboardAwareForm
        bottomOffset={28}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        style={styles.scrollWrapper}
      >
        <PageContainer
          contentContainerStyle={styles.page}
          maxWidth={760}
          scrollable={false}
        >
          <InfoModal
            message={t("googleDriveBackup.helpMessage")}
            onClose={handleCloseHelp}
            title={t("googleDriveBackup.helpTitle")}
            visible={isHelpVisible}
          />
          <GoogleDriveBackupPanel onShowToast={handleShowToast} />
        </PageContainer>
      </KeyboardAwareForm>
      <AppToast
        includeSafeArea
        message={toastMessage ?? ""}
        onClose={handleCloseToast}
        position="top"
        variant="success"
        visible={toastMessage !== null}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollWrapper: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    page: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
  });
}
