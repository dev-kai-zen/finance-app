import { Landmark, Users } from "lucide-react-native";
import { ActionBottomSheet } from "@/components/action-bottom-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export function AccountsFabSheet({
  visible,
  onClose,
  onAddAccount,
  onManageTypes,
}: {
  visible: boolean;
  onClose: () => void;
  onAddAccount: () => void;
  onManageTypes: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useLocalization();

  return (
    <ActionBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("accountsWalkthrough.stepSheetTitle")}
      items={[
        {
          id: "add-account",
          label: t("accountsWalkthrough.actionAddAccount"),
          description: t("accountsWalkthrough.actionAddAccountDesc"),
          icon: <Landmark color={theme.colors.primary} size={22} />,
          onPress: onAddAccount,
        },
        {
          id: "manage-types",
          label: t("accountsWalkthrough.actionManageTypes"),
          description: t("accountsWalkthrough.actionManageTypesDesc"),
          icon: <Users color={theme.colors.primary} size={22} />,
          onPress: onManageTypes,
        },
      ]}
    />
  );
}
