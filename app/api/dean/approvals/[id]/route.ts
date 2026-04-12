import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId, getActorRole } from "@/lib/project-permissions";
import { ProjectStatus } from "@/prisma/generated/prisma";

const stripTime = (value: Date) => {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deanId = userId;
    const dean = await prisma.user.findUnique({ where: { id: deanId } });

    if (!dean || dean.role !== "DEAN") {
      return NextResponse.json({ error: "Forbidden: Only Dean can access" }, { status: 403 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.projectRegistration.findUnique({
      where: { id: registrationId },
      include: {
        user: true,
        callRound: {
          select: {
            projectLockDate: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optional: Check if department matches
    if (dean.department && existing.user.department !== dean.department) {
      return NextResponse.json({ error: "Can only approve registrations from your department" }, { status: 403 });
    }

    if (existing.status === "CANCELED") {
      return NextResponse.json({ error: "Registration has been canceled" }, { status: 409 });
    }

    if (status === existing.facultyStatus) {
      return NextResponse.json({ error: "Registration is already in this status" }, { status: 409 });
    }

    // Allow undo for both approved and rejected registrations.
    if (status === "PENDING" && existing.facultyStatus !== "APPROVED" && existing.facultyStatus !== "REJECTED") {
      return NextResponse.json({ error: "Only approved or rejected registrations can be reverted to pending" }, { status: 409 });
    }

    if (status === "APPROVED" && existing.instructorStatus !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Instructor must accept before dean approval" },
        { status: 409 },
      );
    }

    if (existing.callRound?.projectLockDate) {
      const today = stripTime(new Date());
      const lockDate = stripTime(existing.callRound.projectLockDate);
      if (today > lockDate) {
        return NextResponse.json(
          { error: "Đã quá hạn chốt đề tài, không thể cập nhật trạng thái duyệt." },
          { status: 409 }
        );
      }
    }

    const updatedRegistration = await prisma.projectRegistration.update({
      where: { id: registrationId },
      data: {
        facultyStatus: status,
        status,
        facultyReviewerId: status === "PENDING" ? null : deanId,
      },
    });

    if (status === "APPROVED") {
      const existingProject = await prisma.project.findFirst({
        where: {
          leaderId: existing.userId,
          title: existing.title,
          callRoundId: existing.callRoundId,
        },
        select: { id: true },
      });

      // Logic shortcut for MVP: promote Registration directly to a live Project upon Dean's approval.
      // In a more complex architecture, there would be a separate step for final Academic Admin / Council validation.
      if (!existingProject) {
        await prisma.project.create({
          data: {
            title: existing.title,
            objective: existing.objective,
            expectedOutput: existing.expectedOutput,
            status: ProjectStatus.IN_PROGRESS, // Start progress reporting immediately
            leaderId: existing.userId,
            instructorId: existing.instructorId,
            deanReviewerId: deanId,
            callRoundId: existing.callRoundId,
          }
        });
      }
    }

    return NextResponse.json(updatedRegistration);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
