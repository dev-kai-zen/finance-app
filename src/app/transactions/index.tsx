import { useLocalSearchParams } from "expo-router";
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;

  return <TransactionsScreen initialAccountId={initialAccountId} />;
}

