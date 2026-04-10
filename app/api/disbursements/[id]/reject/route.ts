// app/api/disbursements/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import { rejectDisbursementSchema } from '@/types/disbursement.schema';

/**
 * POST /api/disbursements/[id]/reject
 * Từ chối giải ngân (Admin only)
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

    // Chỉ Admin được từ chối
    if (actorRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Chỉ Admin mới có quyền từ chối giải ngân' },
        { status: 403 }
      );
    }

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    if (!disbursement) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy giải ngân' },
        { status: 404 }
      );
    }

    // Chỉ từ chối được khi PENDING
    if (disbursement.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể từ chối giải ngân đang chờ duyệt' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = rejectDisbursementSchema.parse(body);

    const updated = await prisma.fundingDisbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: actorUserId,
        approvedAt: new Date(),
        rejectionNote: validatedData.rejectionNote,
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
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Từ chối giải ngân thành công',
    });
  } catch (error) {
    console.error('Error rejecting disbursement:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ', errors: 'errors' in error ? error.errors : [] },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Lỗi khi từ chối giải ngân' },
      { status: 500 }
    );
  }
}
