import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { fundGroupErrorMessage } from "@/modules/accounts/schemas/fund-group.schema";
import { getFundGroupsWorkspace } from "@/modules/accounts/services/get-fund-groups.service";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import type { FundGroupsWorkspace } from "@/modules/accounts/types/fund-group.types";

const EMPTY_WORKSPACE: FundGroupsWorkspace = {
  groups: [],
  accounts: [],
  pockets: [],
};

export interface UseFundGroupsOptions {
  /**
   * Optional preloaded accounts and pockets (e.g. from `useAccounts`) so fund groups
   * reuse already-fetched balances instead of querying SQLite balances a second time.
   */
  preloadedAccounts?: AccountListItem[];
  preloadedPockets?: PocketListItem[];
}

export function useFundGroups(options?: UseFundGroupsOptions) {
  const hasPreloaded =
    options?.preloadedAccounts !== undefined &&
    options?.preloadedPockets !== undefined;
  const preloadedRef = useRef<{
    accounts?: AccountListItem[];
    pockets?: PocketListItem[];
  }>({
    accounts: options?.preloadedAccounts,
    pockets: options?.preloadedPockets,
  });
  preloadedRef.current = {
    accounts: options?.preloadedAccounts,
    pockets: options?.preloadedPockets,
  };

  const [data, setData] = useState<FundGroupsWorkspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const preloaded =
        preloadedRef.current.accounts !== undefined &&
        preloadedRef.current.pockets !== undefined
          ? {
              accounts: preloadedRef.current.accounts,
              pockets: preloadedRef.current.pockets,
            }
          : undefined;
      setData(getFundGroupsWorkspace(undefined, preloaded));
      setError(null);
    } catch (cause) {
      setError(fundGroupErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const isFirstPreloadedEffectRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Keep fund group totals in sync whenever preloaded balances update after initial mount
  useEffect(() => {
    if (!hasPreloaded) return;
    if (isFirstPreloadedEffectRef.current) {
      isFirstPreloadedEffectRef.current = false;
      return;
    }
    refresh();
  }, [hasPreloaded, options?.preloadedAccounts, options?.preloadedPockets, refresh]);

  return { ...data, loading, error, refresh };
}
