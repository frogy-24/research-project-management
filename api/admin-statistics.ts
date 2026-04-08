import { api } from "@/lib/axios";

export interface StatisticsData {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalRegistrations: number;
    totalProgressReports: number;
    totalDepartments: number;
    totalMajors: number;
    totalClasses: number;
    totalCallRounds: number;
    activeCallRounds: number;
    totalCouncils: number;
  };
  users: {
    byRole: Record<string, number>;
    byGender: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
    byDepartment: Record<string, number>;
  };
  projects: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
    byDepartment: Record<string, number>;
    budget: {
      totalRequested: number;
      totalApproved: number;
      avgRequested: number;
      avgApproved: number;
    };
  };
  registrations: {
    byStatus: Record<string, number>;
    byCallRound: Record<string, number>;
  };
  progressReports: {
    total: number;
    byWeek: Array<{ week: number; count: number }>;
    avgScore: number;
    overdueTotal: number;
  };
  funding: {
    totalDisbursed: number;
    totalTransactions: number;
    byMonth: Array<{ month: string; amount: number; count: number }>;
  };
  councils: {
    evaluationsByDecision: Record<string, number>;
  };
  extensions: {
    byStatus: Record<string, number>;
  };
}

export const statisticsApi = {
  getAll: async (): Promise<StatisticsData> => {
    const { data } = await api.get("/admin/statistics");
    return data;
  },
};
