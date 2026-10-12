import { useEffect, useState } from "react";
import { getInstallmentPlanEditState } from "../services/get-installment-plan-edit-state.service";
import type { InstallmentPlanEditState } from "../types/credit-card.types";

const EMPTY: InstallmentPlanEditState = {
  plan: null,
  billedInstallmentCount: 0,
  canModifyInstallmentPlan: true,
  hasChargeStatementEntry: false,
};

export function useInstallmentPlanEditState(
  transactionId: string | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<InstallmentPlanEditState>(EMPTY);

  useEffect(() => {
    if (!enabled || !transactionId) {
      setState(EMPTY);
      return;
    }
    try {
      setState(getInstallmentPlanEditState(transactionId));
    } catch {
      setState(EMPTY);
    }
  }, [enabled, transactionId]);

  return state;
}
