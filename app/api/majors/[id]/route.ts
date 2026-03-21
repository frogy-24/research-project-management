import { NextResponse } from "next/server";
import { updateMajorSchema } from "@/types/organization.schema";
import prisma from "@/lib/prisma";
import { getAuthUser, canManageDepartment } from "@/lib/auth-helpers";

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
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing major to check department
    const existingMajor = await prisma.major.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!existingMajor) {
      return NextResponse.json({ error: "Major not found" }, { status: 404 });
    }

    // DEAN can only update majors in their own department
    if (!canManageDepartment(authUser, existingMajor.departmentId)) {
      return NextResponse.json(
        { error: "Forbidden: You can only manage majors in your department" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateMajorSchema.parse(body);

    // If DEAN tries to move major to another department, deny it
    if (authUser.role === "DEAN" && validatedData.departmentId !== authUser.departmentId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot move majors to another department" },
        { status: 403 }
      );
    }

    const duplicateMajor = await prisma.major.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { name: validatedData.name },
        ],
        id: { not: id },
      },
    });

    if (duplicateMajor) {
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
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing major to check department
    const existingMajor = await prisma.major.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!existingMajor) {
      return NextResponse.json({ error: "Major not found" }, { status: 404 });
    }

    // DEAN can only delete majors in their own department
    if (!canManageDepartment(authUser, existingMajor.departmentId)) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete majors in your department" },
        { status: 403 }
      );
    }

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
          },
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
