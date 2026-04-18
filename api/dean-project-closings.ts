import { api } from '@/lib/axios';
import {
    deanProjectClosingListSchema,
    deanReviewProjectClosingSchema,
    projectClosingSubmissionSchema,
    type DeanProjectClosingItem,
    type DeanReviewProjectClosingInput,
    type ProjectClosingStatus,
    type ProjectClosingSubmission,
} from '@/types/project-closing.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export type DeanProjectClosingFilters = {
    search?: string;
    callRoundId?: string;
    status?: ProjectClosingStatus | 'all';
};

const buildDeanProjectClosingQuery = (filters?: DeanProjectClosingFilters): string => {
    if (!filters) {
        return '';
    }

    const params = new URLSearchParams();

    if (filters.search && filters.search.trim().length > 0) {
        params.set('search', filters.search.trim());
    }

    if (filters.callRoundId && filters.callRoundId.trim().length > 0) {
        params.set('callRoundId', filters.callRoundId.trim());
    }

    if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
    }

    const query = params.toString();
    return query ? `?${query}` : '';
};

export const deanProjectClosingsApi = {
    getAll: async (filters?: DeanProjectClosingFilters): Promise<DeanProjectClosingItem[]> => {
        const query = buildDeanProjectClosingQuery(filters);
        const response = await api.get<ApiSuccess<DeanProjectClosingItem[]>>(`/dean/project-closings${query}`);
        return deanProjectClosingListSchema.parse(response.data.data);
    },

    review: async (payload: DeanReviewProjectClosingInput): Promise<ProjectClosingSubmission> => {
        const validated = deanReviewProjectClosingSchema.parse(payload);
        const response = await api.patch<ApiSuccess<ProjectClosingSubmission>>('/dean/project-closings', validated);
        return projectClosingSubmissionSchema.parse(response.data.data);
    },
};
