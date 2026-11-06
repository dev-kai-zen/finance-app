import { deferComponent } from "@/utils/deferred-module";

export const DataImportScreen = deferComponent(
  () => require("./screens/data-import-screen").DataImportScreen,
  "DataImportScreen",
) as typeof import("./screens/data-import-screen").DataImportScreen;
