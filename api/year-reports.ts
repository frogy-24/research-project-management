// api/year-reports.ts
import { api } from "@/lib/axios"

export interface YearRegistration {
  id: string
  year: number
  title: string
  ownerName?: string
  status?: string
  result?: string
  budget?: number
}

export interface YearDisbursement {
  id: string
  year: number
  projectTitle?: string
  callRoundName?: string
  amount?: number
  status?: string
  date?: string
}

export interface YearReportDetail {
  year: number
  totalRegistrations: number
  approvedRegistrations: number
  totalDisbursed: number
  disbursementCount: number
  registrations: YearRegistration[]
  disbursements: YearDisbursement[]
}

export const yearReportApi = {
  async getYearDetail(year: number): Promise<YearReportDetail> {
    const { data } = await api.get(`/reports/year-detail`, { params: { year } })
    return data
  },
}
