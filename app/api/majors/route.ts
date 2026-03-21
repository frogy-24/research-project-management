import { NextResponse } from "next/server";
import { majorSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";
import { getAuthUser, getDepartmentFilter, isAdmin } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { code: { contains: search, mode: "insensitive" as const } },
      ];
    }

    // Role-based filtering: DEAN sees only their department's majors
    const departmentFilter = getDepartmentFilter(authUser);
    if (departmentFilter && !isAdmin(authUser)) {
      whereClause.departmentId = departmentFilter;
    } else if (departmentId) {
      // ADMIN can filter by specific department
      whereClause.departmentId = departmentId;
    }

    const [majors, total] = await Promise.all([
      prisma.major.findMany({
        where: whereClause,
        include: {
          department: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.major.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: majors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching majors:", error);
    return NextResponse.json(
      { error: "Failed to fetch majors" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = majorSchema.parse(body);

    // DEAN can only create majors in their own department
    if (authUser.role === "DEAN") {
      if (validatedData.departmentId !== authUser.departmentId) {
        return NextResponse.json(
          { error: "Forbidden: You can only create majors in your department" },
          { status: 403 }
        );
      }
    }

    const existingMajor = await prisma.major.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
      },
    });

    if (existingMajor) {
      return NextResponse.json(
        { error: "Mã ngành hoặc tên ngành đã tồn tại" },
        { status: 400 }
      );
    }

    const department = await prisma.department.findUnique({
      where: { id: validatedData.departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Khoa không tồn tại" },
        { status: 400 }
      );
    }

    const major = await prisma.major.create({
      data: validatedData,
      include: {
        department: true,
      },
    });

    return NextResponse.json(major, { status: 201 });
  } catch (error) {
    console.error("Error creating major:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create major" },
      { status: 500 }
    );
  }
}
