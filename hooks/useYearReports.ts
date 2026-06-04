// hooks/useYearReports.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { reportsApi } from "@/api/reports"

export const useYearDetail = (params: {
  year: number
  tab?: "registrations" | "disbursements"
  limit?: number
  offset?: number
}) => {
  return useQuery({
    queryKey: ["year-detail", params],
    queryFn: () => reportsApi.yearDetail(params),
    enabled: !!params.year,
  })
}
