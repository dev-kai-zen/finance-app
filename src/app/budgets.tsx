import { useLocalSearchParams } from "expo-router";
import { BudgetsScreen } from "@/modules/budgets";

export default function BudgetsRoute() {
  const { action, categoryId } = useLocalSearchParams<{
    action?: string;
    categoryId?: string;
  }>();
  return (
    <BudgetsScreen
      initialAction={action === "new" ? "new" : undefined}
      initialCategoryId={
        typeof categoryId === "string" && categoryId.length > 0
          ? categoryId
          : undefined
      }
    />
  );
}
