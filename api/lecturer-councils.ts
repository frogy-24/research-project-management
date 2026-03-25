import { api } from '@/lib/axios';
import { lecturerCouncilListSchema, type LecturerCouncilItem } from '@/types/council.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const lecturerCouncilsApi = {
    getAll: async (): Promise<LecturerCouncilItem[]> => {
        const response = await api.get<ApiSuccess<LecturerCouncilItem[]>>('/lecturer/councils');
        return lecturerCouncilListSchema.parse(response.data.data);
    },
};
