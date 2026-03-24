import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId, getActorRole } from "@/lib/project-permissions";
import { ProjectStatus } from "@/prisma/generated/prisma";

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

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.projectRegistration.findUnique({
      where: { id: registrationId },
      include: { user: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Optional: Check if department matches
    if (dean.department && existing.user.department !== dean.department) {
      return NextResponse.json({ error: "Can only approve registrations from your department" }, { status: 403 });
    }

    const updatedRegistration = await prisma.projectRegistration.update({
      where: { id: registrationId },
      data: {
        facultyStatus: status,
        status,
        facultyReviewerId: deanId,
      },
    });

    if (status === "APPROVED") {
      // Logic shortcut for MVP: promote Registration directly to a live Project upon Dean's approval.
      // In a more complex architecture, there would be a separate step for final Academic Admin / Council validation.
      await prisma.project.create({
        data: {
          title: existing.title,
          objective: existing.objective,
          expectedOutput: existing.expectedOutput,
          status: ProjectStatus.IN_PROGRESS, // Start progress reporting immediately
          leaderId: existing.userId,
          instructorId: existing.instructorId,
          deanReviewerId: deanId,
        }
      });
    }

    return NextResponse.json(updatedRegistration);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
