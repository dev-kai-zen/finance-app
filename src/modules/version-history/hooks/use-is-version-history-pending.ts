import { useEffect, useState } from "react";

import {
  isVersionHistoryPending,
  subscribeToVersionHistory,
} from "../services/version-history.service";

export function useIsVersionHistoryPending(): boolean {
  const [pending, setPending] = useState(() => isVersionHistoryPending());

  useEffect(() => {
    const check = () => {
      setPending(isVersionHistoryPending());
    };
    check();
    return subscribeToVersionHistory(check);
  }, []);

  return pending;
}
