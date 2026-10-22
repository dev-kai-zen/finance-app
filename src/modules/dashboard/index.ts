import { deferComponent } from "@/utils/deferred-module";

export const DashboardScreen = deferComponent(
  () => require("./screens/dashboard-screen").DashboardScreen,
  "DashboardScreen",
) as typeof import("./screens/dashboard-screen").DashboardScreen;

export { useDashboard } from "./hooks/use-dashboard";
export {
  getDashboardSummary,
  getAccountDynamicBalances,
  getMonthlyCashflow,
  getCategorySpendingBreakdown,
} from "./repositories/dashboard.repository";
export type {
  DashboardSummary,
  MonthlyCashflow,
  CategorySpendingItem,
  AccountWithBalance,
} from "./types/dashboard.types";
export { DashboardGreetingCard } from "./components/dashboard-greeting-card";
