import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Adjust this based on where prisma is exported
import { getActorUserId, getActorRole } from "@/lib/project-permissions";


export async function GET(req: Request) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    

    const registrations = await prisma.projectRegistration.findMany({
      where: {
        instructorId: userId,
      },
      select: {
        id: true,
        title: true,
        objective: true,
        expectedOutput: true,
        instructorStatus: true,
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(registrations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
