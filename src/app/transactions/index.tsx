import { useLocalSearchParams } from "expo-router";
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  const { accountId, action, type } = useLocalSearchParams<{
    accountId?: string;
    action?: string;
    type?: string;
  }>();
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
  const initialAction =
    typeof action === "string" && action.length > 0 ? action : undefined;
  const initialType =
    typeof type === "string" && type.length > 0 ? type : undefined;

  return (
    <TransactionsScreen
      initialAccountId={initialAccountId}
      initialAction={initialAction}
      initialType={initialType}
    />
  );
}

