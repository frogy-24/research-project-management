import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canReviewExtensionRequest, getActorRole } from "@/lib/project-permissions";
import { reviewExtensionRequestSchema } from "@/types/extension-request.schema";
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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actorRole = getActorRole(request);

    if (!actorRole) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!canReviewExtensionRequest(actorRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn không có quyền duyệt gia hạn.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = reviewExtensionRequestSchema.safeParse(body);

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

    const extension = await prisma.extensionRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: "Extension request not found",
        },
        { status: 404 }
      );
    }

    if (extension.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu gia hạn đã được xử lý trước đó.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.extensionRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to review extension request",
      },
      { status: 500 }
    );
  }
}
