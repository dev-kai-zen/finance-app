import { useLocalSearchParams } from "expo-router";
import { AccountsScreen } from "@/modules/accounts";

export default function AccountsRoute() {
  const { setup, view, accountId, pocketId } = useLocalSearchParams<{
    setup?: string;
    view?: string;
    accountId?: string;
    pocketId?: string;
  }>();
  const initialView =
    setup === "types" || setup === "account" || setup === "archived"
      ? setup
      : view === "archived"
        ? "archived"
        : undefined;
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
  const initialPocketId =
    typeof pocketId === "string" && pocketId.length > 0 ? pocketId : undefined;

  return (
    <AccountsScreen
      initialView={initialView}
      initialAccountId={initialAccountId}
      initialPocketId={initialPocketId}
    />
  );
}
