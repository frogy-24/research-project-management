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

// ----- Year detail report (single year) -----

export interface YearDetailMonthly {
  month: string
  registrations: number
  approvedRegistrations: number
  disbursements: number
  paidDisbursements: number
  disbursedAmount: number
}

export interface YearDetailSummary {
  year: number
  totalRegistrations: number
  approvedRegistrations: number
  rejectedRegistrations: number
  totalDisbursements: number
  paidDisbursements: number
  pendingDisbursements: number
  totalDisbursedAmount: number
}

export interface YearDetailDisbursement {
  id: string
  amount: number
  disbursedAt: string
  voucherNo?: string | null
  voucherFileUrl?: string | null
  reason?: string | null
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED"
  createdAt: string
  paidAt?: string | null
  paymentNote?: string | null
  project: {
    id: string
    code?: string | null
    title: string
    status: string
    budgetApproved?: number | null
    leader: { id: string; name: string; email: string }
    callRound?: { id: string; name: string } | null
    projectType?: { id: string; name: string } | null
  }
  createdBy?: { id: string; name: string } | null
  approvedBy?: { id: string; name: string } | null
  paidBy?: { id: string; name: string } | null
}

export interface YearDetailRegistration {
  id: string
  title: string
  objective: string
  status: "PENDING" | "APPROVED" | "CANCELED" | "REJECTED"
  facultyStatus: "PENDING" | "APPROVED" | "REJECTED"
  instructorStatus: "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt: string
  user: { id: string; name: string; email: string }
  callRound?: { id: string; name: string } | null
  instructor?: { id: string; name: string } | null
  facultyReviewer?: { id: string; name: string } | null
}

export type YearDetailItem = YearDetailDisbursement | YearDetailRegistration

export interface YearDetailPagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface YearDetailResponse {
  year: number
  summary: YearDetailSummary
  monthly: YearDetailMonthly[]
  list: YearDetailItem[]
  pagination: YearDetailPagination
}

export type YearDetailTab = "registrations" | "disbursements"

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

  yearDetail: async (params: {
    year: number
    tab?: YearDetailTab
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    searchParams.set("year", String(params.year))
    if (params.tab) searchParams.set("tab", params.tab)
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit))
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset))
    const res = await api.get<{ success: boolean; data: YearDetailResponse }>(
      `/dean/reports/year-detail?${searchParams}`
    )
    return res.data
  },
}
