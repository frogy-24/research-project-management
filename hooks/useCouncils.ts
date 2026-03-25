import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCouncilsByCallRound,
  autoDivideCouncils,
  createCouncil,
  updateCouncil,
  deleteCouncil,
  quickAddCouncilsWithAI,
  confirmQuickAddCouncils,
} from '@/api/councils';
import type {
  CouncilWithRelations,
  AutoDivideCouncilsRequest,
  CreateCouncilRequest,
  UpdateCouncilRequest,
  QuickAddCouncilsInput,
  QuickAddCouncilsResponse,
  ConfirmQuickAddCouncilsInput,
  ConfirmQuickAddCouncilsResponse,
} from '@/types/council.schema';

// Query key factory
export const councilKeys = {
  all: ['councils'] as const,
  byCallRound: (callRoundId: string) =>
    [...councilKeys.all, 'callRound', callRoundId] as const,
};

// Hook to get councils for a call round
export function useCouncils(callRoundId: string | undefined) {
  return useQuery<CouncilWithRelations[]>({
    queryKey: councilKeys.byCallRound(callRoundId || ''),
    queryFn: () => {
      if (!callRoundId) throw new Error('Call round ID is required');
      return getCouncilsByCallRound(callRoundId);
    },
    enabled: !!callRoundId,
  });
}

// Hook to auto-divide councils
export function useAutoDivideCouncils(callRoundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AutoDivideCouncilsRequest) =>
      autoDivideCouncils(callRoundId, request),
    onSuccess: () => {
      // Invalidate councils query to refetch
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(callRoundId),
      });
    },
  });
}

// Hook to create council manually
export function useCreateCouncil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCouncilRequest) => createCouncil(request),
    onSuccess: (data) => {
      // Invalidate councils query to refetch
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(data.callRoundId),
      });
    },
  });
}

export function useUpdateCouncil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ councilId, payload }: { councilId: string; payload: UpdateCouncilRequest }) =>
      updateCouncil(councilId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(data.callRoundId),
      });
    },
  });
}

export function useDeleteCouncil(callRoundId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (councilId: string) => deleteCouncil(councilId),
    onSuccess: () => {
      if (!callRoundId) return;
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(callRoundId),
      });
    },
  });
}

export function useQuickAddCouncilsAI(callRoundId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<QuickAddCouncilsResponse, Error, QuickAddCouncilsInput>({
    mutationFn: (request) => quickAddCouncilsWithAI(request),
    onSuccess: () => {
      if (!callRoundId) return;
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(callRoundId),
      });
    },
  });
}

export function useConfirmQuickAddCouncilsAI(callRoundId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<ConfirmQuickAddCouncilsResponse, Error, ConfirmQuickAddCouncilsInput>({
    mutationFn: (request) => confirmQuickAddCouncils(request),
    onSuccess: () => {
      if (!callRoundId) return;
      queryClient.invalidateQueries({
        queryKey: councilKeys.byCallRound(callRoundId),
      });
    },
  });
}
