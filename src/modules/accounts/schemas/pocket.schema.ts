import { z } from "zod";
import { parseMaintainingAmount } from "@/modules/accounts/utils/account-input";

export const pocketInputSchema = z.object({
  accountId: z.string().min(1, "Choose an account."),
  name: z.string().trim().min(1, "A pocket name is required.").max(60, "Use at most 60 characters."),
  targetAmount: z.string().superRefine((value, context) => {
    if (!value.trim()) return;
    try {
      parseMaintainingAmount(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid target amount.",
      });
    }
  }),
});
