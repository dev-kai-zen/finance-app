import { Platform } from "react-native";
import { formatCurrency } from "@/utils/currency";
import * as Notifications from "expo-notifications";
import {
  calculateCategoryBudgetStatus,
  checkBudgetExceeded,
} from "@/modules/budgets";
import { getCreditCardMonitoring } from "@/modules/credit-cards";
import { getGoalsWithProgress } from "@/modules/goals";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_IDENTIFIERS,
} from "../constants/reminder-settings.constants";
import { getReminderSettings } from "../repositories/reminder-settings.repository";
import { checkNotificationPermissions } from "./notification-permissions.service";
import type { NotificationPayloadData } from "../types/notification.types";

const deliveredAlertKeys = new Set<string>();

export async function checkAndNotifyBudgetThreshold(options: {
  categoryId: string;
  amountMinorUnits?: number;
  occurredAt?: Date;
}): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const settings = getReminderSettings();
    if (!settings.budgetThresholdAlertsEnabled) return;

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) return;

    const { categoryId, amountMinorUnits = 0, occurredAt = new Date() } = options;
    if (!categoryId) return;

    const result = checkBudgetExceeded({
      categoryId,
      amountMinorUnits,
      occurredAt,
    });

    if (!result.hasBudget || !result.isEnabled) {
      return;
    }

    const zeroLimit = result.effectiveBudgetCents === 0;
    if (zeroLimit && (!result.exceeds || !result.notifyOnExceeded)) return;
    const percent = result.effectiveBudgetCents > 0
      ? (result.newSpentCents / result.effectiveBudgetCents) * 100
      : 0;
    const yearMonth = `${occurredAt.getFullYear()}-${occurredAt.getMonth() + 1}`;
    const periodScope =
      result.periodKey ??
      (result.budgetId
        ? `${result.budgetId}-${yearMonth}`
        : `${categoryId}-${yearMonth}`);

    if (zeroLimit || percent >= 100) {
      const alertKey = `${NOTIFICATION_IDENTIFIERS.BUDGET_ALERT_PREFIX}100-${periodScope}`;
      if (deliveredAlertKeys.has(alertKey)) return;
      deliveredAlertKeys.add(alertKey);

      const data: NotificationPayloadData = {
        type: "budgets",
        url: "/budgets",
      };

      await Notifications.scheduleNotificationAsync({
        identifier: alertKey,
        content: {
          title: zeroLimit ? "Budget Exceeded" : "Budget Exceeded (100% Limit)",
          body: zeroLimit
            ? `You are ${formatCurrency(result.exceededByCents, result.budgetCurrencyCode, false)} over your zero-limit ${result.categoryName} budget for ${result.periodLabel}.`
            : `You have reached 100% of your ${result.categoryName} budget for ${result.periodLabel || "this month"}.`,
          sound: true,
          data: data as unknown as Record<string, unknown>,
          categoryIdentifier: "budget",
        },
        trigger: null, // deliver immediately
      });
    } else if (percent >= 80) {
      const alertKey = `${NOTIFICATION_IDENTIFIERS.BUDGET_ALERT_PREFIX}80-${periodScope}`;
      if (deliveredAlertKeys.has(alertKey)) return;
      deliveredAlertKeys.add(alertKey);

      const data: NotificationPayloadData = {
        type: "budgets",
        url: "/budgets",
      };

      await Notifications.scheduleNotificationAsync({
        identifier: alertKey,
        content: {
          title: "Budget Warning (80% Limit)",
          body: `You have reached ${Math.round(percent)}% of your ${result.categoryName} budget for ${result.periodLabel || "this month"}.`,
          sound: true,
          data: data as unknown as Record<string, unknown>,
          categoryIdentifier: "budget",
        },
        trigger: null, // deliver immediately
      });
    }
  } catch (error) {
    console.warn("[Notifications] Failed to check budget threshold:", error);
  }
}

