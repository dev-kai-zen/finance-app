import { StyleSheet, View } from "react-native";
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
    <View style={styles.container}>
      <View style={styles.headerLine} />
      <PageContainer contentContainerStyle={styles.page} maxWidth={760}>
        <InfoModal
          message={t("googleDriveBackup.helpMessage")}
          onClose={onCloseHelp}
          title={t("googleDriveBackup.helpTitle")}
          visible={helpVisible}
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
    headerLine: {
      backgroundColor: theme.colors.border,
      height: 1,
      width: "100%",
    },
    page: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
  });
}
