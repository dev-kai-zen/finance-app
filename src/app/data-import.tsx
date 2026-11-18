import { useLocalSearchParams } from "expo-router";
import { DataImportScreen, type ImportKind } from "@/modules/data-import";

export default function DataImportRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const initialKind: ImportKind | undefined =
    kind === "accounts" || kind === "transactions" ? kind : undefined;
  return <DataImportScreen initialKind={initialKind} />;
}
