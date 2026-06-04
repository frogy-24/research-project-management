// app/api/disbursements/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId, canPayDisbursement } from '@/lib/project-permissions';
import { uploadToR2 } from '@/lib/r2';

const MAX_PAYMENT_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_PAYMENT_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'zip',
]);

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
        { success: false, message: 'Vui lòng upload tài liệu liên quan đến thanh toán' },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: 'File tải lên không hợp lệ' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PAYMENT_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File thanh toán không được vượt quá 20MB' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_PAYMENT_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { success: false, message: 'Định dạng file thanh toán không được hỗ trợ' },
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
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '') || `payment-voucher.${extension}`;
    const key = `disbursements/${id}/payments/${Date.now()}-${safeName}`;

    const paymentVoucherUrl = await uploadToR2({
      key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
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
