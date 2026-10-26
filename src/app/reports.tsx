import { useLocalSearchParams } from "expo-router";
import { ReportsScreen } from "@/modules/reports";
import type { ReportTabKey } from "@/modules/reports/types/reports.types";

export default function ReportsRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab =
    tab === "balance-sheet" ||
    tab === "income-expense" ||
    tab === "cash-flow" ||
    tab === "net-worth" ||
    tab === "labels-summary"
      ? (tab as ReportTabKey)
      : undefined;
  return <ReportsScreen initialTab={initialTab} />;
}

