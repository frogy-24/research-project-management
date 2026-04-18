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
    // STUDENT: CHỈ thấy call rounds của khoa/ngành/lớp mình
    if (actorRole === "DEAN" && actorUserId) {
      whereClause.createdById = actorUserId;
    } else if (actorRole === "STUDENT" && actorUserId) {
      // Lấy thông tin student
      const student = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: {
          departmentId: true,
          majorId: true,
          classId: true,
        },
      });

      if (student) {
        // Student chỉ thấy call rounds:
        // 1. Được APPROVED
        // 2. Thuộc department/major/class của student
        whereClause.approvalStatus = "APPROVED";
        whereClause.OR = [
          // Call rounds có department của student
          student.departmentId ? {
            departments: {
              some: { id: student.departmentId }
            }
          } : {},
          // Call rounds có major của student
          student.majorId ? {
            majors: {
              some: { id: student.majorId }
            }
          } : {},
          // Call rounds có class của student
          student.classId ? {
            classes: {
              some: { id: student.classId }
            }
          } : {},
        ].filter(condition => Object.keys(condition).length > 0);
      }
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
        availableInstructors: {
          select: {
            id: true,
            instructorId: true,
            invitationStatus: true,
            respondedAt: true,
            createdAt: true,
            updatedAt: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
                departmentId: true,
              },
            },
          },
        },
        availableCouncilMembers: {
          select: {
            id: true,
            councilMemberId: true,
            invitationStatus: true,
            respondedAt: true,
            createdAt: true,
            updatedAt: true,
            councilMember: {
              select: {
                id: true,
                name: true,
                email: true,
                departmentId: true,
              },
            },
          },
        },
        attachments: {
          select: {
            id: true,
            callRoundId: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            fileType: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            projects: true,
            availableInstructors: true,
            availableCouncilMembers: true,
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

    const { departmentIds, majorIds, classIds, instructorIds, councilMemberIds, ...callRoundData } = parsed.data;
    const normalizedName = callRoundData.name.trim();

    const existingCallRound = await prisma.callRound.findFirst({
      where: {
        createdById: actorUserId ?? null,
        name: normalizedName,
        registrationStartDate: callRoundData.registrationStartDate,
        registrationEndDate: callRoundData.registrationEndDate,
      },
      select: {
        id: true,
      },
    });

    if (existingCallRound) {
      return NextResponse.json(
        {
          success: false,
          error: "Đợt đăng ký này đã tồn tại. Vui lòng kiểm tra lại danh sách trước khi tạo mới.",
        },
        { status: 409 }
      );
    }

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
        name: normalizedName,
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
        availableInstructors: {
          create: instructorIds?.map((instructorId) => ({ instructorId })) || [],
        },
        availableCouncilMembers: {
          create: councilMemberIds?.map((councilMemberId) => ({ councilMemberId })) || [],
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
        availableInstructors: {
          select: {
            instructorId: true,
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
                departmentId: true,
              },
            },
          },
        },
        availableCouncilMembers: {
          select: {
            councilMemberId: true,
            councilMember: {
              select: {
                id: true,
                name: true,
                email: true,
                departmentId: true,
              },
            },
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
