import { NextResponse } from "next/server";
import { updateDepartmentSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    return NextResponse.json(
      { error: "Failed to fetch department" },
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
    const validatedData = updateDepartmentSchema.parse(body);

    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
        id: { not: id }, // Exclude current department from check
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "Mã khoa hoặc tên khoa đã tồn tại" },
        { status: 400 }
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    if (error instanceof Error && "fieldErrors" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update department" },
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
    // Check if department has related records
    const [majors, users, callRounds] = await Promise.all([
      prisma.major.count({ where: { departmentId: id } }),
      prisma.user.count({ where: { departmentId: id } }),
      prisma.callRound.count({
        where: {
          departments: {
            some: { id },
          },
        },
      }),
    ]);

    if (majors > 0 || users > 0 || callRounds > 0) {
      return NextResponse.json(
        { 
          error: "Không thể xóa khoa vì đang có dữ liệu liên quan",
          details: {
            majors,
            users,
            callRounds,
          }
        },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}