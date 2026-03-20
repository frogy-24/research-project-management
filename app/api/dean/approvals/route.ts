import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorUserId, getActorRole } from "@/lib/project-permissions";


export async function GET(req: Request) {
  try {
    const userId = getActorUserId(req);
    const role = getActorRole(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deanId = userId;
    const dean = await prisma.user.findUnique({
      where: { id: deanId }
    });

    if (!dean || dean.role !== "DEAN") {
      return NextResponse.json({ error: "Forbidden: Only Dean can access" }, { status: 403 });
    }

    // Determine the dean's department (optional, but realistic)
    const deanDepartment = dean.department;

    // Build the query
    const whereClause: any = {};
    if (deanDepartment) {
      whereClause.user = { department: deanDepartment };
    }

    const registrations = await prisma.projectRegistration.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, department: true } },
        instructor: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(registrations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
