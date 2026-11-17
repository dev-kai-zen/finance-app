import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const SubscriptionsScreen = deferComponent(
  () => require("./screens/subscriptions-screen").SubscriptionsScreen,
  "SubscriptionsScreen",
) as typeof import("./screens/subscriptions-screen").SubscriptionsScreen;

export const useSubscriptions = deferFunction(
  () => require("./hooks/use-subscriptions").useSubscriptions,
) as typeof import("./hooks/use-subscriptions").useSubscriptions;

export const saveSubscription = deferFunction(
  () => require("./services/save-subscription.service").saveSubscription,
) as typeof import("./services/save-subscription.service").saveSubscription;

export const recordSubscriptionPayment = deferFunction(
  () =>
    require("./services/record-subscription-payment.service")
      .recordSubscriptionPayment,
) as typeof import("./services/record-subscription-payment.service").recordSubscriptionPayment;

export const handleSubscriptionScheduleExecutedInContext = deferFunction(
  () =>
    require("./services/record-subscription-payment.service")
      .handleSubscriptionScheduleExecutedInContext,
) as typeof import("./services/record-subscription-payment.service").handleSubscriptionScheduleExecutedInContext;

export const scheduleSubscriptionReminders = deferFunction(
  () =>
    require("./services/schedule-sub-reminders.service")
      .scheduleSubscriptionReminders,
) as typeof import("./services/schedule-sub-reminders.service").scheduleSubscriptionReminders;

export const deleteOrArchiveSubscription = deferFunction(
  () =>
    require("./services/delete-subscription.service")
      .deleteOrArchiveSubscription,
) as typeof import("./services/delete-subscription.service").deleteOrArchiveSubscription;

export const restoreSubscription = deferFunction(
  () => require("./services/delete-subscription.service").restoreSubscription,
) as typeof import("./services/delete-subscription.service").restoreSubscription;

export const checkSubscriptionHasPayments = deferFunction(
  () =>
    require("./services/delete-subscription.service")
      .checkSubscriptionHasPayments,
) as typeof import("./services/delete-subscription.service").checkSubscriptionHasPayments;

export const getExistingSubscriptionIdSet = deferFunction(
  () =>
    require("./services/delete-subscription.service")
      .getExistingSubscriptionIdSet,
) as typeof import("./services/delete-subscription.service").getExistingSubscriptionIdSet;

export type {
  BillingCycle,
  SaveSubscriptionInput,
  SubscriptionBurnRateSummary,
  SubscriptionFilter,
  SubscriptionItem,
  SubscriptionPreset,
  SubscriptionStatus,
} from "./types/subscription.types";
