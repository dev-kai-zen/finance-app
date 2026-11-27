import { useLocalSearchParams } from "expo-router";
import { TransactionsScreen } from "@/modules/transactions";

export default function TransactionsRoute() {
  const {
    budgetScope,
    accountId,
    pocketId,
    categoryId,
    exactCategory,
    datePreset,
    action,
    type,
    flow,
    search,
    inspectId,
    labelId,
  } = useLocalSearchParams<{
    budgetScope?: string | string[];
    accountId?: string;
    pocketId?: string;
    categoryId?: string;
    exactCategory?: string;
    datePreset?: string;
    action?: string;
    type?: string;
    flow?: string;
    search?: string;
    inspectId?: string;
    labelId?: string;
  }>();
  const initialAccountId =
    typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
  const initialPocketId =
    typeof pocketId === "string" && pocketId.length > 0 ? pocketId : undefined;
  const initialCategoryId =
    typeof categoryId === "string" && categoryId.length > 0
      ? categoryId
      : undefined;
  const initialExactCategory = exactCategory === "true";
  const initialDatePreset =
    typeof datePreset === "string" && datePreset.length > 0
      ? datePreset
      : undefined;
  const initialAction =
    typeof action === "string" && action.length > 0 ? action : undefined;
  const initialType =
    typeof type === "string" && type.length > 0 ? type : undefined;
  const initialFlow =
    flow === "inflow" || flow === "outflow" ? flow : undefined;
  const initialSearch =
    typeof search === "string" && search.length > 0 ? search : undefined;
  const initialInspectId =
    typeof inspectId === "string" && inspectId.length > 0
      ? inspectId
      : undefined;
  const initialLabelId =
    typeof labelId === "string" && labelId.length > 0 ? labelId : undefined;

  return (
    <TransactionsScreen
      initialBudgetScope={budgetScope === undefined ? undefined : typeof budgetScope === "string" ? budgetScope : ""}
      initialAccountId={initialAccountId}
      initialPocketId={initialPocketId}
      initialCategoryId={initialCategoryId}
      initialExactCategory={initialExactCategory}
      initialDatePreset={initialDatePreset}
      initialAction={initialAction}
      initialType={initialType}
      initialFlow={initialFlow}
      initialSearch={initialSearch}
      initialInspectId={initialInspectId}
      initialLabelId={initialLabelId}
    />
  );
}
