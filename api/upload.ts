import { api } from '@/lib/axios';
import { uploadResponseSchema, type UploadResponse } from '@/types/upload.schema';

export const uploadApi = {
  /**
   * Upload file with optional context for organizing files
   * @param file - File to upload
   * @param context - Optional context (callRoundId, callRoundName) for organizing files
   */
  file: async (
    file: File,
    context?: { callRoundId?: string; callRoundName?: string }
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (context?.callRoundId) {
      formData.append('callRoundId', context.callRoundId);
    }
    if (context?.callRoundName) {
      formData.append('callRoundName', context.callRoundName);
    }

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return uploadResponseSchema.parse(response.data);
  },

  /**
   * Delete file from server
   * @param url - File URL to delete (e.g., /uploads/call-round/dot-1/123456-file.pdf)
   */
  deleteFile: async (url: string): Promise<void> => {
    await api.delete('/upload', {
      data: { url },
    });
  },
};
