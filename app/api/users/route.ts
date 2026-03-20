import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createUserSchema } from "@/types/user.schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const departmentId = searchParams.get("departmentId");
    const majorId = searchParams.get("majorId");
    const classId = searchParams.get("classId");
    const search = searchParams.get("search") || "";

    const whereClause: any = {};

    if (role) whereClause.role = role;
    if (departmentId) whereClause.departmentId = departmentId;
    if (majorId) whereClause.majorId = majorId;
    if (classId) whereClause.classId = classId;
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        departmentRef: true,
        major: true,
        class: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { code: validatedData.code || undefined },
        ].filter(Boolean) as any,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email hoặc mã số đã tồn tại" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
      },
      include: {
        departmentRef: true,
        major: true,
        class: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
