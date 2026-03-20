import { NextResponse } from "next/server";
import { updateMajorSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const major = await prisma.major.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!major) {
      return NextResponse.json(
        { error: "Major not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(major);
  } catch (error) {
    console.error("Error fetching major:", error);
    return NextResponse.json(
      { error: "Failed to fetch major" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMajorSchema.parse(body);

    const existingMajor = await prisma.major.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
        id: { not: id }, // Exclude current major from check
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

    const major = await prisma.major.update({
      where: { id },
      data: validatedData,
      include: {
        department: true,
      },
    });

    return NextResponse.json(major);
  } catch (error) {
    console.error("Error updating major:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update major" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if major has related records
    const [classes, users, callRounds] = await Promise.all([
      prisma.class.count({ where: { majorId: id } }),
      prisma.user.count({ where: { majorId: id } }),
      prisma.callRound.count({
        where: {
          majors: {
            some: { id },
          },
        },
      }),
    ]);

    if (classes > 0 || users > 0 || callRounds > 0) {
      return NextResponse.json(
        { 
          error: "Không thể xóa ngành vì đang có dữ liệu liên quan",
          details: {
            classes,
            users,
            callRounds,
          }
        },
        { status: 400 }
      );
    }

    await prisma.major.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Major deleted successfully" });
  } catch (error) {
    console.error("Error deleting major:", error);
    return NextResponse.json(
      { error: "Failed to delete major" },
      { status: 500 }
    );
  }
}