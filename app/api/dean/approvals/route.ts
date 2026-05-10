import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";


export async function GET(req: Request) {
  try {
    const userId = getActorUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deanId = userId;
    const dean = await prisma.user.findUnique({
      where: { id: deanId }
    });

    if (!dean || dean.role !== "DEAN") {
      return NextResponse.json({ error: "Forbidden: Only Dean can access" }, { status: 403 });
    }

    // Parse pagination params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Parse filter params
    const search = url.searchParams.get("search") || "";
    const facultyStatus = url.searchParams.get("facultyStatus") || "";
    const callRoundId = url.searchParams.get("callRoundId") || "";
    const instructorStatus = "ACCEPTED";

    // Build the query based on dean's department and filters
    const whereClause: any = {};
    
    // Filter by dean's department
    if (dean.departmentId) {
      whereClause.user = { departmentId: dean.departmentId };
    }

    // Search filter (title or user name)
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } }
      ];
      // Merge with department filter
      if (dean.departmentId) {
        whereClause.AND = [
          { user: { departmentId: dean.departmentId } },
          {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } }
            ]
          }
        ];
        delete whereClause.user;
        delete whereClause.OR;
      }
    }

    // Faculty status filter
    if (facultyStatus && ["PENDING", "APPROVED", "REJECTED"].includes(facultyStatus)) {
      whereClause.facultyStatus = facultyStatus;
    }

    // Call round filter
    if (callRoundId) {
      whereClause.callRoundId = callRoundId;
    }

    // Chỉ hiển thị đề tài đã được giảng viên/người hướng dẫn chấp nhận
    whereClause.instructorStatus = instructorStatus;

    // Get total count for pagination
    const total = await prisma.projectRegistration.count({ where: whereClause });

    const registrations = await prisma.projectRegistration.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            code: true,
            department: true,
            departmentId: true,
            class: {
              select: {
                name: true,
                code: true,
              },
            },
            major: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        instructor: {
          select: {
            name: true,
            email: true,
            code: true,
            department: true,
            departmentRef: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        callRound: {
          select: {
            name: true,
            projectLockDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);

    if (!userId || role !== "DEAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { filters, criteria } = body ?? {};

    if (!filters || !criteria) {
      return NextResponse.json(
        { error: "Missing filters or criteria" },
        { status: 400 }
      );
    }

    const job = await prisma.autoApprovalJob.create({
      data: {
        deanId: userId,
        filters,
        criteria,
        status: "QUEUED",
        progress: 0,
      },
    });

    const botBaseUrl = process.env.AI_API_URL || process.env.BOT_API_URL || "http://localhost:8000";
    const response = await fetch(`${botBaseUrl}/api/dean/evaluate-with-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters,
        criteria,
        jobId: job.id,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      await prisma.autoApprovalJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: `Publish failed: ${detail}`,
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        { error: "Publish evaluate-with-ai failed", details: detail },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
