import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import {
  cancelProjectRegistrationSchema,
  updateProjectRegistrationSchema,
} from "@/types/project-registration.schema";
import { createNotifications } from "@/lib/notification-service";
import { ZodError } from "zod";

type Params = {
  params: Promise<{ id: string }>;
};

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

const canManageOwnRegistrations = (role: string) => role === "STUDENT" || role === "LECTURER";

type TeamMemberPayload = {
  name: string;
  role: string;
  studentId?: string;
  invitationStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";
  invitedAt?: Date | string;
  respondedAt?: Date | string | null;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actorUserId = getActorUserId(request);
    const actorRole = getActorRole(request);

    if (!actorUserId || !actorRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!canManageOwnRegistrations(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền hủy đăng ký đề tài.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const registration = await prisma.projectRegistration.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        instructorStatus: true,
        facultyStatus: true,
        teamMembers: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration not found",
        },
        { status: 404 }
      );
    }

    if (registration.userId !== actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chỉ được hủy đăng ký của chính mình.",
        },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();

    const cancelParsed = cancelProjectRegistrationSchema.safeParse(body);
    if (cancelParsed.success) {
      if (registration.status !== "PENDING") {
        return NextResponse.json(
          {
            success: false,
            error: "Chỉ được hủy đăng ký ở trạng thái PENDING.",
          },
          { status: 409 }
        );
      }

      const updated = await prisma.projectRegistration.update({
        where: { id },
        data: {
          status: "CANCELED",
          cancelReason: cancelParsed.data.cancelReason,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const updateParsed = updateProjectRegistrationSchema.safeParse(body);

    if (!updateParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: mapZodError(updateParsed.error),
        },
        { status: 400 }
      );
    }

    if (registration.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ được sửa đăng ký ở trạng thái PENDING.",
        },
        { status: 409 }
      );
    }

    if (registration.instructorStatus !== "PENDING" || registration.facultyStatus !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ được sửa khi cả trạng thái giảng viên và duyệt khoa đều là PENDING.",
        },
        { status: 409 }
      );
    }

    const currentMembers = Array.isArray(registration.teamMembers)
      ? (registration.teamMembers as unknown as TeamMemberPayload[])
      : [];
    const currentMembersByStudentId = new Map(
      currentMembers
        .filter((member) => Boolean(member.studentId))
        .map((member) => [member.studentId as string, member])
    );
    const nowIso = new Date().toISOString();
    const normalizedTeamMembers = (updateParsed.data.teamMembers ?? []).map((member) => {
      const mapped: TeamMemberPayload = {
        name: member.name,
        role: member.role,
      };

      if (!member.studentId) {
        return mapped;
      }

      const existing = currentMembersByStudentId.get(member.studentId);
      mapped.studentId = member.studentId;
      mapped.invitationStatus = existing?.invitationStatus ?? "PENDING";
      mapped.invitedAt = existing?.invitedAt ?? nowIso;
      mapped.respondedAt = existing?.respondedAt ?? null;
      return mapped;
    });

    const updated = await prisma.projectRegistration.update({
      where: { id },
      data: {
        title: updateParsed.data.title,
        objective: updateParsed.data.objective,
        expectedOutput: updateParsed.data.expectedOutput ?? null,
        ...(updateParsed.data.proposalFiles !== undefined
          ? {
              proposalFiles:
                updateParsed.data.proposalFiles && updateParsed.data.proposalFiles.length > 0
                  ? updateParsed.data.proposalFiles
                  : [],
            }
          : {}),
        teamMembers: normalizedTeamMembers,
      },
    });

    const currentStudentIds = new Set(
      currentMembers.map((member) => member.studentId).filter((studentId): studentId is string => Boolean(studentId))
    );
    const newInviteeIds = Array.from(
      new Set(
        normalizedTeamMembers
          .map((member) => member.studentId)
          .filter(
            (studentId): studentId is string =>
              Boolean(studentId && studentId !== actorUserId && !currentStudentIds.has(studentId))
          )
      )
    );

    if (newInviteeIds.length > 0) {
      await createNotifications(
        newInviteeIds.map((inviteeId) => ({
          userId: inviteeId,
          type: "REGISTRATION_STATUS_CHANGE" as const,
          title: "Bạn được mời tham gia nhóm đề tài",
          message: `Bạn vừa được thêm vào nhóm của đề tài \"${updated.title}\". Vui lòng xác nhận tham gia trong vòng 1 ngày, quá hạn lời mời sẽ tự động hủy.`,
          link: "/student/team-invitations",
          metadata: {
            registrationId: updated.id,
            inviterId: actorUserId,
            action: "TEAM_MEMBER_INVITATION",
          },
        }))
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel registration",
      },
      { status: 500 }
    );
  }
}
