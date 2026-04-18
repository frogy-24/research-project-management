import { api } from '@/lib/axios';
import {
    lecturerProjectClosingListSchema,
    projectClosingSubmissionSchema,
    submitProjectClosingSchema,
    type LecturerProjectClosingItem,
    type ProjectClosingSubmission,
    type SubmitProjectClosingInput,
} from '@/types/project-closing.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const lecturerProjectClosingsApi = {
    getAll: async (): Promise<LecturerProjectClosingItem[]> => {
        const response = await api.get<ApiSuccess<LecturerProjectClosingItem[]>>('/lecturer/project-closings');
        return lecturerProjectClosingListSchema.parse(response.data.data);
    },

    submit: async (payload: SubmitProjectClosingInput): Promise<ProjectClosingSubmission> => {
        const validated = submitProjectClosingSchema.parse(payload);
        const response = await api.post<ApiSuccess<ProjectClosingSubmission>>('/lecturer/project-closings', validated);
        return projectClosingSubmissionSchema.parse(response.data.data);
    },
};
