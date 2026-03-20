import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createTemplateSchema } from "@/types/progress-template.schema";

// GET - List all templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const templates = await prisma.progressReportTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách biểu mẫu" },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    const template = await prisma.progressReportTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        isActive: validated.isActive,
        items: {
          create: validated.items.map((item) => ({
            weekNumber: item.weekNumber,
            weekLabel: item.weekLabel,
            taskDescription: item.taskDescription,
            contentGuideline: item.contentGuideline,
            expectedResult: item.expectedResult,
            orderIndex: item.orderIndex,
          })),
        },
      },
      include: {
        items: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: error.message || "Không thể tạo biểu mẫu" },
      { status: 400 }
    );
  }
}
