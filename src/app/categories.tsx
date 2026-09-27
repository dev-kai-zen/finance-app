import { useLocalSearchParams } from "expo-router";
import { CategoriesScreen } from "@/modules/categories";

export default function CategoriesRoute() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  return <CategoriesScreen initialView={setup === "group" ? "group" : undefined} />;
}
