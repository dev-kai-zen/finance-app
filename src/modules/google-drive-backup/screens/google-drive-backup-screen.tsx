import { StyleSheet } from "react-native";
import { InfoModal, PageContainer } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { GoogleDriveBackupPanel } from "@/modules/google-drive-backup/components/google-drive-backup-panel";

export function GoogleDriveBackupScreen({
  helpVisible,
  onCloseHelp,
}: {
  helpVisible: boolean;
  onCloseHelp: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  return (
    <PageContainer contentContainerStyle={styles.page} maxWidth={760}>
      <InfoModal
        message={t("googleDriveBackup.helpMessage")}
        onClose={onCloseHelp}
        title={t("googleDriveBackup.helpTitle")}
        visible={helpVisible}
      />
      <GoogleDriveBackupPanel />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
  });
}
