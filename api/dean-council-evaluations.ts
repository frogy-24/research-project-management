import { api } from '@/lib/axios';
import {
    deanCouncilEvaluationListSchema,
    type DeanCouncilEvaluationList,
} from '@/types/dean-council-evaluation.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const deanCouncilEvaluationsApi = {
    getAll: async (callRoundId?: string): Promise<DeanCouncilEvaluationList> => {
        const query = callRoundId ? `?callRoundId=${encodeURIComponent(callRoundId)}` : '';
        const response = await api.get<ApiSuccess<DeanCouncilEvaluationList>>(`/dean/council-evaluations${query}`);
        return deanCouncilEvaluationListSchema.parse(response.data.data);
    },
};
