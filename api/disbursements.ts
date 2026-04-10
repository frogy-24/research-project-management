// api/disbursements.ts
import { api } from '@/lib/axios';
import type {
  FundingDisbursement,
  FundingDisbursementWithRelations,
  CreateDisbursementInput,
  ApproveDisbursementInput,
  RejectDisbursementInput,
  UpdateDisbursementInput,
  DisbursementFilters,
} from '@/types/disbursement.schema';
import type { ApiResponse, PaginatedResponse } from '@/types/api.schema';

export const disbursementsApi = {
  /**
   * Lấy danh sách giải ngân với filters
   */
  async getDisbursements(
    filters?: DisbursementFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<FundingDisbursementWithRelations>> {
    const { data } = await api.get('/api/disbursements', {
      params: filters,
    });
    return data;
  },

  /**
   * Lấy chi tiết một giải ngân
   */
  async getDisbursementById(id: string): Promise<ApiResponse<FundingDisbursementWithRelations>> {
    const { data } = await api.get(`/api/disbursements/${id}`);
    return data;
  },

  /**
   * Lấy danh sách giải ngân theo projectId
   */
  async getDisbursementsByProject(projectId: string): Promise<ApiResponse<FundingDisbursementWithRelations[]>> {
    const { data } = await api.get(`/api/projects/${projectId}/disbursements`);
    return data;
  },

  /**
   * Tạo mới giải ngân (Dean/Admin)
   */
  async createDisbursement(input: CreateDisbursementInput): Promise<ApiResponse<FundingDisbursement>> {
    const { data } = await api.post('/api/disbursements', input);
    return data;
  },

  /**
   * Cập nhật giải ngân (chỉ PENDING)
   */
  async updateDisbursement(
    id: string,
    input: UpdateDisbursementInput
  ): Promise<ApiResponse<FundingDisbursement>> {
    const { data } = await api.patch(`/api/disbursements/${id}`, input);
    return data;
  },

  /**
   * Phê duyệt giải ngân (Admin only)
   */
  async approveDisbursement(
    id: string,
    input?: ApproveDisbursementInput
  ): Promise<ApiResponse<FundingDisbursement>> {
    const { data } = await api.post(`/api/disbursements/${id}/approve`, input);
    return data;
  },

  /**
   * Từ chối giải ngân (Admin only)
   */
  async rejectDisbursement(
    id: string,
    input: RejectDisbursementInput
  ): Promise<ApiResponse<FundingDisbursement>> {
    const { data } = await api.post(`/api/disbursements/${id}/reject`, input);
    return data;
  },

  /**
   * Xóa giải ngân (chỉ PENDING)
   */
  async deleteDisbursement(id: string): Promise<ApiResponse<void>> {
    const { data } = await api.delete(`/api/disbursements/${id}`);
    return data;
  },

  /**
   * Lấy thống kê giải ngân
   */
  async getDisbursementStats(filters?: {
    callRoundId?: string;
    projectId?: string;
  }): Promise<ApiResponse<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    approvedAmount: number;
  }>> {
    const { data } = await api.get('/api/disbursements/stats', {
      params: filters,
    });
    return data;
  },

  /**
   * Lấy danh sách giải ngân chờ phê duyệt (Admin)
   */
  async getPendingDisbursements(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FundingDisbursementWithRelations>> {
    const { data } = await api.get('/api/disbursements/pending', {
      params,
    });
    return data;
  },

  /**
   * Kiểm tra quyền tạo giải ngân cho project
   */
  async canCreateDisbursement(projectId: string): Promise<ApiResponse<{
    canCreate: boolean;
    reason?: string;
    remainingBudget?: number;
  }>> {
    const { data } = await api.get(`/api/projects/${projectId}/can-create-disbursement`);
    return data;
  },
};
