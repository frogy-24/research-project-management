import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canCreateExtensionRequest,
  getActorRole,
  getActorUserId,
} from "@/lib/project-permissions";
import { createExtensionRequestSchema } from "@/types/extension-request.schema";
import { ZodError } from "zod";

type Params = {
  params: Promise<{ id: string }>;
};

const mapZodError = (zodError: ZodError) => {
  const fields: Record<string, string[]> = {};

  for (const issue of zodError.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    const requests = await prisma.extensionRequest.findMany({
      where: { projectId: id },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch extension requests",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!canCreateExtensionRequest(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền tạo yêu cầu gia hạn.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, leaderId: true },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    if (project.leaderId !== actorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn chỉ được tạo yêu cầu gia hạn cho đề tài của mình.",
        },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createExtensionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          fields: mapZodError(parsed.error),
        },
        { status: 400 }
      );
    }

    const extension = await prisma.extensionRequest.create({
      data: {
        projectId: id,
        requestedMonths: parsed.data.requestedMonths,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({ success: true, data: extension }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create extension request",
      },
      { status: 500 }
    );
  }
}
