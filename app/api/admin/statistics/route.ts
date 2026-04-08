import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalUsers,
      usersByRole,
      usersByGender,
      usersByMonth,
      totalProjects,
      projectsByStatus,
      projectsByType,
      projectsByMonth,
      projectsByDepartment,
      budgetStats,
      totalRegistrations,
      registrationsByStatus,
      registrationsByCallRound,
      totalProgressReports,
      progressReportsByWeek,
      progressReportScores,
      overdueReports,
      totalFunding,
      fundingByMonth,
      fundingByProject,
      totalDepartments,
      totalMajors,
      totalClasses,
      totalCallRounds,
      activeCallRounds,
      totalCouncils,
      evaluationsByDecision,
      extensionRequestsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["gender"],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["createdAt"],
        _count: true,
      }),
      prisma.project.count(),
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["projectTypeId"],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["createdAt"],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["leaderId"],
        _count: true,
      }),
      prisma.project.aggregate({
        _sum: { budgetRequested: true, budgetApproved: true },
        _avg: { budgetRequested: true, budgetApproved: true },
      }),
      prisma.projectRegistration.count(),
      prisma.projectRegistration.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.projectRegistration.groupBy({
        by: ["callRoundId"],
        _count: true,
      }),
      prisma.progressReport.count(),
      prisma.progressReport.groupBy({
        by: ["week"],
        _count: true,
        orderBy: { week: "asc" },
      }),
      prisma.progressReport.aggregate({
        _avg: { mentorScore: true },
        _count: true,
      }),
      prisma.project.aggregate({
        _sum: { overdueReportCount: true },
      }),
      prisma.fundingDisbursement.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.fundingDisbursement.groupBy({
        by: ["disbursedAt"],
        _sum: { amount: true },
        _count: true,
      }),
      prisma.fundingDisbursement.groupBy({
        by: ["projectId"],
        _sum: { amount: true },
      }),
      prisma.department.count(),
      prisma.major.count(),
      prisma.class.count(),
      prisma.callRound.count(),
      prisma.callRound.count({ where: { isActive: true } }),
      prisma.council.count(),
      prisma.councilEvaluation.groupBy({
        by: ["decision"],
        _count: true,
      }),
      prisma.extensionRequest.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const projectTypes = await prisma.projectType.findMany({
      select: { id: true, name: true },
    });

    const callRounds = await prisma.callRound.findMany({
      select: { id: true, name: true },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });

    const departmentUserCounts: Record<string, number> = {};
    for (const dept of departments) {
      const count = await prisma.user.count({
        where: { departmentId: dept.id },
      });
      departmentUserCounts[dept.name] = count;
    }

    const departmentProjectCounts: Record<string, number> = {};
    for (const dept of departments) {
      const users = await prisma.user.findMany({
        where: { departmentId: dept.id },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      const count = await prisma.project.count({
        where: { leaderId: { in: userIds } },
      });
      departmentProjectCounts[dept.name] = count;
    }

    const projectTypeMap = Object.fromEntries(
      projectTypes.map((pt) => [pt.id, pt.name])
    );
    const callRoundMap = Object.fromEntries(
      callRounds.map((cr) => [cr.id, cr.name])
    );

    const monthlyUsers = aggregateByMonth(usersByMonth);
    const monthlyProjects = aggregateByMonth(projectsByMonth);
    const monthlyFunding = aggregateFundingByMonth(fundingByMonth);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalProjects,
        totalRegistrations,
        totalProgressReports,
        totalDepartments,
        totalMajors,
        totalClasses,
        totalCallRounds,
        activeCallRounds,
        totalCouncils,
      },
      users: {
        byRole: Object.fromEntries(
          usersByRole.map((r) => [r.role, r._count])
        ),
        byGender: Object.fromEntries(
          usersByGender.map((g) => [g.gender ?? "OTHER", g._count])
        ),
        byMonth: monthlyUsers,
        byDepartment: departmentUserCounts,
      },
      projects: {
        byStatus: Object.fromEntries(
          projectsByStatus.map((s) => [s.status, s._count])
        ),
        byType: Object.fromEntries(
          projectsByType.map((t) => [
            projectTypeMap[t.projectTypeId ?? ""] ?? "Unknown",
            t._count,
          ])
        ),
        byMonth: monthlyProjects,
        byDepartment: departmentProjectCounts,
        budget: {
          totalRequested: toNumber(budgetStats._sum.budgetRequested),
          totalApproved: toNumber(budgetStats._sum.budgetApproved),
          avgRequested: toNumber(budgetStats._avg.budgetRequested),
          avgApproved: toNumber(budgetStats._avg.budgetApproved),
        },
      },
      registrations: {
        byStatus: Object.fromEntries(
          registrationsByStatus.map((s) => [s.status, s._count])
        ),
        byCallRound: Object.fromEntries(
          registrationsByCallRound.map((r) => [
            callRoundMap[r.callRoundId ?? ""] ?? "Unknown",
            r._count,
          ])
        ),
      },
      progressReports: {
        total: totalProgressReports,
        byWeek: progressReportsByWeek
          .filter((w) => w.week !== null)
          .map((w) => ({ week: w.week!, count: w._count })),
        avgScore: toNumber(progressReportScores._avg.mentorScore),
        overdueTotal: toNumber(overdueReports._sum.overdueReportCount) || 0,
      },
      funding: {
        totalDisbursed: toNumber(totalFunding._sum.amount),
        totalTransactions: totalFunding._count,
        byMonth: monthlyFunding,
      },
      councils: {
        evaluationsByDecision: Object.fromEntries(
          evaluationsByDecision.map((d) => [d.decision, d._count])
        ),
      },
      extensions: {
        byStatus: Object.fromEntries(
          extensionRequestsByStatus.map((s) => [s.status, s._count])
        ),
      },
    });
  } catch (error) {
    console.error("Statistics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

function aggregateByMonth(
  items: Array<{ createdAt: Date; _count: number }>
): Array<{ month: string; count: number }> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + item._count);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

function aggregateFundingByMonth(
  items: Array<{ disbursedAt: Date; _sum: { amount: unknown }; _count: number }>
): Array<{ month: string; amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  items.forEach((item) => {
    const key = `${item.disbursedAt.getFullYear()}-${String(item.disbursedAt.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key) || { amount: 0, count: 0 };
    existing.amount += toNumber(item._sum.amount) || 0;
    existing.count += item._count;
    map.set(key, existing);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, amount: data.amount, count: data.count }));
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}
