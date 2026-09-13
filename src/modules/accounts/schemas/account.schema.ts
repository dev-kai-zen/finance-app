import { z } from "zod";
import { ACCOUNT_COLOR_KEYS, ACCOUNT_ICON_KEYS } from "@/modules/accounts/constants/account-appearance.constants";
import { parseOpeningAmount, parseOpeningDate } from "@/modules/accounts/utils/account-input";

export const accountGroupSchema = z.enum(["asset", "liability"]);
const name = z.string().trim().min(1, "A name is required.").max(100, "Use at most 100 characters.");
const checkedString = (parse: (value: string) => unknown) => z.string().superRefine((value, ctx) => {
  try { parse(value); } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid value." });
  }
});
export const accountInputSchema = z.object({
  name,
  accountTypeId: z.string().min(1, "Choose an account type."),
  openingAmount: checkedString(parseOpeningAmount),
  openingDate: checkedString(parseOpeningDate),
});
export const accountTypeInputSchema = z.object({
  name,
  accountGroup: accountGroupSchema,
  iconKey: z.enum(ACCOUNT_ICON_KEYS),
  color: z.enum(ACCOUNT_COLOR_KEYS),
});
export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountTypeInput = z.infer<typeof accountTypeInputSchema>;
export function accountErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check your input.";
  return error instanceof Error ? error.message : "Unable to save changes. Please try again.";
}
