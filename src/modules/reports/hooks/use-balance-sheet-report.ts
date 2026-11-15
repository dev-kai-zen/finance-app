import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrencyPreferences } from "@/modules/currencies";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { getBalanceSheetComparison } from "../services/get-balance-sheet-comparison.service";
import type {
  BalanceSheetComparisonData,
  CollapseLevel,
  ComparisonPreset,
  ExpandLevel,
  VarianceValue,
} from "../types/reports.types";
import {
  getComparisonDateRange,
  toDateKey,
} from "../utils/reports-dates";

const ZERO_VARIANCE: VarianceValue = {
  prevMinorUnits: 0,
  currentMinorUnits: 0,
  diffMinorUnits: 0,
  isFavorable: false,
  direction: "neutral",
  symbol: "",
  color: "",
  formattedDiff: "",
};

const EMPTY_BALANCE_SHEET: BalanceSheetComparisonData = {
  range: {
    prevDate: new Date(0),
    currentDate: new Date(0),
    prevLabel: "",
    currentLabel: "",
  },
  assets: {
    group: "asset",
    title: "",
    variance: ZERO_VARIANCE,
    accountTypes: [],
  },
  liabilities: {
    group: "liability",
    title: "",
    variance: ZERO_VARIANCE,
    accountTypes: [],
  },
  netWorth: {
    prevMinorUnits: 0,
    currentMinorUnits: 0,
    diffMinorUnits: 0,
    variance: ZERO_VARIANCE,
  },
};

export function useBalanceSheetReport() {
  const { preferences } = useCurrencyPreferences();
  const [preset, setPreset] = useState<ComparisonPreset>("prev-vs-today");
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(true);

  // MoM state
  const now = useMemo(() => new Date(), []);
  const [momYear, setMomYear] = useState<number>(() => now.getFullYear());
  const [momMonth, setMomMonth] = useState<number>(() =>
    now.getMonth() > 0 ? now.getMonth() - 1 : 11,
  );

  // Custom dates state (defaults: 1 month ago vs today)
  const [customDateA, setCustomDateA] = useState<string>(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return toDateKey(prev);
  });
  const [customDateB, setCustomDateB] = useState<string>(() => toDateKey(now));

  // Expanded nodes set
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);
  const [data, setData] = useState<BalanceSheetComparisonData>(EMPTY_BALANCE_SHEET);
  const [reportLoading, setReportLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  // Compute date range
  const range = useMemo(() => {
    return getComparisonDateRange(preset, {
      momYear,
      momMonth,
      customDateA,
      customDateB,
    });
  }, [preset, momYear, momMonth, customDateA, customDateB]);

  // Compute comparison data
  useEffect(() => {
    runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading: setReportLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        setData(getBalanceSheetComparison(range, { hideZeroBalances }));
      },
    );
  }, [range, hideZeroBalances, preferences.defaultCurrency]);

  // Initial expansion: Expand all (including pockets) by default
  useEffect(() => {
    if (!hasInitializedExpansion && (data.assets.accountTypes.length > 0 || data.liabilities.accountTypes.length > 0)) {
      const keys = new Set<string>();
      keys.add("group:asset");
      keys.add("group:liability");

      for (const group of [data.assets, data.liabilities]) {
        for (const type of group.accountTypes) {
          keys.add(`type:${type.id}`);
          for (const acc of type.accounts) {
            keys.add(`account:${acc.id}`);
          }
        }
      }
      setExpandedKeys(keys);
      setHasInitializedExpansion(true);
    }
  }, [data, hasInitializedExpansion]);

  // Toggle individual key
  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (key: string) => expandedKeys.has(key),
    [expandedKeys],
  );

  // Expand All with level
  const expandAll = useCallback(
    (level: ExpandLevel) => {
      const keys = new Set<string>();
      keys.add("group:asset");
      keys.add("group:liability");

      for (const group of [data.assets, data.liabilities]) {
        for (const type of group.accountTypes) {
          keys.add(`type:${type.id}`);
          if (level === "pockets") {
            // Also expand account level to show pockets
            for (const acc of type.accounts) {
              keys.add(`account:${acc.id}`);
            }
          }
        }
      }
      setExpandedKeys(keys);
    },
    [data],
  );

  // Collapse All with level
  const collapseAll = useCallback(
    (level: CollapseLevel) => {
      if (level === "groups") {
        // Only keep groups, or collapse everything
        setExpandedKeys(new Set());
      } else if (level === "types") {
        // Keep groups expanded, but collapse all types
        const keys = new Set<string>();
        keys.add("group:asset");
        keys.add("group:liability");
        setExpandedKeys(keys);
      }
    },
    [],
  );

  return {
    preset,
    setPreset,
    hideZeroBalances,
    setHideZeroBalances,
    momYear,
    setMomYear,
    momMonth,
    setMomMonth,
    customDateA,
    setCustomDateA,
    customDateB,
    setCustomDateB,
    range,
    data,
    reportLoading,
    expandedKeys,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
  };
}
