export interface ReminderSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm" (24-hour)
  creditCardsReminderEnabled: boolean;
  creditCardsReminderTime: string; // "HH:mm"
  creditCardsLeadDays: number[]; // e.g. [0, 1, 3] (0 = exact day, 1 = 1 day before...)
  scheduledTransactionsReminderEnabled: boolean;
  scheduledTransactionsReminderTime: string; // "HH:mm"
  scheduledTransactionsLeadDays: number[]; // e.g. [0, 1]
}

export type NotificationChannelId = "reminders-channel" | "due-dates-channel";

export interface NotificationPayloadData {
  type: "new-transaction" | "credit-cards" | "scheduled-transactions" | "test";
  url?: string;
  metadata?: Record<string, unknown>;
}
