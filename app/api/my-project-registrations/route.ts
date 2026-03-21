import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { createProjectRegistrationSchema } from "@/types/project-registration.schema";
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

    // Find all call rounds currently open for registration (by registrationStartDate/registrationEndDate)
    const now = new Date();
    const openCallRounds = await prisma.callRound.findMany({
      where: {
        isActive: true,
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
          error: "Hiện tại chưa có đợt đăng ký nào đang mở.",
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

    const created = await prisma.projectRegistration.create({
      data: {
        userId: actorUserId,
        title: parsed.data.title,
        objective: parsed.data.objective,
        expectedOutput: parsed.data.expectedOutput ?? null,
        instructorId: parsed.data.instructorId ?? null,
        callRoundId: activeCallRound.id,
      },
    });

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
