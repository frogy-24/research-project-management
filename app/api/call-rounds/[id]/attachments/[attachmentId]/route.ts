import { NextRequest, NextResponse } from "next/server";
import { getActorRole } from "@/lib/project-permissions";
import prisma from "@/lib/prisma";

// DELETE - Delete a specific attachment by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const actorRole = getActorRole(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa file đính kèm." },
        { status: 403 }
      );
    }

    const { id, attachmentId } = await params;

    // Find attachment
    const attachment = await prisma.callRoundAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 }
      );
    }

    if (attachment.callRoundId !== id) {
      return NextResponse.json(
        { success: false, error: "Attachment does not belong to this call round" },
        { status: 403 }
      );
    }

    // Delete record
    await prisma.callRoundAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true, data: { id: attachmentId } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete attachment",
      },
      { status: 500 }
    );
  }
}