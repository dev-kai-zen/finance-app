export type SubscriptionStatus = "active" | "paused" | "cancelled" | "trial";

export type BillingCycle =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "yearly";

export interface SubscriptionItem {
  id: string;
  name: string;
  status: SubscriptionStatus;
  amountMinorUnits: number;
  currencyCode: string;
  billingCycle: BillingCycle;
  billingCycleInterval: number;
  firstBillingDate: Date;
  nextRenewalDate: Date;
  trialEndsAt: Date | null;
  cancelledAt: Date | null;
  accountId: string | null;
  accountName?: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  merchantId: string | null;
  merchantName?: string | null;
  scheduleId: string | null;
  autoPost: boolean;
  reminderLeadDays: number[];
  cancellationUrl: string | null;
  notes: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  // Computed helpers
  monthlyBurnRateMinorUnits: number;
  daysUntilRenewal: number;
  isOverdue: boolean;
}

export interface SubscriptionBurnRateSummary {
  totalMonthlyBurnRateMinorUnits: number;
  totalYearlyProjectedMinorUnits: number;
  activeCount: number;
  trialCount: number;
  pausedCount: number;
  upcomingCount7Days: number;
  currencyCode: string;
}

export interface SaveSubscriptionInput {
  id?: string;
  name: string;
  status: SubscriptionStatus;
  amountMinorUnits: number;
  currencyCode?: string;
  billingCycle: BillingCycle;
  billingCycleInterval?: number;
  firstBillingDate: Date;
  nextRenewalDate?: Date;
  trialEndsAt?: Date | null;
  accountId?: string | null;
  categoryId?: string | null;
  merchantId?: string | null;
  autoPost?: boolean;
  reminderLeadDays?: number[];
  cancellationUrl?: string | null;
  notes?: string | null;
  color?: string | null;
  icon?: string | null;
}

export type SubscriptionFilter =
  | "all"
  | "active"
  | "trial"
  | "paused"
  | "cancelled";

export interface SubscriptionPreset {
  id: string;
  name: string;
  defaultAmountMinorUnits: number;
  defaultBillingCycle: BillingCycle;
  categoryName: string;
  icon: string;
  color: string;
  cancellationUrl?: string;
}
