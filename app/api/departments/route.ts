import { NextResponse } from "next/server";
import { departmentSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.department.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = departmentSchema.parse(body);

    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "Mã khoa hoặc tên khoa đã tồn tại" },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: validatedData,
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}