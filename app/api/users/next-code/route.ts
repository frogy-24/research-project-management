
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, getDepartmentFilter } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // Build where clause based on role
    const whereClause: any = { role };
    
    // Apply department filter for DEAN
    const departmentFilter = getDepartmentFilter(authUser);
    if (departmentFilter) {
      whereClause.departmentId = departmentFilter;
    }

    // Get the last user with a code for this role
    const lastUser = await prisma.user.findFirst({
      where: {
        ...whereClause,
        code: { not: null },
      },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    // Generate next code
    let nextCode: string;
    const prefix = role === 'LECTURER' ? 'GV' : 'SV';
    
    if (!lastUser || !lastUser.code) {
      nextCode = `${prefix}001`;
    } else {
      // Extract number from code (e.g., GV011 -> 11)
      const match = lastUser.code.match(/\d+$/);
      if (match) {
        const lastNumber = parseInt(match[0], 10);
        const nextNumber = lastNumber + 1;
        nextCode = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      } else {
        nextCode = `${prefix}001`;
      }
    }

    return NextResponse.json({ code: nextCode });
  } catch (error) {
    console.error("Error generating next code:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
