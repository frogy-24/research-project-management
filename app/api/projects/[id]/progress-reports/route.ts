import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canCreateProgressReport,
  getActorRole,
  getActorUserId,
} from "@/lib/project-permissions";
import { createProgressReportSchema } from "@/types/progress-report.schema";
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

    const reports = await prisma.progressReport.findMany({
      where: { projectId: id },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch progress reports",
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

    if (!canCreateProgressReport(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền nộp báo cáo tiến độ.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, leaderId: true },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    if (project.leaderId !== actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chỉ được nộp báo cáo cho đề tài của mình.",
        },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createProgressReportSchema.safeParse(body);

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

    const report = await prisma.progressReport.create({
      data: {
        projectId: id,
        periodLabel: parsed.data.periodLabel,
        summary: parsed.data.summary,
        fileUrl: parsed.data.fileUrl ?? null,
        week: parsed.data.week ?? null,
        fromDate: parsed.data.fromDate ?? null,
        toDate: parsed.data.toDate ?? null,
        tasks: parsed.data.tasks ?? null,
        performedContent: parsed.data.performedContent ?? null,
        results: parsed.data.results ?? null,
        reportContent: parsed.data.reportContent ?? null,
      },
    });

    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create progress report",
      },
      { status: 500 }
    );
  }
}
