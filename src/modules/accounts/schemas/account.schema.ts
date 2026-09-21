import { z } from "zod";
import { ACCOUNT_COLOR_KEYS, ACCOUNT_ICON_KEYS } from "@/modules/accounts/constants/account-appearance.constants";
import {
  parseMaintainingAmount,
  parseBillingDay,
  parseCreditLimit,
  parseOpeningAmount,
  parseOpeningDate,
} from "@/modules/accounts/utils/account-input";

export const accountGroupSchema = z.enum(["asset", "liability"]);
const name = z.string().trim().min(1, "A name is required.").max(100, "Use at most 100 characters.");
const checkedString = (parse: (value: string) => unknown) => z.string().superRefine((value, ctx) => {
  try { parse(value); } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid value." });
  }
});
const creditCardDetailsInputSchema = z.object({
  creditLimit: checkedString(parseCreditLimit),
  statementDay: checkedString((value) => parseBillingDay(value, "Statement day")),
  paymentDueDay: checkedString((value) =>
    parseBillingDay(value, "Payment due day"),
  ),
});

export const accountInputSchema = z.object({
  name,
  note: z
    .string()
    .max(1000, "Use at most 1000 characters for the note.")
    .optional(),
  iconKey: z.string().optional().nullable(),
  accountTypeId: z.string().min(1, "Choose an account type."),
  openingAmount: checkedString(parseOpeningAmount),
  openingDate: checkedString(parseOpeningDate),
  hideFromSelection: z.boolean().default(false),
  hideFromReports: z.boolean().default(false),
  pocketEnabled: z.boolean().default(false),
  maintainingAmount: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value.trim() === "") return;
      try {
        parseMaintainingAmount(value);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Invalid value.",
        });
      }
    }),
  creditCardDetails: creditCardDetailsInputSchema.optional().nullable(),
});
export const accountTypeInputSchema = z.object({
  name,
  accountGroup: accountGroupSchema,
  iconKey: z.string().min(1, "Choose an icon."),
  color: z.string().optional().nullable(),
  hexColorsId: z.string().optional().nullable(),
});
export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountTypeInput = z.infer<typeof accountTypeInputSchema>;
export function accountErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check your input.";
  return error instanceof Error ? error.message : "Unable to save changes. Please try again.";
}
