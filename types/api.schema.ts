import { z } from "zod";

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
