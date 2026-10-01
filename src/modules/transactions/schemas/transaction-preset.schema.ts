import { z } from "zod";

export const transactionPresetInputSchema = z
  .object({
    transactionName: z
      .string()
      .trim()
      .min(1, "Enter a transaction name before saving a Quick Preset.")
      .max(100, "Use at most 100 characters for the transaction name."),
    type: z.enum(["income", "expense", "transfer"]),
    accountId: z.string().min(1, "Choose an account."),
    pocketId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    toAccountId: z.string().nullable().optional(),
    toPocketId: z.string().nullable().optional(),
    amountCents: z.number().int().nullable().optional(),
    note: z
      .string()
      .trim()
      .max(1000, "Use at most 1000 characters for the note.")
      .nullable()
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.amountCents === 0) {
      context.addIssue({
        code: "custom",
        path: ["amountCents"],
        message: "A preset amount cannot be zero.",
      });
    }

    if (value.type === "transfer") {
      if (!value.toAccountId) {
        context.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Choose a destination account.",
        });
      }
      if ((value.amountCents ?? 1) <= 0) {
        context.addIssue({
          code: "custom",
          path: ["amountCents"],
          message: "A transfer preset amount must be greater than zero.",
        });
      }
      if (
        value.toAccountId &&
        value.accountId === value.toAccountId &&
        (value.pocketId ?? null) === (value.toPocketId ?? null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Choose different source and destination locations.",
        });
      }
      return;
    }

    if (!value.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Choose a category.",
      });
    }
  });

export function transactionPresetErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Check the Quick Preset details.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to save the Quick Preset.";
}
