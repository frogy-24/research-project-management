// hooks/useDisbursements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disbursementsApi } from '@/api/disbursements';
import type {
  DisbursementFilters,
  CreateDisbursementInput,
  UpdateDisbursementInput,
  ApproveDisbursementInput,
  RejectDisbursementInput,
  PayDisbursementInput,
} from '@/types/disbursement.schema';
import { toast } from 'sonner';

export function useDisbursements(filters?: DisbursementFilters & { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['disbursements', filters],
    queryFn: () => disbursementsApi.getDisbursements(filters),
  });
}

export function useDisbursement(id: string) {
  return useQuery({
    queryKey: ['disbursements', id],
    queryFn: () => disbursementsApi.getDisbursementById(id),
    enabled: !!id,
  });
}

export function usePendingDisbursements(page?: number, limit?: number) {
  return useQuery({
    queryKey: ['disbursements', 'pending', page, limit],
    queryFn: () => disbursementsApi.getPendingDisbursements({ page, limit }),
  });
}

export function useCreateDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDisbursementInput) => disbursementsApi.createDisbursement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      toast.success('Tạo yêu cầu giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo yêu cầu giải ngân');
    },
  });
}

export function useUpdateDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDisbursementInput }) =>
      disbursementsApi.updateDisbursement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements', variables.id] });
      toast.success('Cập nhật giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật giải ngân');
    },
  });
}

export function useDeleteDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disbursementsApi.deleteDisbursement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      toast.success('Xóa giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa giải ngân');
    },
  });
}

export function useApproveDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveDisbursementInput }) =>
      disbursementsApi.approveDisbursement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements', variables.id] });
      toast.success('Phê duyệt giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi phê duyệt giải ngân');
    },
  });
}

export function useRejectDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectDisbursementInput }) =>
      disbursementsApi.rejectDisbursement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements', variables.id] });
      toast.success('Từ chối giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi từ chối giải ngân');
    },
  });
}

export function usePayDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayDisbursementInput }) =>
      disbursementsApi.payDisbursement(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements', variables.id] });
      toast.success('Xác nhận thanh toán giải ngân thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận thanh toán giải ngân');
    },
  });
}
