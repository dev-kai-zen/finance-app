import { useLocalSearchParams } from "expo-router";
import { AccountsScreen } from "@/modules/accounts";

export default function AccountsRoute() {
  const { setup, view } = useLocalSearchParams<{
    setup?: string;
    view?: string;
  }>();
  const initialView =
    setup === "types" || setup === "account" || setup === "archived"
      ? setup
      : view === "archived"
        ? "archived"
        : undefined;
  return <AccountsScreen initialView={initialView} />;
}
