import { api } from '@/lib/axios';
import type {
    CouncilWithRelations,
    AutoDivideCouncilsRequest,
    AutoDivideCouncilsResponse,
    CreateCouncilRequest,
    UpdateCouncilRequest,
    QuickAddCouncilsInput,
    QuickAddCouncilsResponse,
    ConfirmQuickAddCouncilsInput,
    ConfirmQuickAddCouncilsResponse,
} from '@/types/council.schema';

// Get councils for a call round
export async function getCouncilsByCallRound(callRoundId: string): Promise<CouncilWithRelations[]> {
    const response = await api.get(`/dean/call-rounds/${callRoundId}/councils`);
    return response.data;
}

// Auto-divide councils for a call round
export async function autoDivideCouncils(
    callRoundId: string,
    request: AutoDivideCouncilsRequest,
): Promise<AutoDivideCouncilsResponse> {
    const response = await api.post(`/dean/call-rounds/${callRoundId}/councils`, request);
    return response.data;
}

// Create council manually
export async function createCouncil(request: CreateCouncilRequest): Promise<CouncilWithRelations> {
    const response = await api.post('/dean/councils', request);
    return response.data;
}

// Update council info
export async function updateCouncil(councilId: string, request: UpdateCouncilRequest): Promise<CouncilWithRelations> {
    const response = await api.patch(`/dean/councils/${councilId}`, request);
    return response.data;
}

// Delete council
export async function deleteCouncil(councilId: string): Promise<{ success: true; id: string }> {
    const response = await api.delete(`/dean/councils/${councilId}`);
    return response.data;
}

export async function quickAddCouncilsWithAI(request: QuickAddCouncilsInput): Promise<QuickAddCouncilsResponse> {
    const response = await api.post('/dean/councils/quick-add', request);
    return response.data;
}

export async function confirmQuickAddCouncils(
    request: ConfirmQuickAddCouncilsInput,
): Promise<ConfirmQuickAddCouncilsResponse> {
    const response = await api.post('/dean/councils/quick-add/confirm', request);
    return response.data;
}
