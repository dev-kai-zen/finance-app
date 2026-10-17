export interface ReminderSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm" (24-hour)
  monthlySummaryReminderEnabled: boolean;
  monthlySummaryReminderTime: string; // "HH:mm" (24-hour)
  creditCardsReminderEnabled: boolean;
  creditCardsReminderTime: string; // "HH:mm"
  creditCardsLeadDays: number[]; // e.g. [0, 1, 3] (0 = exact day, 1 = 1 day before...)
  creditLimitAlertsEnabled: boolean;
  scheduledTransactionsReminderEnabled: boolean;
  scheduledTransactionsReminderTime: string; // "HH:mm"
  scheduledTransactionsLeadDays: number[]; // e.g. [0, 1]
  budgetThresholdAlertsEnabled: boolean;
  savingsGoalAlertsEnabled: boolean;
}

export type NotificationChannelId = "reminders-channel" | "due-dates-channel";

export interface NotificationPayloadData {
  type:
    | "new-transaction"
    | "credit-cards"
    | "scheduled-transactions"
    | "reports"
    | "budgets"
    | "goals"
    | "test";
  url?: string;
  metadata?: Record<string, unknown>;
}
