// hooks/useDisbursements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disbursementsApi } from '@/api/disbursements';
import type {
  CreateDisbursementInput,
  ApproveDisbursementInput,
  RejectDisbursementInput,
  UpdateDisbursementInput,
  DisbursementFilters,
} from '@/types/disbursement.schema';
import { toast } from 'sonner';

// Query Keys
export const disbursementKeys = {
  all: ['disbursements'] as const,
  lists: () => [...disbursementKeys.all, 'list'] as const,
  list: (filters?: DisbursementFilters) => [...disbursementKeys.lists(), filters] as const,
  details: () => [...disbursementKeys.all, 'detail'] as const,
  detail: (id: string) => [...disbursementKeys.details(), id] as const,
  byProject: (projectId: string) => [...disbursementKeys.all, 'project', projectId] as const,
  pending: () => [...disbursementKeys.all, 'pending'] as const,
  stats: (filters?: { callRoundId?: string; projectId?: string }) => 
    [...disbursementKeys.all, 'stats', filters] as const,
  canCreate: (projectId: string) => [...disbursementKeys.all, 'can-create', projectId] as const,
};

/**
 * Hook lấy danh sách giải ngân
 */
export function useDisbursements(
  filters?: DisbursementFilters & { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: disbursementKeys.list(filters),
    queryFn: () => disbursementsApi.getDisbursements(filters),
  });
}

/**
 * Hook lấy chi tiết giải ngân
 */
export function useDisbursement(id: string) {
  return useQuery({
    queryKey: disbursementKeys.detail(id),
    queryFn: () => disbursementsApi.getDisbursementById(id),
    enabled: !!id,
  });
}

/**
 * Hook lấy giải ngân theo project
 */
export function useDisbursementsByProject(projectId: string) {
  return useQuery({
    queryKey: disbursementKeys.byProject(projectId),
    queryFn: () => disbursementsApi.getDisbursementsByProject(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook lấy danh sách giải ngân chờ phê duyệt
 */
export function usePendingDisbursements(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: disbursementKeys.pending(),
    queryFn: () => disbursementsApi.getPendingDisbursements(params),
  });
}

/**
 * Hook lấy thống kê giải ngân
 */
export function useDisbursementStats(filters?: { callRoundId?: string; projectId?: string }) {
  return useQuery({
    queryKey: disbursementKeys.stats(filters),
    queryFn: () => disbursementsApi.getDisbursementStats(filters),
  });
}

/**
 * Hook kiểm tra quyền tạo giải ngân
 */
export function useCanCreateDisbursement(projectId: string) {
  return useQuery({
    queryKey: disbursementKeys.canCreate(projectId),
    queryFn: () => disbursementsApi.canCreateDisbursement(projectId),
    enabled: !!projectId,
  });
}

/**
 * Hook tạo mới giải ngân
 */
export function useCreateDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDisbursementInput) => 
      disbursementsApi.createDisbursement(input),
    onSuccess: (response, variables) => {
      toast.success('Tạo yêu cầu giải ngân thành công');
      // Invalidate các queries liên quan
      queryClient.invalidateQueries({ queryKey: disbursementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.byProject(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.pending() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.stats() });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Tạo giải ngân thất bại');
    },
  });
}

/**
 * Hook cập nhật giải ngân
 */
export function useUpdateDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDisbursementInput }) =>
      disbursementsApi.updateDisbursement(id, input),
    onSuccess: (response, variables) => {
      toast.success('Cập nhật giải ngân thành công');
      queryClient.invalidateQueries({ queryKey: disbursementKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.pending() });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Cập nhật giải ngân thất bại');
    },
  });
}

/**
 * Hook phê duyệt giải ngân
 */
export function useApproveDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ApproveDisbursementInput }) =>
      disbursementsApi.approveDisbursement(id, input),
    onSuccess: (response, variables) => {
      toast.success('Phê duyệt giải ngân thành công');
      queryClient.invalidateQueries({ queryKey: disbursementKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.pending() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.stats() });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Phê duyệt giải ngân thất bại');
    },
  });
}

/**
 * Hook từ chối giải ngân
 */
export function useRejectDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RejectDisbursementInput }) =>
      disbursementsApi.rejectDisbursement(id, input),
    onSuccess: (response, variables) => {
      toast.success('Từ chối giải ngân thành công');
      queryClient.invalidateQueries({ queryKey: disbursementKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.pending() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.stats() });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Từ chối giải ngân thất bại');
    },
  });
}

/**
 * Hook xóa giải ngân
 */
export function useDeleteDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disbursementsApi.deleteDisbursement(id),
    onSuccess: (response, id) => {
      toast.success('Xóa giải ngân thành công');
      queryClient.invalidateQueries({ queryKey: disbursementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.pending() });
      queryClient.invalidateQueries({ queryKey: disbursementKeys.stats() });
      queryClient.removeQueries({ queryKey: disbursementKeys.detail(id) });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Xóa giải ngân thất bại');
    },
  });
}
