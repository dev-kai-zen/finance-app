import { z } from "zod";

export const pocketInputSchema = z.object({
  accountId: z.string().min(1, "Choose an account."),
  name: z.string().trim().min(1, "A pocket name is required.").max(60, "Use at most 60 characters.")
});
