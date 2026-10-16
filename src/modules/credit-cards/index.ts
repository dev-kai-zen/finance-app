import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const CreditCardMonitoringScreen = deferComponent(
  () =>
    require("./screens/credit-card-monitoring-screen")
      .CreditCardMonitoringScreen,
  "CreditCardMonitoringScreen",
) as typeof import("./screens/credit-card-monitoring-screen").CreditCardMonitoringScreen;

export const useCreditCardMonitoring = deferFunction(
  () =>
    require("./hooks/use-credit-card-monitoring").useCreditCardMonitoring,
) as typeof import("./hooks/use-credit-card-monitoring").useCreditCardMonitoring;

export const createCreditCardInstallmentPlan = deferFunction(
  () =>
    require("./services/create-installment-plan.service")
      .createCreditCardInstallmentPlan,
) as typeof import("./services/create-installment-plan.service").createCreditCardInstallmentPlan;

export const getCreditCardMonitoring = deferFunction(
  () =>
    require("./services/get-credit-card-monitoring.service")
      .getCreditCardMonitoring,
) as typeof import("./services/get-credit-card-monitoring.service").getCreditCardMonitoring;

export const reconcileCreditCardBilling = deferFunction(
  () =>
    require("./services/reconcile-credit-card-billing.service")
      .reconcileCreditCardBilling,
) as typeof import("./services/reconcile-credit-card-billing.service").reconcileCreditCardBilling;

export const reconcileCreditCardBillingInContext = deferFunction(
  () =>
    require("./services/reconcile-credit-card-billing.service")
      .reconcileCreditCardBillingInContext,
) as typeof import("./services/reconcile-credit-card-billing.service").reconcileCreditCardBillingInContext;

export const getInstallmentPlanForTransaction = deferFunction(
  () =>
    require("./services/get-installment-plan.service")
      .getInstallmentPlanForTransaction,
) as typeof import("./services/get-installment-plan.service").getInstallmentPlanForTransaction;

export const getInstallmentPlanEditState = deferFunction(
  () =>
    require("./services/get-installment-plan-edit-state.service")
      .getInstallmentPlanEditState,
) as typeof import("./services/get-installment-plan-edit-state.service").getInstallmentPlanEditState;

export const applyTransactionInstallmentChanges = deferFunction(
  () =>
    require("./services/apply-transaction-installment-changes.service")
      .applyTransactionInstallmentChanges,
) as typeof import("./services/apply-transaction-installment-changes.service").applyTransactionInstallmentChanges;

export const useInstallmentPlanEditState = deferFunction(
  () =>
    require("./hooks/use-installment-plan-edit-state").useInstallmentPlanEditState,
) as typeof import("./hooks/use-installment-plan-edit-state").useInstallmentPlanEditState;

export const previewInstallmentPlan = deferFunction(
  () =>
    require("./services/preview-installment-plan.service")
      .previewInstallmentPlan,
) as typeof import("./services/preview-installment-plan.service").previewInstallmentPlan;

export const CreditLimitWarningModal = deferComponent(
  () =>
    require("./components/credit-limit-warning-modal").CreditLimitWarningModal,
  "CreditLimitWarningModal",
) as typeof import("./components/credit-limit-warning-modal").CreditLimitWarningModal;

export const checkCreditLimitExceeded = deferFunction(
  () =>
    require("./services/check-credit-limit-exceeded.service")
      .checkCreditLimitExceeded,
) as typeof import("./services/check-credit-limit-exceeded.service").checkCreditLimitExceeded;

export type {
  CreditCardInstallment,
  CreditCardInstallmentPlan,
  CreditCardActivityItem,
  CreditCardMonitoringItem,
  CreditCardMonitoringSummary,
  CreditCardStatement,
  CreditCardStatementEntry,
  CreditCardStatementSummary,
  InstallmentInput,
  InstallmentPlanEditState,
} from "./types/credit-card.types";
export type { InstallmentPlanPreview } from "./services/preview-installment-plan.service";
export type {
  CheckCreditLimitInput,
  CreditLimitCheckResult,
} from "./services/check-credit-limit-exceeded.service";
export {
  calculateCreditCardAvailableLimit,
  calculateCreditCardBilled,
  calculateCreditCardOutstanding,
  calculateCreditCardUnbilled,
  calculateCreditCardUtilization,
  CreditCardAvailableLimitComputation,
  CreditCardBilledComputation,
  CreditCardOutstandingComputation,
  CreditCardUnbilledComputation,
  CreditCardUtilizationComputation,
} from "./utils/credit-card-computations";
