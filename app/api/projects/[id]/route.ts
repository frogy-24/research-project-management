import { Prisma } from "@/prisma/generated/prisma";
import { NextResponse } from "next/server";
import { updateProjectSchema } from "@/types/project.schema";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import {
  canDeleteProject,
  canTransitionStatus,
  canUpdateProjectMeta,
  getActorRole,
} from "@/lib/project-permissions";

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        leader: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
        projectType: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch project",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
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

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

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

    const currentProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!currentProject) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    if (parsed.data.status !== undefined) {
      const isAllowed = canTransitionStatus(actorRole, currentProject.status, parsed.data.status);

      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Bạn không có quyền chuyển trạng thái theo luồng này.",
          },
          { status: 403 }
        );
      }
    } else if (!canUpdateProjectMeta(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền cập nhật thông tin đề tài.",
        },
        { status: 403 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.objective !== undefined ? { objective: parsed.data.objective } : {}),
        ...(parsed.data.expectedOutput !== undefined
          ? { expectedOutput: parsed.data.expectedOutput }
          : {}),
        ...(parsed.data.proposalFileUrl !== undefined
          ? { proposalFileUrl: parsed.data.proposalFileUrl }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.budgetRequested !== undefined
          ? {
              budgetRequested:
                parsed.data.budgetRequested === null
                  ? null
                  : new Prisma.Decimal(parsed.data.budgetRequested),
            }
          : {}),
        ...(parsed.data.budgetApproved !== undefined
          ? {
              budgetApproved:
                parsed.data.budgetApproved === null
                  ? null
                  : new Prisma.Decimal(parsed.data.budgetApproved),
            }
          : {}),
        ...(parsed.data.leaderId !== undefined ? { leaderId: parsed.data.leaderId } : {}),
        ...(parsed.data.deanReviewerId !== undefined
          ? { deanReviewerId: parsed.data.deanReviewerId }
          : {}),
        ...(parsed.data.callRoundId !== undefined ? { callRoundId: parsed.data.callRoundId } : {}),
        ...(parsed.data.projectTypeId !== undefined
          ? { projectTypeId: parsed.data.projectTypeId }
          : {}),
        ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
        ...(parsed.data.overdueReportCount !== undefined
          ? { overdueReportCount: parsed.data.overdueReportCount }
          : {}),
        ...(parsed.data.budgetSuspended !== undefined
          ? { budgetSuspended: parsed.data.budgetSuspended }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update project",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(_);

    if (!actorRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing actor role.",
        },
        { status: 401 }
      );
    }

    if (!canDeleteProject(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền xóa đề tài.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete project",
      },
      { status: 500 }
    );
  }
}
