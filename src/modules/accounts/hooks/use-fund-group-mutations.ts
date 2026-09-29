import { useRef, useState } from "react";
import { fundGroupErrorMessage } from "@/modules/accounts/schemas/fund-group.schema";
import { deleteFundGroup } from "@/modules/accounts/services/delete-fund-group.service";
import { saveFundGroup } from "@/modules/accounts/services/save-fund-group.service";
import type { FundGroupInput } from "@/modules/accounts/types/fund-group.types";

export function useFundGroupMutations(onSuccess: () => void) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (operation: () => unknown): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      operation();
      onSuccess();
      return true;
    } catch (cause) {
      setError(fundGroupErrorMessage(cause));
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return {
    pending,
    error,
    clearError: () => setError(null),
    save: (input: FundGroupInput, id?: string) => run(() => saveFundGroup(input, id)),
    remove: (id: string) => run(() => deleteFundGroup(id)),
  };
}
