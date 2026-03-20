import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canCreateCouncilEvaluation,
  getActorRole,
  getActorUserId,
} from "@/lib/project-permissions";
import { createCouncilEvaluationSchema } from "@/types/council-evaluation.schema";
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

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    const evaluations = await prisma.councilEvaluation.findMany({
      where: { projectId: id },
      include: {
        councilMember: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { evaluatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: evaluations });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch council evaluations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!canCreateCouncilEvaluation(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền chấm điểm hội đồng.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createCouncilEvaluationSchema.safeParse(body);

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

    const existingEvaluation = await prisma.councilEvaluation.findFirst({
      where: {
        projectId: id,
        councilMemberId: actorUserId,
      },
      select: { id: true },
    });

    if (existingEvaluation) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn đã chấm đề tài này.",
        },
        { status: 409 }
      );
    }

    const evaluation = await prisma.councilEvaluation.create({
      data: {
        projectId: id,
        councilMemberId: actorUserId,
        score: parsed.data.score,
        decision: parsed.data.decision,
        comment: parsed.data.comment ?? null,
      },
    });

    return NextResponse.json({ success: true, data: evaluation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create council evaluation",
      },
      { status: 500 }
    );
  }
}
