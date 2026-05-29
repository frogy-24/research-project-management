import { api } from "@/lib/axios"

export interface ReportJob {
  id: string
  deanId: string
  reportType: string
  templateUrl?: string
  parameters: Record<string, any>
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"
  progress: number
  resultUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export interface DeanReportStats {
  year: number
  totalProjects: number
  approvedRegistrations: number
  councils: number
  evaluations: number
  lecturers: number
  students: number
}

export const reportsApi = {
  create: async (data: { reportType: string; parameters?: Record<string, any>; templateUrl?: string }) => {
    const res = await api.post<{ success: boolean; data: ReportJob }>("/dean/reports", data)
    return res.data
  },
  

  list: async (params?: { status?: string; limit?: number; offset?: number; callRoundId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set("status", params.status)
    if (params?.callRoundId) searchParams.set("callRoundId", params.callRoundId)
    if (params?.limit) searchParams.set("limit", String(params.limit))
    if (params?.offset) searchParams.set("offset", String(params.offset))
    
    const res = await api.get<{ success: boolean; data: ReportJob[]; total: number }>(
      `/dean/reports?${searchParams}`
    )
    return res.data
  },

  getById: async (id: string) => {
    const res = await api.get<{ success: boolean; data: ReportJob }>(`/dean/reports/${id}`)
    return res.data
  },

  download: async (id: string) => {
    const res = await api.get(`/dean/reports/${id}/download`, { responseType: "blob" })
    return res
  },

  remove: async (id: string) => {
    const res = await api.delete<{ success: boolean }>(`/dean/reports?id=${encodeURIComponent(id)}`)
    return res.data
  },

  stats: async (year: number) => {
    const res = await api.get<{ success: boolean; data: DeanReportStats }>(`/dean/reports?mode=stats&year=${year}`)
    return res.data
  },
}
