import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { fundGroupErrorMessage } from "@/modules/accounts/schemas/fund-group.schema";
import { getFundGroupsWorkspace } from "@/modules/accounts/services/get-fund-groups.service";
import type { FundGroupsWorkspace } from "@/modules/accounts/types/fund-group.types";

const EMPTY_WORKSPACE: FundGroupsWorkspace = {
  groups: [],
  accounts: [],
  pockets: [],
};

export function useFundGroups() {
  const [data, setData] = useState<FundGroupsWorkspace>(EMPTY_WORKSPACE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      setData(getFundGroupsWorkspace());
      setError(null);
    } catch (cause) {
      setError(fundGroupErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return { ...data, loading, error, refresh };
}
