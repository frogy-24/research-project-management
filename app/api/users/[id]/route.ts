import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createUserSchema } from "@/types/user.schema";
import { getAuthUser, canManageDepartment } from "@/lib/auth-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        departmentRef: true,
        major: true,
        class: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the target user to check their department
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // DEAN can only update users in their own department
    if (!canManageDepartment(authUser, targetUser.departmentId)) {
      return NextResponse.json(
        { error: "Forbidden: You can only manage users in your department" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.partial().parse(body);

    // If DEAN tries to move a user to a different department, deny it
    if (
      authUser.role === "DEAN" &&
      validatedData.departmentId &&
      validatedData.departmentId !== authUser.departmentId
    ) {
      return NextResponse.json(
        { error: "Forbidden: You cannot move users to another department" },
        { status: 403 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...validatedData,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      },
      include: {
        departmentRef: true,
        major: true,
        class: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the target user to check their department
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { departmentId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // DEAN can only delete users in their own department
    if (!canManageDepartment(authUser, targetUser.departmentId)) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete users in your department" },
        { status: 403 }
      );
    }

    // Prevent deleting yourself
    if (id === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
