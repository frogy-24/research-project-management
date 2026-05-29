import { api } from "@/lib/axios";
import {
  createProgressReportSchema,
  progressReportSchema,
  type CreateProgressReportInput,
  type ProgressReport,
  updateProgressReportSchema,
  type UpdateProgressReportInput,
  reviewProgressReportSchema,
  type ReviewProgressReportInput,
} from "@/types/progress-report.schema";
import {
  createExtensionRequestSchema,
  extensionRequestSchema,
  reviewExtensionRequestSchema,
  type CreateExtensionRequestInput,
  type ExtensionRequest,
  type ReviewExtensionRequestInput,
} from "@/types/extension-request.schema";
import {
  councilEvaluationSchema,
  createCouncilEvaluationSchema,
  type CouncilEvaluation,
  type CreateCouncilEvaluationInput,
} from "@/types/council-evaluation.schema";
import {
  createDisbursementSchema,
  disbursementSchema,
  type CreateDisbursementInput,
  type FundingDisbursement,
} from "@/types/disbursement.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

export const projectOperationsApi = {
  listProgressReports: async (projectId: string): Promise<ProgressReport[]> => {
    const response = await api.get<ApiSuccess<ProgressReport[]>>(
      `/projects/${projectId}/progress-reports`
    );
    return progressReportSchema.array().parse(response.data.data);
  },

  createProgressReport: async (
    projectId: string,
    payload: CreateProgressReportInput
  ): Promise<ProgressReport> => {
    const validated = createProgressReportSchema.parse(payload);
    const response = await api.post<ApiSuccess<ProgressReport>>(
      `/projects/${projectId}/progress-reports`,
      validated
    );
    return progressReportSchema.parse(response.data.data);
  },

  updateProgressReport: async (
    reportId: string,
    payload: UpdateProgressReportInput
  ): Promise<ProgressReport> => {
    const validated = updateProgressReportSchema.parse(payload);
    const response = await api.patch<ApiSuccess<ProgressReport>>(
      `/progress-reports/${reportId}/update`,
      validated
    );
    return progressReportSchema.parse(response.data.data);
  },

  reviewProgressReport: async (
    reportId: string,
    payload: ReviewProgressReportInput
  ): Promise<ProgressReport> => {
    const validated = reviewProgressReportSchema.parse(payload);
    const response = await api.patch<ApiSuccess<ProgressReport>>(
      `/progress-reports/${reportId}`,
      validated
    );
    return progressReportSchema.parse(response.data.data);
  },

  listExtensionRequests: async (projectId: string): Promise<ExtensionRequest[]> => {
    const response = await api.get<ApiSuccess<ExtensionRequest[]>>(
      `/projects/${projectId}/extension-requests`
    );
    return extensionRequestSchema.array().parse(response.data.data);
  },

  createExtensionRequest: async (
    projectId: string,
    payload: CreateExtensionRequestInput
  ): Promise<ExtensionRequest> => {
    const validated = createExtensionRequestSchema.parse(payload);
    const response = await api.post<ApiSuccess<ExtensionRequest>>(
      `/projects/${projectId}/extension-requests`,
      validated
    );
    return extensionRequestSchema.parse(response.data.data);
  },

  reviewExtensionRequest: async (
    requestId: string,
    payload: ReviewExtensionRequestInput
  ): Promise<ExtensionRequest> => {
    const validated = reviewExtensionRequestSchema.parse(payload);
    const response = await api.patch<ApiSuccess<ExtensionRequest>>(
      `/extension-requests/${requestId}`,
      validated
    );
    return extensionRequestSchema.parse(response.data.data);
  },

  listCouncilEvaluations: async (projectId: string): Promise<CouncilEvaluation[]> => {
    const response = await api.get<ApiSuccess<CouncilEvaluation[]>>(
      `/projects/${projectId}/council-evaluations`
    );
    return councilEvaluationSchema.array().parse(response.data.data);
  },

  createCouncilEvaluation: async (
    projectId: string,
    payload: CreateCouncilEvaluationInput
  ): Promise<CouncilEvaluation> => {
    const validated = createCouncilEvaluationSchema.parse(payload);
    const response = await api.post<ApiSuccess<CouncilEvaluation>>(
      `/projects/${projectId}/council-evaluations`,
      validated
    );
    return councilEvaluationSchema.parse(response.data.data);
  },

  listDisbursements: async (projectId: string): Promise<FundingDisbursement[]> => {
    const response = await api.get<ApiSuccess<FundingDisbursement[]>>(
      `/projects/${projectId}/disbursements`
    );
    return disbursementSchema.array().parse(response.data.data);
  },

  createDisbursement: async (
    projectId: string,
    payload: CreateDisbursementInput
  ): Promise<FundingDisbursement> => {
    const validated = createDisbursementSchema.parse(payload);
    const response = await api.post<ApiSuccess<FundingDisbursement>>(
      `/projects/${projectId}/disbursements`,
      validated
    );
    return disbursementSchema.parse(response.data.data);
  },
};
