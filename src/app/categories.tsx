import { useLocalSearchParams } from "expo-router";
import { CategoriesScreen } from "@/modules/categories";

export default function CategoriesRoute() {
  const { setup, type } = useLocalSearchParams<{
    setup?: string;
    type?: string;
  }>();
  const initialType =
    type === "income" || type === "expense" ? type : undefined;
  return (
    <CategoriesScreen
      initialType={initialType}
      initialView={setup === "group" ? "group" : undefined}
    />
  );
}
