import { api } from '@/lib/axios';
import {
    callRoundSchema,
    callRoundAttachmentSchema,
    createCallRoundSchema,
    updateCallRoundSchema,
    type CallRound,
    type CallRoundAttachment,
    type CreateCallRoundInput,
    type UpdateCallRoundInput,
} from '@/types/call-round.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

const callRoundListSchema = callRoundSchema.array();
const callRoundAttachmentListSchema = callRoundAttachmentSchema.array();

export const callRoundsApi = {
    getAll: async (): Promise<CallRound[]> => {
        const response = await api.get<ApiSuccess<CallRound[]>>('/call-rounds');
        return callRoundListSchema.parse(response.data.data);
    },

    create: async (payload: CreateCallRoundInput): Promise<CallRound> => {
        const validated = createCallRoundSchema.parse(payload);
        const response = await api.post<ApiSuccess<CallRound>>('/call-rounds', validated);
        return callRoundSchema.parse(response.data.data);
    },

    update: async (payload: UpdateCallRoundInput & { id: string }): Promise<CallRound> => {
        const validated = updateCallRoundSchema.parse(payload);
        const response = await api.patch<ApiSuccess<CallRound>>(`/call-rounds/${payload.id}`, validated);
        return callRoundSchema.parse(response.data.data);
    },

    delete: async (id: string): Promise<{ id: string }> => {
        const response = await api.delete<ApiSuccess<{ id: string }>>(`/call-rounds/${id}`);
        return response.data.data;
    },

    // File attachments
    getAttachments: async (callRoundId: string): Promise<CallRoundAttachment[]> => {
        const response = await api.get<ApiSuccess<CallRoundAttachment[]>>(`/call-rounds/${callRoundId}/attachments`);
        return callRoundAttachmentListSchema.parse(response.data.data);
    },

    uploadAttachment: async (callRoundId: string, formData: FormData): Promise<CallRoundAttachment> => {
        const response = await api.post<ApiSuccess<CallRoundAttachment>>(
            `/call-rounds/${callRoundId}/attachments`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            },
        );
        return callRoundAttachmentSchema.parse(response.data.data);
    },

    deleteAttachment: async (callRoundId: string, attachmentId: string): Promise<{ id: string }> => {
        const response = await api.delete<ApiSuccess<{ id: string }>>(
            `/call-rounds/${callRoundId}/attachments/${attachmentId}`,
        );
        return response.data.data;
    },

    // Reset approval status back to PENDING_APPROVAL
    resetApproval: async (id: string): Promise<CallRound> => {
        const response = await api.patch<ApiSuccess<CallRound>>(`/call-rounds/${id}`, {
            approvalStatus: 'PENDING_APPROVAL',
        });
        return callRoundSchema.parse(response.data.data);
    },
};
