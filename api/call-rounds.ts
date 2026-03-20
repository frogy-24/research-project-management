import { api } from "@/lib/axios";
import {
  callRoundSchema,
  createCallRoundSchema,
  updateCallRoundSchema,
  type CallRound,
  type CreateCallRoundInput,
  type UpdateCallRoundInput,
} from "@/types/call-round.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

const callRoundListSchema = callRoundSchema.array();

export const callRoundsApi = {
  getAll: async (): Promise<CallRound[]> => {
    const response = await api.get<ApiSuccess<CallRound[]>>("/call-rounds");
    return callRoundListSchema.parse(response.data.data);
  },

  create: async (payload: CreateCallRoundInput): Promise<CallRound> => {
    const validated = createCallRoundSchema.parse(payload);
    const response = await api.post<ApiSuccess<CallRound>>("/call-rounds", validated);
    return callRoundSchema.parse(response.data.data);
  },

  update: async (payload: UpdateCallRoundInput & { id: string }): Promise<CallRound> => {
    const validated = updateCallRoundSchema.parse(payload);
    const response = await api.patch<ApiSuccess<CallRound>>(
      `/call-rounds/${payload.id}`,
      validated
    );
    return callRoundSchema.parse(response.data.data);
  },

  delete: async (id: string): Promise<{ id: string }> => {
    const response = await api.delete<ApiSuccess<{ id: string }>>(`/call-rounds/${id}`);
    return response.data.data;
  },
};
