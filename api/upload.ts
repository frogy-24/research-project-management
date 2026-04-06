import { api } from '@/lib/axios';
import { uploadResponseSchema, type UploadResponse } from '@/types/upload.schema';

export const uploadApi = {
  file: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return uploadResponseSchema.parse(response.data);
  },
};
