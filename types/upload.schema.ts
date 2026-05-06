import { z } from 'zod';

export const uploadResponseSchema = z.object({
  url: z.string().min(1),
  filePath: z.string().min(1)
});

export const deleteFileRequestSchema = z.object({
  filePath: z.string().min(1)
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type DeleteFileRequest = z.infer<typeof deleteFileRequestSchema>;
