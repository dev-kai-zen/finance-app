import { z } from "zod";

export const goalInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Goal title is required.")
    .max(80, "Goal title cannot exceed 80 characters."),
  note: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters.")
    .optional()
    .nullable(),
  targetAmountMinorUnits: z
    .number()
    .int()
    .positive("Target amount must be greater than zero."),
  currencyCode: z.string().min(1).default("PHP"),
  accountId: z.string().nullable().optional(),
  pocketId: z.string().nullable().optional(),
  accountIds: z.array(z.string()).default([]),
  pocketIds: z.array(z.string()).default([]),
  targetDate: z.date().nullable().optional(),
  iconKey: z.string().nullable().optional(),
  hexColorsId: z.string().nullable().optional(),
  status: z.enum(["in_progress", "completed", "paused"]).default("in_progress"),
  sortOrder: z.number().int().default(0),
});

export type ValidatedGoalInput = z.infer<typeof goalInputSchema>;

export function goalErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Invalid goal details.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred while saving the goal.";
}
