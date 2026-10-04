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

export const previewInstallmentPlan = deferFunction(
  () =>
    require("./services/preview-installment-plan.service")
      .previewInstallmentPlan,
) as typeof import("./services/preview-installment-plan.service").previewInstallmentPlan;

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
} from "./types/credit-card.types";
export type { InstallmentPlanPreview } from "./services/preview-installment-plan.service";
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
