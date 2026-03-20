import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId, getActorRole } from "@/lib/project-permissions";


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: registrationId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.projectRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!existing || existing.instructorId !== userId) {
      return NextResponse.json({ error: "Not authorized to update this registration" }, { status: 403 });
    }

    const updated = await prisma.projectRegistration.update({
      where: { id: registrationId },
      data: { instructorStatus: status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
