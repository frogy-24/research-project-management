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
          error: "Bạn không có quyền truy cập chức năng này.",
        },
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
          error: "Bạn không có quyền đăng ký đề tài.",
        },
        { status: 403 }
      );
    }

    // Check if there's an active call round
    const activeCallRound = await prisma.callRound.findFirst({
      where: { isActive: true },
      include: {
        departments: true,
        majors: true,
        classes: true,
      },
    });

    if (!activeCallRound) {
      return NextResponse.json(
        {
          success: false,
          error: "Hiện tại chưa có đợt đăng ký nào đang mở.",
        },
        { status: 400 }
      );
    }

    // Check if the current date is within the call round period
    const now = new Date();
    if (now < new Date(activeCallRound.startDate) || now > new Date(activeCallRound.endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Hiện tại không phải thời gian đăng ký hợp lệ.",
        },
        { status: 400 }
      );
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
        {
          success: false,
          error: "Không tìm thấy thông tin người dùng.",
        },
        { status: 404 }
      );
    }

    // Validate user's organization against the call round
    const { departmentId, majorId, classId } = user;
    
    // Check if user's department is allowed
    if (activeCallRound.departments.length > 0 && departmentId) {
      const isDepartmentAllowed = activeCallRound.departments.some(d => d.id === departmentId);
      if (!isDepartmentAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Khoa của bạn không được phép đăng ký trong đợt này.",
          },
          { status: 403 }
        );
      }
    }

    // Check if user's major is allowed
    if (activeCallRound.majors.length > 0 && majorId) {
      const isMajorAllowed = activeCallRound.majors.some(m => m.id === majorId);
      if (!isMajorAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Ngành học của bạn không được phép đăng ký trong đợt này.",
          },
          { status: 403 }
        );
      }
    }

    // Check if user's class is allowed
    if (activeCallRound.classes.length > 0 && classId) {
      const isClassAllowed = activeCallRound.classes.some(c => c.id === classId);
      if (!isClassAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Lớp của bạn không được phép đăng ký trong đợt này.",
          },
          { status: 403 }
        );
      }
    }

    const body: unknown = await request.json();
    const parsed = createProjectRegistrationSchema.safeParse(body);

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
        callRoundId: activeCallRound.id, // Associate with the active call round
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
