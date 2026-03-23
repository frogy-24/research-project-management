import { api } from '@/lib/axios';
import type {
  CouncilWithRelations,
  AutoDivideCouncilsRequest,
  AutoDivideCouncilsResponse,
  CreateCouncilRequest,
} from '@/types/council.schema';

// Get councils for a call round
export async function getCouncilsByCallRound(
  callRoundId: string
): Promise<CouncilWithRelations[]> {
  const response = await api.get(`/dean/call-rounds/${callRoundId}/councils`);
  return response.data;
}

// Auto-divide councils for a call round
export async function autoDivideCouncils(
  callRoundId: string,
  request: AutoDivideCouncilsRequest
): Promise<AutoDivideCouncilsResponse> {
  const response = await api.post(
    `/dean/call-rounds/${callRoundId}/councils`,
    request
  );
  return response.data;
}

// Create council manually
export async function createCouncil(
  request: CreateCouncilRequest
): Promise<CouncilWithRelations> {
  const response = await api.post('/dean/councils', request);
  return response.data;
}
