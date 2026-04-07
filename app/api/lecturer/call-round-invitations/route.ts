import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";

// GET: Get call round invitations for the current lecturer
export async function GET(req: Request) {
  try {
    const actorRole = getActorRole(req);
    const actorUserId = getActorUserId(req);

    if (actorRole !== "LECTURER" || !actorUserId) {
      return NextResponse.json(
        { success: false, error: "Chỉ giảng viên mới có quyền xem lời mời." },
        { status: 403 }
      );
    }

    // Get invitations as instructor (CallRoundInstructor)
    const instructorInvitations = await prisma.callRoundInstructor.findMany({
      where: {
        instructorId: actorUserId,
      },
      include: {
        callRound: {
          select: {
            id: true,
            name: true,
            description: true,
            registrationStartDate: true,
            registrationEndDate: true,
            projectStartDate: true,
            projectEndDate: true,
            defenseDate: true,
            invitationDeadline: true,
            applicableFor: true,
            approvalStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get invitations as council member (CallRoundCouncilMember)
    const councilMemberInvitations = await prisma.callRoundCouncilMember.findMany({
      where: {
        councilMemberId: actorUserId,
      },
      include: {
        callRound: {
          select: {
            id: true,
            name: true,
            description: true,
            registrationStartDate: true,
            registrationEndDate: true,
            projectStartDate: true,
            projectEndDate: true,
            defenseDate: true,
            invitationDeadline: true,
            applicableFor: true,
            approvalStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        instructorInvitations,
        councilMemberInvitations,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Không thể lấy danh sách lời mời.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Respond to an invitation (accept/reject)
export async function PATCH(request: Request) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (actorRole !== "LECTURER" || !actorUserId) {
      return NextResponse.json(
        { success: false, error: "Chỉ giảng viên mới có quyền phản hồi lời mời." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invitationId, invitationType, status } = body;

    if (!invitationId || !invitationType || !status) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin cần thiết." },
        { status: 400 }
      );
    }

    if (!["ACCEPTED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Trạng thái không hợp lệ." },
        { status: 400 }
      );
    }

    if (!["INSTRUCTOR", "COUNCIL_MEMBER"].includes(invitationType)) {
      return NextResponse.json(
        { success: false, error: "Loại lời mời không hợp lệ." },
        { status: 400 }
      );
    }

    if (invitationType === "INSTRUCTOR") {
      const invitation = await prisma.callRoundInstructor.findFirst({
        where: {
          id: invitationId,
          instructorId: actorUserId,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy lời mời." },
          { status: 404 }
        );
      }

      const updated = await prisma.callRoundInstructor.update({
        where: {
          callRoundId_instructorId: {
            callRoundId: invitation.callRoundId,
            instructorId: actorUserId,
          },
        },
        data: {
          invitationStatus: status,
          respondedAt: new Date(),
        },
        include: {
          callRound: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, data: updated });
    } else {
      const invitation = await prisma.callRoundCouncilMember.findFirst({
        where: {
          id: invitationId,
          councilMemberId: actorUserId,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy lời mời." },
          { status: 404 }
        );
      }

      const updated = await prisma.callRoundCouncilMember.update({
        where: {
          callRoundId_councilMemberId: {
            callRoundId: invitation.callRoundId,
            councilMemberId: actorUserId,
          },
        },
        data: {
          invitationStatus: status,
          respondedAt: new Date(),
        },
        include: {
          callRound: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Không thể phản hồi lời mời.",
      },
      { status: 500 }
    );
  }
}
