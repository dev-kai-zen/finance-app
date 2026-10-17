import { useLocalSearchParams } from "expo-router";
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  const { accountId, action } = useLocalSearchParams<{
    accountId?: string;
    action?: string;
  }>();
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
  const initialAction =
    typeof action === "string" && action.length > 0 ? action : undefined;

  return (
    <TransactionsScreen
      initialAccountId={initialAccountId}
      initialAction={initialAction}
    />
  );
}

