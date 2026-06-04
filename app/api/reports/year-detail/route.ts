import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, DisbursementStatus, RegistrationStatus } from "@/prisma/generated/prisma";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

function buildYearWindow(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function readYear(date: Date | null | undefined, fallback: Date): number {
  return (date ?? fallback).getUTCFullYear();
}

export async function GET(request: NextRequest) {
  try {
    const userId = getActorUserId(request);
    const role = getActorRole(request);

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "DEAN", "LEADER"].includes(role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const parsed = querySchema.safeParse({
      year: request.nextUrl.searchParams.get("year") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const year = parsed.data.year;
    const window = buildYearWindow(year);

    const registrationWhere: Prisma.ProjectRegistrationWhereInput = {
      OR: [
        { callRound: { registrationStartDate: window } },
        { callRoundId: null, createdAt: window },
      ],
    };

    const disbursementWhere: Prisma.FundingDisbursementWhereInput = {
      OR: [
        { project: { callRound: { registrationStartDate: window } } },
        { project: { callRoundId: null, createdAt: window } },
      ],
    };

    const [registrations, disbursements, totals] = await Promise.all([
      prisma.projectRegistration.findMany({
        where: registrationWhere,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          callRound: { select: { name: true, registrationStartDate: true } },
        },
      }),
      prisma.fundingDisbursement.findMany({
        where: disbursementWhere,
        orderBy: { disbursedAt: "desc" },
        include: {
          project: {
            select: {
              title: true,
              callRound: { select: { name: true, registrationStartDate: true } },
              createdAt: true,
            },
          },
        },
      }),
      prisma.fundingDisbursement.aggregate({
        where: {
          ...disbursementWhere,
          status: DisbursementStatus.PAID,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const approvedRegistrations = registrations.filter(
      (r) => r.status === RegistrationStatus.APPROVED
    ).length;

    const totalRegistrations = registrations.length;
    const totalDisbursed = Number(totals._sum.amount ?? 0);
    const disbursementCount = totals._count._all;

    const registrationRows = registrations.map((r) => {
      const fallback = r.createdAt;
      const registrationYear = readYear(r.callRound?.registrationStartDate, fallback);

      return {
        id: r.id,
        year: registrationYear,
        title: r.title,
        ownerName: r.user?.name ?? undefined,
        status: r.status,
        result: undefined,
        budget: undefined,
      };
    });

    const disbursementRows = disbursements.map((d) => {
      const fallback = d.project?.createdAt ?? d.createdAt;
      const dYear = readYear(d.project?.callRound?.registrationStartDate, fallback);

      return {
        id: d.id,
        year: dYear,
        projectTitle: d.project?.title ?? undefined,
        callRoundName: d.project?.callRound?.name ?? undefined,
        amount: Number(d.amount),
        status: d.status,
        date: (d.paidAt ?? d.disbursedAt).toISOString(),
      };
    });

    return NextResponse.json({
      year,
      totalRegistrations,
      approvedRegistrations,
      totalDisbursed,
      disbursementCount,
      registrations: registrationRows,
      disbursements: disbursementRows,
    });
  } catch (error) {
    console.error("[GET /api/reports/year-detail]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
