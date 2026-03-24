import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface DeanLecturer {
    id: string;
    name: string;
    email: string;
    code?: string;
    departmentId?: string;
    majorId?: string | null;
    major?: {
        id: string;
        code: string;
        name: string;
    } | null;
}

export interface DeanLecturersResponse {
    data: DeanLecturer[];
}

async function fetchDeanLecturers(): Promise<DeanLecturersResponse> {
    const response = await api.get('/dean/lecturers-list');
    return response.data;
}

export function useDeanLecturers() {
    return useQuery({
        queryKey: ['dean-lecturers'],
        queryFn: fetchDeanLecturers,
    });
}
