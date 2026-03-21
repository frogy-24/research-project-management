import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActorRole, getActorUserId } from "@/lib/project-permissions";
import { createNotification } from "@/lib/notification-service";

// POST /api/call-rounds/[id]/approve
// Body: { action: "approve" | "reject", note?: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    // Chỉ ADMIN mới được duyệt/từ chối
    if (actorRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Chỉ Admin mới có quyền duyệt đợt đăng ký." },
        { status: 403 }
      );
    }

    const existing = await prisma.callRound.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy đợt đăng ký." },
        { status: 404 }
      );
    }

    if (existing.approvalStatus !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { success: false, error: "Đợt đăng ký này không ở trạng thái chờ duyệt." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, note } = body as { action: "approve" | "reject"; note?: string };

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: "action phải là 'approve' hoặc 'reject'." },
        { status: 400 }
      );
    }

    const newApprovalStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const updated = await prisma.callRound.update({
      where: { id },
      data: {
        approvalStatus: newApprovalStatus,
        approvedById: actorUserId,
        approvalNote: note || null,
        approvedAt: new Date(),
        // Khi ADMIN duyệt, kích hoạt call round
        isActive: action === "approve" ? true : existing.isActive,
      },
      include: {
        template: { select: { id: true, name: true } },
        departments: { select: { id: true, code: true, name: true } },
        majors: { select: { id: true, code: true, name: true } },
        classes: { select: { id: true, code: true, name: true } },
      },
    });

    // Gửi notification cho người tạo (nếu có createdById)
    if (existing.createdById) {
      await createNotification({
        userId: existing.createdById,
        type: action === "approve" ? "CALL_ROUND_APPROVED" : "CALL_ROUND_REJECTED",
        title: action === "approve" 
          ? "Đợt đăng ký đã được phê duyệt" 
          : "Đợt đăng ký bị từ chối",
        message: action === "approve"
          ? `Đợt đăng ký "${existing.name}" đã được Admin phê duyệt và kích hoạt.${note ? ` Ghi chú: ${note}` : ""}`
          : `Đợt đăng ký "${existing.name}" bị từ chối.${note ? ` Lý do: ${note}` : ""}`,
        link: `/dean/call-rounds`,
        metadata: {
          callRoundId: id,
          callRoundName: existing.name,
          approvalNote: note,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process approval",
      },
      { status: 500 }
    );
  }
}
