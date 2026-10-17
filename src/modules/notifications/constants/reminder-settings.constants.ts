import type { ReminderSettings } from "../types/notification.types";

export const REMINDER_SETTINGS_KEYS = {
  DAILY_ENABLED: "reminder.daily.enabled",
  DAILY_TIME: "reminder.daily.time",
  CREDIT_CARDS_ENABLED: "reminder.credit_cards.enabled",
  CREDIT_CARDS_TIME: "reminder.credit_cards.time",
  CREDIT_CARDS_LEAD_DAYS: "reminder.credit_cards.lead_days",
  SCHEDULED_TRANSACTIONS_ENABLED: "reminder.scheduled_transactions.enabled",
  SCHEDULED_TRANSACTIONS_TIME: "reminder.scheduled_transactions.time",
  SCHEDULED_TRANSACTIONS_LEAD_DAYS: "reminder.scheduled_transactions.lead_days",
} as const;

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  dailyReminderEnabled: false,
  dailyReminderTime: "20:00",
  creditCardsReminderEnabled: false,
  creditCardsReminderTime: "09:00",
  creditCardsLeadDays: [0, 1, 3],
  scheduledTransactionsReminderEnabled: false,
  scheduledTransactionsReminderTime: "09:00",
  scheduledTransactionsLeadDays: [0, 1],
};

export const AVAILABLE_LEAD_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export const NOTIFICATION_CHANNELS = {
  REMINDERS: {
    id: "reminders-channel",
    name: "Daily Reminders",
    description: "Notifications reminding you to log daily spending and receipts",
  },
  DUE_DATES: {
    id: "due-dates-channel",
    name: "Bills & Due Dates",
    description: "Notifications for upcoming credit card bills and scheduled transactions",
  },
} as const;

export const NOTIFICATION_IDENTIFIERS = {
  DAILY_REMINDER: "daily-expense-reminder",
  CC_PREFIX: "reminder-cc-",
  SCHED_TX_PREFIX: "reminder-sched-",
} as const;
