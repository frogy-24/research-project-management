// app/api/disbursements/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId, canPayDisbursement } from '@/lib/project-permissions';
import { uploadToR2 } from '@/lib/r2';

/**
 * POST /api/disbursements/[id]/pay
 * Thanh toán giải ngân + upload chứng từ (Người giải ngân - DISBURSER only)
 * Nhận multipart/form-data: file (PDF, bắt buộc), paymentNote, paidAt
 * Chuyển trạng thái APPROVED -> PAID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!canPayDisbursement(actorRole)) {
      return NextResponse.json(
        { success: false, message: 'Chỉ Người giải ngân mới có quyền thanh toán' },
        { status: 403 }
      );
    }

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!disbursement) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy giải ngân' },
        { status: 404 }
      );
    }

    // Chỉ thanh toán được khi đã phê duyệt
    if (disbursement.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể thanh toán giải ngân đã được phê duyệt' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const paymentNote = (formData.get('paymentNote') as string | null)?.trim() || null;
    const paidAtRaw = formData.get('paidAt') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng upload chứng từ giải ngân (PDF)' },
        { status: 400 }
      );
    }

    const isPdfByType = file.type === 'application/pdf';
    const isPdfByName = /\.pdf$/i.test(file.name);
    if (!isPdfByType && !isPdfByName) {
      return NextResponse.json(
        { success: false, message: 'Chứng từ phải là file PDF' },
        { status: 400 }
      );
    }

    const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Ngày thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    const key = `disbursements/${id}/${Date.now()}-${safeName}`;

    const paymentVoucherUrl = await uploadToR2({
      key,
      body: buffer,
      contentType: 'application/pdf',
    });

    const updated = await prisma.fundingDisbursement.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentVoucherUrl,
        paidById: actorUserId,
        paidAt,
        paymentNote,
      },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            title: true,
            budgetApproved: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        paidBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Thanh toán giải ngân thành công',
    });
  } catch (error) {
    console.error('Error paying disbursement:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi thanh toán giải ngân' },
      { status: 500 }
    );
  }
}
