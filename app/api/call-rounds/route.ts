import { NextResponse } from "next/server";
import { createCallRoundSchema } from "@/types/call-round.schema";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";

export async function GET(req: Request) {
  try {
    const actorRole = getActorRole(req);
    const actorUserId = getActorUserId(req);

    const url = new URL(req.url);
    const approvalStatus = url.searchParams.get("approvalStatus");

    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (approvalStatus) {
      whereClause.approvalStatus = approvalStatus;
    }

    // DEAN: CHỈ thấy các call rounds do chính mình tạo
    // ADMIN/LEADER: thấy tất cả
    if (actorRole === "DEAN" && actorUserId) {
      whereClause.createdById = actorUserId;
    }

    const callRounds = await prisma.callRound.findMany({
      where: whereClause,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        majors: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classes: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: callRounds });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch call rounds",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    // ADMIN, LEADER, hoặc DEAN đều có thể tạo call rounds
    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền tạo đợt đăng ký." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createCallRoundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { departmentIds, majorIds, classIds, ...callRoundData } = parsed.data;

    // DEAN tạo -> PENDING_APPROVAL, ADMIN/LEADER tạo -> APPROVED
    const approvalStatus = actorRole === "DEAN" ? "PENDING_APPROVAL" : "APPROVED";

    // Nếu DEAN tạo, tự động gắn department của DEAN
    let finalDepartmentIds = departmentIds || [];
    if (actorRole === "DEAN" && actorUserId) {
      const deanUser = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: { departmentId: true },
      });
      if (deanUser?.departmentId && finalDepartmentIds.length === 0) {
        finalDepartmentIds = [deanUser.departmentId];
      }
    }

    const callRound = await prisma.callRound.create({
      data: {
        ...callRoundData,
        isLocked: callRoundData.isLocked || false,
        templateId: callRoundData.templateId || null,
        approvalStatus,
        createdById: actorUserId || null,
        createdByRole: actorRole,
        departments: {
          connect: finalDepartmentIds.map((id) => ({ id })),
        },
        majors: {
          connect: majorIds?.map((id) => ({ id })) || [],
        },
        classes: {
          connect: classIds?.map((id) => ({ id })) || [],
        },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        majors: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classes: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: callRound }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create call round",
      },
      { status: 500 }
    );
  }
}
