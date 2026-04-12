import { api } from '@/lib/axios';
import { studentCouncilListSchema, type StudentCouncilItem } from '@/types/council.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const myCouncilsApi = {
    getAll: async (): Promise<StudentCouncilItem[]> => {
        const response = await api.get<ApiSuccess<StudentCouncilItem[]>>('/my-councils');
        return studentCouncilListSchema.parse(response.data.data);
    },
};
