import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateTemplateSchema } from "@/types/progress-template.schema";
import { getAuthUser } from "@/lib/auth-helpers";

// GET - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await prisma.progressReportTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Không tìm thấy biểu mẫu" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Không thể tải biểu mẫu" },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Check template ownership (DEAN can only edit own templates, ADMIN can edit all)
    const existingTemplate = await prisma.progressReportTemplate.findUnique({
      where: { id },
      select: { createdById: true, createdByRole: true },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Không tìm thấy biểu mẫu" },
        { status: 404 }
      );
    }

    // Authorization check
    if (authUser.role !== "ADMIN" && existingTemplate.createdById !== authUser.userId) {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa biểu mẫu này" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateTemplateSchema.parse({ ...body, id });

    // Delete existing items and create new ones (simpler than complex update logic)
    await prisma.progressReportTemplateItem.deleteMany({
      where: { templateId: id },
    });

    const template = await prisma.progressReportTemplate.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        isActive: validated.isActive,
        items: validated.items
          ? {
              create: validated.items.map((item) => ({
                weekNumber: item.weekNumber!,
                weekLabel: item.weekLabel!,
                taskDescription: item.taskDescription!,
                contentGuideline: item.contentGuideline,
                expectedResult: item.expectedResult,
                orderIndex: item.orderIndex!,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: error.message || "Không thể cập nhật biểu mẫu" },
      { status: 400 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Check template ownership (DEAN can only delete own templates, ADMIN can delete all)
    const existingTemplate = await prisma.progressReportTemplate.findUnique({
      where: { id },
      select: { createdById: true, createdByRole: true },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Không tìm thấy biểu mẫu" },
        { status: 404 }
      );
    }

    // Authorization check
    if (authUser.role !== "ADMIN" && existingTemplate.createdById !== authUser.userId) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa biểu mẫu này" },
        { status: 403 }
      );
    }

    await prisma.progressReportTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Không thể xóa biểu mẫu" },
      { status: 400 }
    );
  }
}
