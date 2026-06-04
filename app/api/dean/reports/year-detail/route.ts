import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getActorRole, getActorUserId } from "@/lib/project-permissions"

type Tab = "registrations" | "disbursements"

export async function GET(req: NextRequest) {
  const userId = getActorUserId(req)
  const role = getActorRole(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (role !== "DEAN" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only Dean or Admin can access" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get("year")
    const year = yearParam ? Number(yearParam) : new Date().getFullYear()
    if (Number.isNaN(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }
    const tab = (searchParams.get("tab") || "registrations") as Tab
    if (tab !== "registrations" && tab !== "disbursements") {
      return NextResponse.json({ error: "Invalid tab" }, { status: 400 })
    }
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0)

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))

    // Raw rows for monthly aggregation (avoid N+1)
    const [registrations, disbursements] = await Promise.all([
      prisma.projectRegistration.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { createdAt: true, status: true },
      }),
      prisma.fundingDisbursement.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { createdAt: true, status: true, amount: true },
      }),
    ])

    // Summary
    const totalRegistrations = registrations.length
    const approvedRegistrations = registrations.filter((r) => r.status === "APPROVED").length
    const rejectedRegistrations = registrations.filter((r) => r.status === "REJECTED").length
    const totalDisbursements = disbursements.length
    const paidDisbursements = disbursements.filter((d) => d.status === "PAID").length
    const pendingDisbursements = disbursements.filter((d) => d.status === "PENDING" || d.status === "APPROVED").length
    const totalDisbursedAmount = disbursements
      .filter((d) => d.status === "PAID")
      .reduce((sum, d) => sum + Number(d.amount), 0)

    // Monthly aggregation (12 buckets)
    const monthLabels = [
      "T01", "T02", "T03", "T04", "T05", "T06",
      "T07", "T08", "T09", "T10", "T11", "T12",
    ]
    const monthly = monthLabels.map((label, idx) => {
      const m = idx + 1
      const regs = registrations.filter((r) => r.createdAt.getUTCMonth() + 1 === m)
      const disb = disbursements.filter((d) => d.createdAt.getUTCMonth() + 1 === m)
      const paidDisb = disb.filter((d) => d.status === "PAID")
      return {
        month: label,
        registrations: regs.length,
        approvedRegistrations: regs.filter((r) => r.status === "APPROVED").length,
        disbursements: disb.length,
        paidDisbursements: paidDisb.length,
        disbursedAmount: paidDisb.reduce((sum, d) => sum + Number(d.amount), 0),
      }
    })

    // Tab list (paginated)
    let list: unknown[] = []
    let total = 0
    if (tab === "disbursements") {
      const [rows, count] = await Promise.all([
        prisma.fundingDisbursement.findMany({
          where: { createdAt: { gte: start, lt: end } },
          orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
          take: limit,
          skip: offset,
          include: {
            project: {
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
                budgetApproved: true,
                leader: { select: { id: true, name: true, email: true } },
                callRound: { select: { id: true, name: true } },
                projectType: { select: { id: true, name: true } },
              },
            },
            createdBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            paidBy: { select: { id: true, name: true } },
          },
        }),
        prisma.fundingDisbursement.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ])
      list = rows
      total = count
    } else {
      const [rows, count] = await Promise.all([
        prisma.projectRegistration.findMany({
          where: { createdAt: { gte: start, lt: end } },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            user: { select: { id: true, name: true, email: true } },
            callRound: { select: { id: true, name: true } },
            instructor: { select: { id: true, name: true } },
            facultyReviewer: { select: { id: true, name: true } },
          },
        }),
        prisma.projectRegistration.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ])
      list = rows
      total = count
    }

    return NextResponse.json({
      success: true,
      data: {
        year,
        summary: {
          year,
          totalRegistrations,
          approvedRegistrations,
          rejectedRegistrations,
          totalDisbursements,
          paidDisbursements,
          pendingDisbursements,
          totalDisbursedAmount,
        },
        monthly,
        list,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + list.length < total,
        },
      },
    })
  } catch (error) {
    console.error("Year detail report error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
