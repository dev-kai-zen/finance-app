import { useLocalSearchParams } from "expo-router";
import { CategoriesScreen } from "@/modules/categories";

export default function CategoriesRoute() {
  const { setup, type, categoryId } = useLocalSearchParams<{
    setup?: string;
    type?: string;
    categoryId?: string;
  }>();
  const initialType =
    type === "income" || type === "expense" ? type : undefined;
  const initialCategoryId =
    typeof categoryId === "string" && categoryId.length > 0
      ? categoryId
      : undefined;
  return (
    <CategoriesScreen
      initialType={initialType}
      initialView={setup === "group" ? "group" : undefined}
      initialCategoryId={initialCategoryId}
    />
  );
}
