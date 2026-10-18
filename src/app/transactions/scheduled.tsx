import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { InfoModal, ModalScreenHeader } from "@/components";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ScheduledTransactionsScreen } from "@/modules/scheduled-transactions";

export default function ScheduledTransactionsRoute() {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        helpAccessibilityHint={t("scheduledTransactions.helpTitle")}
        helpAccessibilityLabel={t("scheduledTransactions.helpTitle")}
        onPressHelp={() => setHelpVisible(true)}
        title={t("navigation.scheduledTransactions")}
      />
      <InfoModal
        message={t("scheduledTransactions.helpMessage")}
        onClose={() => setHelpVisible(false)}
        title={t("scheduledTransactions.helpTitle")}
        visible={helpVisible}
      />
      <ScheduledTransactionsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

