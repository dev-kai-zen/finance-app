import { useLocalSearchParams } from "expo-router";
import { ReportsScreen, type ReportTabKey } from "@/modules/reports";

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

