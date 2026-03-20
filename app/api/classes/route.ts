import { NextResponse } from "next/server";
import { classSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const majorId = searchParams.get("majorId") || "";

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { code: { contains: search, mode: "insensitive" as const } },
      ];
    }
    
    if (majorId) {
      whereClause.majorId = majorId;
    }

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where: whereClause,
        include: {
          major: {
            include: {
              department: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.class.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: classes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = classSchema.parse(body);

    const existingClass = await prisma.class.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
      },
    });

    if (existingClass) {
      return NextResponse.json(
        { error: "Mã lớp hoặc tên lớp đã tồn tại" },
        { status: 400 }
      );
    }

    const major = await prisma.major.findUnique({
      where: { id: validatedData.majorId },
      include: {
        department: true,
      },
    });

    if (!major) {
      return NextResponse.json(
        { error: "Ngành không tồn tại" },
        { status: 400 }
      );
    }

    const classObj = await prisma.class.create({
      data: validatedData,
      include: {
        major: {
          include: {
            department: true,
          },
        },
      },
    });

    return NextResponse.json(classObj, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}