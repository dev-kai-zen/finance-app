import { z } from "zod";

export const fundGroupInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "A group name is required.")
    .max(100, "Use at most 100 characters for the group name."),
  accountIds: z.array(z.string().min(1)),
  pocketIds: z.array(z.string().min(1)),
}).superRefine((value, context) => {
  if (value.accountIds.length + value.pocketIds.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Select at least one account or pocket.",
    });
  }
  if (new Set(value.accountIds).size !== value.accountIds.length) {
    context.addIssue({
      code: "custom",
      message: "Each account can only be selected once.",
    });
  }
  if (new Set(value.pocketIds).size !== value.pocketIds.length) {
    context.addIssue({
      code: "custom",
      message: "Each pocket can only be selected once.",
    });
  }
});

export function normalizeFundGroupName(name: string): string {
  return name.trim().toLocaleLowerCase("en-US");
}

export function fundGroupErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Check the Fund Group details.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to save the Fund Group. Please try again.";
}
