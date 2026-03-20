import { NextResponse } from "next/server";
import { createCallRoundSchema } from "@/types/call-round.schema";
import { ZodError } from "zod";
import prisma from "@/lib/prisma";
import { getActorRole } from "@/lib/project-permissions";

export async function GET(req: Request) {
  try {
    const callRounds = await prisma.callRound.findMany({
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
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: callRounds });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch call rounds",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actorRole = getActorRole(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền tạo đợt đăng ký." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createCallRoundSchema.safeParse(body);

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

    const callRound = await prisma.callRound.create({
      data: {
        ...callRoundData,
        templateId: callRoundData.templateId || null,
        departments: {
          connect: departmentIds?.map(id => ({ id })) || [],
        },
        majors: {
          connect: majorIds?.map(id => ({ id })) || [],
        },
        classes: {
          connect: classIds?.map(id => ({ id })) || [],
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

    return NextResponse.json({ success: true, data: callRound }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create call round",
      },
      { status: 500 }
    );
  }
}
