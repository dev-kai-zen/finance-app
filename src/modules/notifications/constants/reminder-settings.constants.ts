import type { ReminderSettings } from "../types/notification.types";

export const REMINDER_SETTINGS_KEYS = {
  DAILY_ENABLED: "reminder.daily.enabled",
  DAILY_TIME: "reminder.daily.time",
  MONTHLY_SUMMARY_ENABLED: "reminder.monthly_summary.enabled",
  MONTHLY_SUMMARY_TIME: "reminder.monthly_summary.time",
  CREDIT_CARDS_ENABLED: "reminder.credit_cards.enabled",
  CREDIT_CARDS_TIME: "reminder.credit_cards.time",
  CREDIT_CARDS_LEAD_DAYS: "reminder.credit_cards.lead_days",
  CREDIT_LIMIT_ENABLED: "reminder.credit_limit.enabled",
  SCHEDULED_TRANSACTIONS_ENABLED: "reminder.scheduled_transactions.enabled",
  SCHEDULED_TRANSACTIONS_TIME: "reminder.scheduled_transactions.time",
  SCHEDULED_TRANSACTIONS_LEAD_DAYS: "reminder.scheduled_transactions.lead_days",
  BUDGET_THRESHOLD_ENABLED: "reminder.budget_threshold.enabled",
  SAVINGS_GOALS_ENABLED: "reminder.savings_goals.enabled",
} as const;

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  dailyReminderEnabled: false,
  dailyReminderTime: "20:00",
  monthlySummaryReminderEnabled: false,
  monthlySummaryReminderTime: "10:00",
  creditCardsReminderEnabled: false,
  creditCardsReminderTime: "09:00",
  creditCardsLeadDays: [0, 1, 3],
  creditLimitAlertsEnabled: false,
  scheduledTransactionsReminderEnabled: false,
  scheduledTransactionsReminderTime: "09:00",
  scheduledTransactionsLeadDays: [0, 1],
  budgetThresholdAlertsEnabled: false,
  savingsGoalAlertsEnabled: false,
};

export const AVAILABLE_LEAD_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export const NOTIFICATION_CHANNELS = {
  REMINDERS: {
    id: "reminders-channel",
    name: "Daily Reminders",
    description: "Notifications reminding you to log daily spending and review reports",
  },
  DUE_DATES: {
    id: "due-dates-channel",
    name: "Bills & Alerts",
    description: "Notifications for upcoming bills, scheduled transactions, and financial thresholds",
  },
} as const;

export const NOTIFICATION_IDENTIFIERS = {
  DAILY_REMINDER: "daily-expense-reminder",
  MONTHLY_SUMMARY: "monthly-financial-summary",
  CC_PREFIX: "reminder-cc-",
  CC_LIMIT_PREFIX: "reminder-cc-limit-",
  SCHED_TX_PREFIX: "reminder-sched-",
  GOAL_DEADLINE_PREFIX: "reminder-goal-deadline-",
  GOAL_MILESTONE_PREFIX: "reminder-goal-milestone-",
  BUDGET_ALERT_PREFIX: "reminder-budget-alert-",
} as const;
