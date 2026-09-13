import { View } from "react-native";
import { IconHelper } from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import { accountStyles } from "@/modules/accounts/components/account-ui";

export function AccountTypeBadge({ iconKey, color }: { iconKey: string | null; color: string | null }) {
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  const badgeColor = accountColor(theme, color);

  return (
    <View style={[s.badge, { backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}44` }]} accessible={false}>
      <IconHelper color={badgeColor} name={iconKey ?? "landmark"} size={18} />
    </View>
  );
}
