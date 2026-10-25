import { useLocalSearchParams } from "expo-router";
import { GoalsScreen } from "@/modules/goals";

export default function GoalsRoute() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  return (
    <GoalsScreen initialAction={action === "new" ? "new" : undefined} />
  );
}
