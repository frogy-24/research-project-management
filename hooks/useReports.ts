"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { reportsApi, ReportJob } from "@/api/reports"

export const useReportJobs = (params?: { status?: string }) => {
  return useQuery({
    queryKey: ["report-jobs", params],
    queryFn: () => reportsApi.list(params),
    refetchInterval: (query) => {
      // Auto-refresh if any job is processing
      const jobs = query.state.data?.data || []
      const hasProcessing = jobs.some((j: ReportJob) => j.status === "QUEUED" || j.status === "PROCESSING")
      return hasProcessing ? 3000 : false
    },
  })
}

export const useCreateReportJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-jobs"] })
    },
  })
}

export const useDeleteReportJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reportsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-jobs"] })
    },
  })
}

export const useReportJob = (id: string) => {
  return useQuery({
    queryKey: ["report-job", id],
    queryFn: () => reportsApi.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const job = query.state.data?.data
      if (job?.status === "QUEUED" || job?.status === "PROCESSING") {
        return 2000
      }
      return false
    },
  })
}
