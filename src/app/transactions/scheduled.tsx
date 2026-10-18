import { StyleSheet, View } from "react-native";
import { ModalScreenHeader } from "@/components";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ScheduledTransactionsScreen } from "@/modules/scheduled-transactions";

export default function ScheduledTransactionsRoute() {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        title={t("navigation.scheduledTransactions")}
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

