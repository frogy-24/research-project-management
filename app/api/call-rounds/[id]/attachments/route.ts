import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import prisma from "@/lib/prisma";

// GET - Get all attachments for a call round
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const attachments = await prisma.callRoundAttachment.findMany({
      where: { callRoundId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch attachments",
      },
      { status: 500 }
    );
  }
}

// POST - Upload attachment for a call round
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền tải lên file đính kèm." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify call round exists
    const callRound = await prisma.callRound.findUnique({
      where: { id },
    });

    if (!callRound) {
      return NextResponse.json(
        { success: false, error: "Đợt đăng ký không tồn tại." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const description = formData.get("description") as string | null;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "call-rounds");
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
    const filePath = join(uploadDir, fileName);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(filePath, buffer);

    // Create attachment record
    const attachment = await prisma.callRoundAttachment.create({
      data: {
        callRoundId: id,
        fileName: file.name,
        fileUrl: `/uploads/call-rounds/${fileName}`,
        fileSize: file.size,
        fileType: file.type,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload attachment",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete attachment (handled in separate route file)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (actorRole !== "ADMIN" && actorRole !== "LEADER" && actorRole !== "DEAN") {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa file đính kèm." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const url = new URL(request.url);
    const attachmentId = url.searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: "Attachment ID is required" },
        { status: 400 }
      );
    }

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

    // Delete record (file on disk can be cleaned up later)
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