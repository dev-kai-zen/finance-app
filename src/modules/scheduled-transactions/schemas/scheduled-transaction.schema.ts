import { z } from "zod";

export const scheduledTransactionInputSchema = z
  .object({
    transactionType: z.enum(["income", "expense", "transfer"]),
    accountId: z.string().min(1, "Account is required."),
    pocketId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    toAccountId: z.string().nullable().optional(),
    toPocketId: z.string().nullable().optional(),
    amountCents: z.number().int().positive("Amount must be greater than zero."),
    name: z.string().max(100).nullable().optional(),
    note: z.string().max(200).nullable().optional(),
    frequency: z.enum(["once", "daily", "weekly", "monthly", "yearly"]),
    intervalCount: z.number().int().positive(),
    startsAt: z.date(),
    timeZone: z.string().min(1),
    endMode: z.enum(["never", "after_count", "on_date"]),
    maxOccurrences: z.number().int().positive().nullable().optional(),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    weekendPolicy: z.enum(["next_weekday", "previous_weekday", "skip"]),
    autoPost: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.transactionType === "transfer") {
      if (!value.toAccountId) {
        context.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Destination account is required.",
        });
      }
      if (
        value.accountId === value.toAccountId &&
        (value.pocketId ?? null) === (value.toPocketId ?? null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Choose a different destination account or pocket.",
        });
      }
    } else if (!value.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Category is required.",
      });
    }

    if (value.frequency === "once" && value.endMode !== "never") {
      context.addIssue({
        code: "custom",
        path: ["endMode"],
        message: "A one-time schedule does not need an ending rule.",
      });
    }
    if (value.endMode === "after_count" && !value.maxOccurrences) {
      context.addIssue({
        code: "custom",
        path: ["maxOccurrences"],
        message: "Number of occurrences is required.",
      });
    }
    if (value.endMode === "on_date" && !value.endsOn) {
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date is required.",
      });
    }
  });

export function scheduledTransactionErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Check the schedule details.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to save the scheduled transaction.";
}
