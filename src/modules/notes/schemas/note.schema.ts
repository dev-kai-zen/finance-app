import { z } from "zod";

export const noteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Note title is required")
    .max(120, "Title cannot exceed 120 characters"),
  content: z.string().default(""),
  color: z.string().nullable().optional(),
  isPinned: z.boolean().default(false),
});

export type NoteInputSchema = z.infer<typeof noteInputSchema>;
