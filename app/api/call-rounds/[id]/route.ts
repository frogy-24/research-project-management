import { NextResponse } from "next/server";
import { updateCallRoundSchema } from "@/types/call-round.schema";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callRound = await prisma.callRound.findUnique({
      where: { id },
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

    if (!callRound) {
      return NextResponse.json(
        { success: false, error: "Call round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: callRound });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch call round",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền cập nhật." },
        { status: 403 }
      );
    }

    // Tìm call round để kiểm tra quyền
    const existing = await prisma.callRound.findUnique({
      where: { id },
      include: {
        departments: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy đợt đăng ký." },
        { status: 404 }
      );
    }

    // DEAN chỉ được sửa call round do mình tạo
    if (actorRole === "DEAN") {
      if (existing.createdById !== actorUserId) {
        return NextResponse.json(
          { success: false, error: "Bạn chỉ có thể chỉnh sửa đợt đăng ký do mình tạo." },
          { status: 403 }
        );
      }
      // DEAN chỉ được sửa khi đợt đăng ký đang ở trạng thái chờ duyệt
      if (existing.approvalStatus !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { success: false, error: "Chỉ có thể chỉnh sửa đợt đăng ký khi đang ở trạng thái chờ duyệt." },
          { status: 403 }
        );
      }
    }

    const body: unknown = await request.json();
    const parsed = updateCallRoundSchema.safeParse(body);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...callRoundData,
    };

    // DEAN sửa -> reset về PENDING_APPROVAL để admin duyệt lại
    if (actorRole === "DEAN") {
      updateData.approvalStatus = "PENDING_APPROVAL";
    }

    if (departmentIds !== undefined) {
      // DEAN chỉ được gắn department của mình
      if (actorRole === "DEAN" && actorUserId) {
        const deanUser = await prisma.user.findUnique({
          where: { id: actorUserId },
          select: { departmentId: true },
        });
        if (deanUser?.departmentId) {
          updateData.departments = { set: [{ id: deanUser.departmentId }] };
        }
      } else {
        updateData.departments = { set: departmentIds.map((id) => ({ id })) };
      }
    }
    if (majorIds !== undefined) {
      updateData.majors = { set: majorIds.map((id) => ({ id })) };
    }
    if (classIds !== undefined) {
      updateData.classes = { set: classIds.map((id) => ({ id })) };
    }

    // Handle instructorIds: Delete existing and create new
    if (instructorIds !== undefined) {
      await prisma.callRoundInstructor.deleteMany({
        where: { callRoundId: id },
      });
      if (instructorIds.length > 0) {
        await prisma.callRoundInstructor.createMany({
          data: instructorIds.map((instructorId) => ({
            callRoundId: id,
            instructorId,
          })),
        });
      }
    }

    // Handle councilMemberIds: Delete existing and create new
    if (councilMemberIds !== undefined) {
      await prisma.callRoundCouncilMember.deleteMany({
        where: { callRoundId: id },
      });
      if (councilMemberIds.length > 0) {
        await prisma.callRoundCouncilMember.createMany({
          data: councilMemberIds.map((councilMemberId) => ({
            callRoundId: id,
            councilMemberId,
          })),
        });
      }
    }

    const callRound = await prisma.callRound.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: callRound });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update call round",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa." },
        { status: 403 }
      );
    }

    // DEAN chỉ được xóa call round do mình tạo và chưa được duyệt
    if (actorRole === "DEAN") {
      const existing = await prisma.callRound.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy đợt đăng ký." },
          { status: 404 }
        );
      }
      if (existing.createdById !== actorUserId) {
        return NextResponse.json(
          { success: false, error: "Bạn chỉ có thể xóa đợt đăng ký do mình tạo." },
          { status: 403 }
        );
      }
      if (existing.approvalStatus === "APPROVED") {
        return NextResponse.json(
          { success: false, error: "Đợt đăng ký đã được duyệt, không thể xóa." },
          { status: 403 }
        );
      }
    }

    await prisma.callRound.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete call round",
      },
      { status: 500 }
    );
  }
}
