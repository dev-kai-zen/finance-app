import { Text, View } from "react-native";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { accountColor, accountIcon } from "@/modules/accounts/constants/account-appearance.constants";
import { accountStyles } from "@/modules/accounts/components/account-ui";

export function AccountTypeBadge({ iconKey, color }: { iconKey: string | null; color: string | null }) {
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  return <View style={s.badge} accessible={false}>
    <Text accessibilityElementsHidden importantForAccessibility="no" style={[s.heading, { color: accountColor(theme, color) }]}>{accountIcon(iconKey)}</Text>
  </View>;
}
