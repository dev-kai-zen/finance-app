import { useMemo, useState } from "react";
import { getNetWorthGrowthReport } from "../services/get-net-worth-growth-report.service";
import type {
  NetWorthGrowthDateRange,
  NetWorthGrowthPreset,
  NetWorthGrowthReportData,
} from "../types/net-worth-growth.types";
import { getNetWorthDateRange } from "../utils/net-worth-dates";
import { toDateKey } from "../utils/reports-dates";

export function useNetWorthGrowthReport() {
  const [preset, setPreset] = useState<NetWorthGrowthPreset>("1y");

  const now = useMemo(() => new Date(), []);
  const [customDateA, setCustomDateA] = useState<string>(() => {
    const prev = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return toDateKey(prev);
  });
  const [customDateB, setCustomDateB] = useState<string>(() => toDateKey(now));

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const range: NetWorthGrowthDateRange = useMemo(() => {
    return getNetWorthDateRange(preset, {
      customDateA,
      customDateB,
    });
  }, [preset, customDateA, customDateB]);

  const data: NetWorthGrowthReportData = useMemo(() => {
    return getNetWorthGrowthReport(range);
  }, [range]);

  return {
    preset,
    setPreset,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    selectedPointIndex,
    setSelectedPointIndex,
  };
}
