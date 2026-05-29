import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { updateProgressReportSchema } from "@/types/progress-report.schema";

type Params = {
  params: Promise<{ id: string }>;
};

const stripTime = (value: Date) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isDatePassed = (today: Date, targetDate?: Date | null) => {
  if (!targetDate) return false;
  return today > stripTime(targetDate);
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const report = await prisma.progressReport.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            leaderId: true,
            callRound: {
              select: {
                projectEndDate: true,
                projectLockDate: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    if (report.project.leaderId !== actorUserId) {
      return NextResponse.json({ success: false, error: "Bạn không có quyền sửa báo cáo này." }, { status: 403 });
    }

    const today = stripTime(new Date());
    const projectLockDate = report.project.callRound?.projectLockDate ?? report.project.callRound?.projectEndDate ?? null;
    if (isDatePassed(today, projectLockDate)) {
      return NextResponse.json({ success: false, error: "Đã quá hạn nộp báo cáo của đề tài này." }, { status: 400 });
    }

    if (isDatePassed(today, report.toDate ?? null)) {
      return NextResponse.json({ success: false, error: "Đã quá thời gian của tuần báo cáo, không thể chỉnh sửa." }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = updateProgressReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    if (data.toDate && isDatePassed(today, data.toDate)) {
      return NextResponse.json({ success: false, error: "Ngày kết thúc tuần báo cáo đã quá hạn." }, { status: 400 });
    }

    const updated = await prisma.progressReport.update({
      where: { id },
      data: {
        periodLabel: data.periodLabel ?? undefined,
        summary: data.summary ?? undefined,
        week: data.week ?? undefined,
        fromDate: data.fromDate ?? undefined,
        toDate: data.toDate ?? undefined,
        tasks: data.tasks ?? undefined,
        performedContent: data.performedContent ?? undefined,
        results: data.results ?? undefined,
        reportContent: data.reportContent ?? undefined,
        fileUrl: data.fileUrl ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update progress report" }, { status: 500 });
  }
}
