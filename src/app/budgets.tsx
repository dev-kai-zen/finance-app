import { useLocalSearchParams } from "expo-router";
import { BudgetsScreen } from "@/modules/budgets";

export default function BudgetsRoute() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  return (
    <BudgetsScreen initialAction={action === "new" ? "new" : undefined} />
  );
}
