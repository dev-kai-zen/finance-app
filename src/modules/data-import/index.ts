import { deferComponent } from "@/utils/deferred-module";
export type { ImportKind } from "./types/import.types";

export const DataImportScreen = deferComponent(
  () => require("./screens/data-import-screen").DataImportScreen,
  "DataImportScreen",
) as typeof import("./screens/data-import-screen").DataImportScreen;
