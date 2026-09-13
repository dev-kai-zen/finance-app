import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(50, "Category name cannot exceed 50 characters"),
  type: z.enum(["income", "expense"]),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export type CategoryInputSchema = z.infer<typeof categoryInputSchema>;
