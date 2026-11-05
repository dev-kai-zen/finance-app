import { useLocalSearchParams } from "expo-router";
import { GoalsScreen } from "@/modules/goals";

export default function GoalsRoute() {
  const { action, goalId } = useLocalSearchParams<{
    action?: string;
    goalId?: string;
  }>();
  return (
    <GoalsScreen
      initialAction={action === "new" ? "new" : undefined}
      initialGoalId={
        typeof goalId === "string" && goalId.length > 0 ? goalId : undefined
      }
    />
  );
}
