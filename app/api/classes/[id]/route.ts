import { NextResponse } from "next/server";
import { updateClassSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classObj = await prisma.class.findUnique({
      where: { id },
      include: {
        major: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!classObj) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(classObj);
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json(
      { error: "Failed to fetch class" },
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
    const validatedData = updateClassSchema.parse(body);

    const existingClass = await prisma.class.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
        id: { not: id }, // Exclude current class from check
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

    const classObj = await prisma.class.update({
      where: { id },
      data: validatedData,
      include: {
        major: {
          include: {
            department: true,
          },
        },
      },
    });

    return NextResponse.json(classObj);
  } catch (error) {
    console.error("Error updating class:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update class" },
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
    // Check if class has related records
    const [users, callRounds] = await Promise.all([
      prisma.user.count({ where: { classId: id } }),
      prisma.callRound.count({
        where: {
          classes: {
            some: { id },
          },
        },
      }),
    ]);

    if (users > 0 || callRounds > 0) {
      return NextResponse.json(
        { 
          error: "Không thể xóa lớp vì đang có dữ liệu liên quan",
          details: {
            users,
            callRounds,
          }
        },
        { status: 400 }
      );
    }

    await prisma.class.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}