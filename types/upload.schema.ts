import { z } from 'zod';

export const uploadResponseSchema = z.object({
  url: z.string().min(1),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
