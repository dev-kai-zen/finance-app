import { Landmark, Users } from "lucide-react-native";
import { ActionBottomSheet } from "@/components/action-bottom-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";

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

  return (
    <ActionBottomSheet
      visible={visible}
      onClose={onClose}
      items={[
        {
          id: "add-account",
          label: "Add New Account",
          icon: <Landmark color={theme.colors.primary} size={22} />,
          onPress: onAddAccount,
        },
        {
          id: "manage-types",
          label: "Account Group Setup",
          icon: <Users color={theme.colors.primary} size={22} />,
          onPress: onManageTypes,
        },
      ]}
    />
  );
}
