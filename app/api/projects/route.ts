import { Prisma, ProjectStatus } from "@/prisma/generated/prisma";
import { NextResponse } from "next/server";
import { createProjectSchema } from "@/types/project.schema";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { canCreateProject, getActorRole, getActorUserId } from "@/lib/project-permissions";

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

export async function GET(req: Request) {
  try {
    const actorRole = getActorRole(req);
    const actorId = getActorUserId(req);

    if (!actorId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let whereClause = {};

    if (actorRole === "STUDENT" || actorRole === "LECTURER") {
      // Return projects where user is leader OR user is instructor
      whereClause = {
        OR: [
          { leaderId: actorId },
          { instructorId: actorId }
        ]
      };
    } else if (actorRole === "DEAN") {
      whereClause = { deanReviewerId: actorId };
    }
    // "ADMIN", "COUNCIL", "LEADER" maybe see all projects, so no where clause for them.

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        leader: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
        projectType: true,
        callRound: {
          include: {
            template: {
              include: {
                items: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actorRole = getActorRole(request);

    if (!actorRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing actor role.",
        },
        { status: 401 }
      );
    }

    if (!canCreateProject(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền tạo đề tài.",
        },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createProjectSchema.safeParse(body);

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

    const restrictedOpenProject = await prisma.project.findFirst({
      where: {
        leaderId: parsed.data.leaderId,
        status: { in: [ProjectStatus.IN_PROGRESS, ProjectStatus.SUSPENDED] },
        overdueReportCount: { gt: 0 },
      },
      select: { id: true },
    });

    if (restrictedOpenProject) {
      return NextResponse.json(
        {
          success: false,
          error: "Chủ nhiệm đang có đề tài nợ quá hạn, không thể đăng ký đề tài mới.",
        },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        title: parsed.data.title,
        objective: parsed.data.objective,
        expectedOutput: parsed.data.expectedOutput ?? null,
        proposalFileUrl: parsed.data.proposalFileUrl ?? null,
        status: parsed.data.status,
        budgetRequested:
          parsed.data.budgetRequested === null || parsed.data.budgetRequested === undefined
            ? null
            : new Prisma.Decimal(parsed.data.budgetRequested),
        budgetApproved:
          parsed.data.budgetApproved === null || parsed.data.budgetApproved === undefined
            ? null
            : new Prisma.Decimal(parsed.data.budgetApproved),
        leaderId: parsed.data.leaderId,
        deanReviewerId: parsed.data.deanReviewerId ?? null,
        callRoundId: parsed.data.callRoundId ?? null,
        projectTypeId: parsed.data.projectTypeId ?? null,
        code: parsed.data.code ?? null,
        overdueReportCount: parsed.data.overdueReportCount,
        budgetSuspended: parsed.data.budgetSuspended,
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
