import { useLocalSearchParams } from "expo-router";
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  const { accountId, categoryId, datePreset, action, type } =
    useLocalSearchParams<{
      accountId?: string;
      categoryId?: string;
      datePreset?: string;
      action?: string;
      type?: string;
    }>();
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
  const initialCategoryId =
    typeof categoryId === "string" && categoryId.length > 0
      ? categoryId
      : undefined;
  const initialDatePreset =
    typeof datePreset === "string" && datePreset.length > 0
      ? datePreset
      : undefined;
  const initialAction =
    typeof action === "string" && action.length > 0 ? action : undefined;
  const initialType =
    typeof type === "string" && type.length > 0 ? type : undefined;

  return (
    <TransactionsScreen
      initialAccountId={initialAccountId}
      initialCategoryId={initialCategoryId}
      initialDatePreset={initialDatePreset}
      initialAction={initialAction}
      initialType={initialType}
    />
  );
}
