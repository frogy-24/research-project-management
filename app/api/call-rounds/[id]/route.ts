import { NextResponse } from "next/server";
import { updateCallRoundSchema } from "@/types/call-round.schema";
import prisma from "@/lib/prisma";
import { getActorRole } from "@/lib/project-permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callRound = await prisma.callRound.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        majors: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classes: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!callRound) {
      return NextResponse.json(
        { success: false, error: "Call round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: callRound });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch call round",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền cập nhật." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateCallRoundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { departmentIds, majorIds, classIds, ...callRoundData } = parsed.data;

    const callRound = await prisma.callRound.update({
      where: { id },
      data: {
        ...callRoundData,
        templateId: callRoundData.templateId || null,
        departments: {
          set: departmentIds?.map(id => ({ id })) || [],
        },
        majors: {
          set: majorIds?.map(id => ({ id })) || [],
        },
        classes: {
          set: classIds?.map(id => ({ id })) || [],
        },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        majors: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        classes: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: callRound });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update call round",
      },
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
    const actorRole = getActorRole(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa." },
        { status: 403 }
      );
    }

    await prisma.callRound.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete call round",
      },
      { status: 500 }
    );
  }
}
