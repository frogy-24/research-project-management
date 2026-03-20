import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectOperationsApi } from "@/api/project-operations";
import type { CreateProgressReportInput, ReviewProgressReportInput } from "@/types/progress-report.schema";
import type {
  CreateExtensionRequestInput,
  ReviewExtensionRequestInput,
} from "@/types/extension-request.schema";
import type { CreateCouncilEvaluationInput } from "@/types/council-evaluation.schema";
import type { CreateDisbursementInput } from "@/types/disbursement.schema";

const operationKeys = {
  progressReports: (projectId: string) => ["project-operations", projectId, "progress-reports"] as const,
  extensionRequests: (projectId: string) => ["project-operations", projectId, "extension-requests"] as const,
  councilEvaluations: (projectId: string) => ["project-operations", projectId, "council-evaluations"] as const,
  disbursements: (projectId: string) => ["project-operations", projectId, "disbursements"] as const,
};

export const useProgressReports = (projectId: string) => {
  return useQuery({
    queryKey: operationKeys.progressReports(projectId),
    queryFn: () => projectOperationsApi.listProgressReports(projectId),
    enabled: Boolean(projectId),
  });
};

export const useCreateProgressReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: CreateProgressReportInput }) =>
      projectOperationsApi.createProgressReport(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: operationKeys.progressReports(variables.projectId) });
    },
  });
};

export const useReviewProgressReport = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: ReviewProgressReportInput }) =>
      projectOperationsApi.reviewProgressReport(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationKeys.progressReports(projectId) });
    },
  });
};

export const useExtensionRequests = (projectId: string) => {
  return useQuery({
    queryKey: operationKeys.extensionRequests(projectId),
    queryFn: () => projectOperationsApi.listExtensionRequests(projectId),
    enabled: Boolean(projectId),
  });
};

export const useCreateExtensionRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: CreateExtensionRequestInput }) =>
      projectOperationsApi.createExtensionRequest(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: operationKeys.extensionRequests(variables.projectId) });
    },
  });
};

export const useReviewExtensionRequest = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, payload }: { requestId: string; payload: ReviewExtensionRequestInput }) =>
      projectOperationsApi.reviewExtensionRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationKeys.extensionRequests(projectId) });
    },
  });
};

export const useCouncilEvaluations = (projectId: string) => {
  return useQuery({
    queryKey: operationKeys.councilEvaluations(projectId),
    queryFn: () => projectOperationsApi.listCouncilEvaluations(projectId),
    enabled: Boolean(projectId),
  });
};

export const useCreateCouncilEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: CreateCouncilEvaluationInput }) =>
      projectOperationsApi.createCouncilEvaluation(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: operationKeys.councilEvaluations(variables.projectId) });
    },
  });
};

export const useDisbursements = (projectId: string) => {
  return useQuery({
    queryKey: operationKeys.disbursements(projectId),
    queryFn: () => projectOperationsApi.listDisbursements(projectId),
    enabled: Boolean(projectId),
  });
};

export const useCreateDisbursement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: CreateDisbursementInput }) =>
      projectOperationsApi.createDisbursement(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: operationKeys.disbursements(variables.projectId) });
    },
  });
};
