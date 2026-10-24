import { useEffect, useState } from "react";

import {
  isWhatsNewPending,
  subscribeToWhatsNew,
} from "../services/whats-new.service";

export function useIsWhatsNewPending(): boolean {
  const [pending, setPending] = useState(() => isWhatsNewPending());

  useEffect(() => {
    const check = () => {
      setPending(isWhatsNewPending());
    };
    check();
    return subscribeToWhatsNew(check);
  }, []);

  return pending;
}
