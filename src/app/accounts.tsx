import { useLocalSearchParams } from "expo-router";
import { AccountsScreen } from "@/modules/accounts";

export default function AccountsRoute() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const initialView =
    setup === "types" || setup === "account" ? setup : undefined;
  return <AccountsScreen initialView={initialView} />;
}
