import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { InfoModal, ModalScreenHeader, PageContainer } from "@/components";
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

  const isHelpVisible = helpVisible ?? internalHelpVisible;
  const handleCloseHelp = onCloseHelp ?? (() => setInternalHelpVisible(false));

  return (
    <View style={styles.container}>
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        helpAccessibilityHint={t("googleDriveBackup.helpTitle")}
        helpAccessibilityLabel={t("googleDriveBackup.helpTitle")}
        onPressHelp={() => setInternalHelpVisible(true)}
        title={t("navigation.googleDriveBackup")}
      />
      <PageContainer contentContainerStyle={styles.page} maxWidth={760}>
        <InfoModal
          message={t("googleDriveBackup.helpMessage")}
          onClose={handleCloseHelp}
          title={t("googleDriveBackup.helpTitle")}
          visible={isHelpVisible}
        />
        <GoogleDriveBackupPanel />
      </PageContainer>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    page: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
  });
}
