import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { createProjectRegistrationSchema } from "@/types/project-registration.schema";
import { createNotifications } from "@/lib/notification-service";
import { ZodError } from "zod";

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
  invitationStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
  invitedAt?: Date | string;
  respondedAt?: Date | string | null;
};

const isAcceptedTeamMember = (
  rawMembers: unknown,
  userId: string
): boolean => {
  if (!Array.isArray(rawMembers)) {
    return false;
  }

  return (rawMembers as TeamMemberPayload[]).some(
    (member) => member.studentId === userId && member.invitationStatus === "ACCEPTED"
  );
};

export async function GET(request: Request) {
  try {
    const actorUserId = getActorUserId(request);
    const actorRole = getActorRole(request);

    if (!actorUserId || !actorRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageOwnRegistrations(actorRole)) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền truy cập chức năng này." },
        { status: 403 }
      );
    }

    const registrations = await prisma.projectRegistration.findMany({
      where: { userId: actorUserId },
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, name: true } },
        callRound: {
          select: {
            id: true,
            name: true,
            registrationStartDate: true,
            registrationEndDate: true,
            projectStartDate: true,
            projectEndDate: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: registrations });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch registrations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actorUserId = getActorUserId(request);
    const actorRole = getActorRole(request);

    if (!actorUserId || !actorRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canManageOwnRegistrations(actorRole)) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền đăng ký đề tài." },
        { status: 403 }
      );
    }

    // Read body once
    const rawBody: unknown = await request.json();
    const requestedCallRoundId =
      rawBody && typeof rawBody === "object" && "callRoundId" in rawBody
        ? (rawBody as Record<string, unknown>).callRoundId
        : null;

    // Find all call rounds currently open, approved, and applicable for current actor role
    const applicableFor =
      actorRole === "STUDENT"
        ? ["STUDENT", "BOTH"]
        : ["LECTURER", "BOTH"];

    const now = new Date();
    const openCallRounds = await prisma.callRound.findMany({
      where: {
        isActive: true,
        approvalStatus: "APPROVED",
        applicableFor: { in: applicableFor },
        registrationStartDate: { lte: now },
        registrationEndDate: { gte: now },
      },
      include: {
        departments: true,
        majors: true,
        classes: true,
      },
    });

    if (openCallRounds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Hiện tại chưa có đợt đăng ký phù hợp (đã duyệt và đúng đối tượng) đang mở.",
        },
        { status: 400 }
      );
    }

    // Select call round: use client-specified one if valid, otherwise pick first open one
    let activeCallRound = openCallRounds[0];
    if (requestedCallRoundId && typeof requestedCallRoundId === "string") {
      const found = openCallRounds.find((r) => r.id === requestedCallRoundId);
      if (!found) {
        return NextResponse.json(
          {
            success: false,
            error: "Đợt đăng ký được chọn không hợp lệ hoặc đã đóng.",
          },
          { status: 400 }
        );
      }
      activeCallRound = found;
    }

    // Get user's department, major, and class
    const user = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        departmentId: true,
        majorId: true,
        classId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy thông tin người dùng." },
        { status: 404 }
      );
    }

    // Validate user's organization against the selected call round
    const { departmentId, majorId, classId } = user;

    if (activeCallRound.departments.length > 0 && departmentId) {
      const allowed = activeCallRound.departments.some((d) => d.id === departmentId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Khoa của bạn không được phép đăng ký trong đợt này." },
          { status: 403 }
        );
      }
    }

    if (activeCallRound.majors.length > 0 && majorId) {
      const allowed = activeCallRound.majors.some((m) => m.id === majorId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Ngành học của bạn không được phép đăng ký trong đợt này." },
          { status: 403 }
        );
      }
    }

    if (activeCallRound.classes.length > 0 && classId) {
      const allowed = activeCallRound.classes.some((c) => c.id === classId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Lớp của bạn không được phép đăng ký trong đợt này." },
          { status: 403 }
        );
      }
    }

    const existingRegistrationInRound = await prisma.projectRegistration.findFirst({
      where: {
        userId: actorUserId,
        callRoundId: activeCallRound.id,
        OR: [
          { status: "APPROVED" },
          { facultyStatus: "APPROVED" },
          {
            AND: [
              { status: "PENDING" },
              { instructorStatus: { not: "REJECTED" } },
            ],
          },
        ],
      },
      select: { id: true },
    });

    if (existingRegistrationInRound) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn đã có đề tài đang chờ duyệt hoặc đã được duyệt trong đợt đăng ký này.",
        },
        { status: 400 }
      );
    }

    const registrationsInRound = await prisma.projectRegistration.findMany({
      where: {
        callRoundId: activeCallRound.id,
        status: { not: "CANCELED" },
      },
      select: {
        id: true,
        title: true,
        teamMembers: true,
      },
    });

    const acceptedMembership = registrationsInRound.find((registration) =>
      isAcceptedTeamMember(registration.teamMembers, actorUserId)
    );

    if (acceptedMembership) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bạn đã tham gia một đề tài trong đợt này (đã xác nhận lời mời nhóm), không thể đăng ký thêm đề tài khác.",
        },
        { status: 400 }
      );
    }

    // Validate payload with schema (reuse rawBody already read)
    const parsed = createProjectRegistrationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: mapZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const normalizedTeamMembers = (parsed.data.teamMembers ?? []).map((member) => {
      const mapped: TeamMemberPayload = {
        name: member.name,
        role: member.role,
      };

      if (member.studentId) {
        mapped.studentId = member.studentId;
        mapped.invitationStatus = "PENDING";
        mapped.invitedAt = nowIso;
        mapped.respondedAt = null;
      }

      return mapped;
    });

    const created = await prisma.projectRegistration.create({
      data: {
        userId: actorUserId,
        title: parsed.data.title,
        objective: parsed.data.objective,
        expectedOutput: parsed.data.expectedOutput ?? null,
        teamMembers: normalizedTeamMembers,
        instructorId: parsed.data.instructorId ?? null,
        callRoundId: activeCallRound.id,
      },
    });

    const inviteeIds = Array.from(
      new Set(
        normalizedTeamMembers
          .map((member) => member.studentId)
          .filter((studentId): studentId is string => Boolean(studentId && studentId !== actorUserId))
      )
    );

    if (inviteeIds.length > 0) {
      await createNotifications(
        inviteeIds.map((inviteeId) => ({
          userId: inviteeId,
          type: "REGISTRATION_STATUS_CHANGE" as const,
          title: "Bạn được mời tham gia nhóm đề tài",
          message: `Bạn vừa được thêm vào nhóm của đề tài \"${created.title}\". Vui lòng xác nhận tham gia.`,
          link: "/student/team-invitations",
          metadata: {
            registrationId: created.id,
            inviterId: actorUserId,
            action: "TEAM_MEMBER_INVITATION",
          },
        }))
      );
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create registration",
      },
      { status: 500 }
    );
  }
}
