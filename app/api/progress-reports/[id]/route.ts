import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { reviewProgressReportSchema } from "@/types/progress-report.schema";
import { notifyProgressReportReviewed } from "@/lib/notification-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = reviewProgressReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const report = await prisma.progressReport.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    // Checking if the user can review:
    // If we assume ADMIN or the Mentor can review. The progress report doesn't explicitly store mentor, but we normally might say mentor is DEAN or ADMIN for now. For simplicity we check if DEAN or ADMIN or leader.
    // In this basic version, allow LECTURER, ADMIN, DEAN, COUNCIL, LEADER to review.
    const canReview = ["ADMIN", "DEAN", "COUNCIL", "LEADER", "LECTURER"].includes(actorRole);

    if (!canReview) {
      return NextResponse.json({ success: false, error: "Không có quyền nhận xét." }, { status: 403 });
    }

    const updated = await prisma.progressReport.update({
      where: { id },
      data: {
        mentorReview: parsed.data.mentorReview,
        mentorScore: parsed.data.mentorScore,
      },
    });

    // Send notification to project leader
    try {
      await notifyProgressReportReviewed(
        id,
        report.projectId,
        report.project,
        report.periodLabel,
        parsed.data.mentorScore ?? undefined
      );
    } catch (error) {
      console.error("Failed to send notification:", error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update review" }, { status: 500 });
  }
}