export async function checkAndNotifyCreditLimit(
  targetAccountId?: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const settings = getReminderSettings();
    if (!settings.creditLimitAlertsEnabled) return;

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) return;

    const monitoring = getCreditCardMonitoring();
    for (const card of monitoring.cards) {
      if (targetAccountId && card.accountId !== targetAccountId) continue;

      const util = card.utilizationPercent;
      const data: NotificationPayloadData = {
        type: "credit-cards",
        url: "/credit-cards",
      };

      if (util >= 100) {
        const alertKey = `${NOTIFICATION_IDENTIFIERS.CC_LIMIT_PREFIX}100-${card.accountId}`;
        if (deliveredAlertKeys.has(alertKey)) continue;

        await Notifications.scheduleNotificationAsync({
          identifier: alertKey,
          content: {
            title: "Credit Limit Reached",
            body: `${card.accountName} is at ${Math.round(util)}% utilization, reaching its credit limit.`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "credit-limit",
          },
          trigger: null,
        });
        deliveredAlertKeys.add(alertKey);
      } else if (util >= 80) {
        const alertKey = `${NOTIFICATION_IDENTIFIERS.CC_LIMIT_PREFIX}80-${card.accountId}`;
        if (deliveredAlertKeys.has(alertKey)) continue;

        await Notifications.scheduleNotificationAsync({
          identifier: alertKey,
          content: {
            title: "High Credit Utilization Warning",
            body: `${card.accountName} is at ${Math.round(util)}% credit utilization. Consider making a payment.`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "credit-limit",
          },
          trigger: null,
        });
        deliveredAlertKeys.add(alertKey);
      }
    }
  } catch (error) {
    console.warn("[Notifications] Failed to check credit limit:", error);
  }
}

export async function checkAndNotifyGoalMilestones(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const settings = getReminderSettings();
    if (!settings.savingsGoalAlertsEnabled) return;

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) return;

    const { goals } = getGoalsWithProgress();
    for (const goal of goals) {
      const data: NotificationPayloadData = {
        type: "goals",
        url: "/goals",
      };

      if (goal.progressPercentage >= 100) {
        const alertKey = `${NOTIFICATION_IDENTIFIERS.GOAL_MILESTONE_PREFIX}100-${goal.id}`;
        if (deliveredAlertKeys.has(alertKey)) continue;
        deliveredAlertKeys.add(alertKey);

        await Notifications.scheduleNotificationAsync({
          identifier: alertKey,
          content: {
            title: "🎉 Goal Achieved!",
            body: `Congratulations! You've reached 100% of your savings goal: ${goal.name}!`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "goal",
          },
          trigger: null,
        });
      } else if (goal.progressPercentage >= 75) {
        const alertKey = `${NOTIFICATION_IDENTIFIERS.GOAL_MILESTONE_PREFIX}75-${goal.id}`;
        if (deliveredAlertKeys.has(alertKey)) continue;
        deliveredAlertKeys.add(alertKey);

        await Notifications.scheduleNotificationAsync({
          identifier: alertKey,
          content: {
            title: "🎯 Savings Goal: 75% Reached!",
            body: `Great job! You have saved 75% of your ${goal.name} goal!`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "goal",
          },
          trigger: null,
        });
      } else if (goal.progressPercentage >= 50) {
        const alertKey = `${NOTIFICATION_IDENTIFIERS.GOAL_MILESTONE_PREFIX}50-${goal.id}`;
        if (deliveredAlertKeys.has(alertKey)) continue;
        deliveredAlertKeys.add(alertKey);

        await Notifications.scheduleNotificationAsync({
          identifier: alertKey,
          content: {
            title: "🎯 Savings Goal: 50% Reached!",
            body: `Halfway there! You've reached 50% of your ${goal.name} goal!`,
            sound: true,
            data: data as unknown as Record<string, unknown>,
            categoryIdentifier: "goal",
          },
          trigger: null,
        });
      }
    }
  } catch (error) {
    console.warn("[Notifications] Failed to check goal milestones:", error);
  }
}
