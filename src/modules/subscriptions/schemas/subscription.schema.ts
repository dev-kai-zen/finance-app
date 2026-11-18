import { z } from "zod";

export const subscriptionFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  amountMinorUnits: z.number().int().min(0, "Amount must be zero or positive"),
  currencyCode: z.string().min(1).default("PHP"),
  billingCycle: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "semi_annual",
    "yearly",
  ]),
  billingCycleInterval: z.number().int().min(1).default(1),
  status: z.enum(["active", "paused", "cancelled", "trial"]).default("active"),
  firstBillingDate: z.date(),
  nextRenewalDate: z.date().optional(),
  trialEndsAt: z.date().nullable().optional(),
  accountId: z.string().nullable().optional(),
  pocketId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  endsOn: z.date().nullable().optional(),
  autoPost: z.boolean().default(false),
  reminderLeadDays: z.array(z.number().int().min(0).max(30)).default([1, 3]),
  cancellationUrl: z.string().trim().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;
