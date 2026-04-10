// app/api/disbursements/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import { approveDisbursementSchema } from '@/types/disbursement.schema';

/**
 * POST /api/disbursements/[id]/approve
 * Phê duyệt giải ngân (Admin only)
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

    // Chỉ Admin được phê duyệt
    if (actorRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Chỉ Admin mới có quyền phê duyệt giải ngân' },
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

    // Chỉ phê duyệt được khi PENDING
    if (disbursement.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể phê duyệt giải ngân đang chờ duyệt' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validatedData = approveDisbursementSchema.parse(body);

    const updated = await prisma.fundingDisbursement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorUserId,
        approvedAt: validatedData.approvedAt || new Date(),
        rejectionNote: null, // Clear rejection note if any
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
      message: 'Phê duyệt giải ngân thành công',
    });
  } catch (error) {
    console.error('Error approving disbursement:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ', errors: 'errors' in error ? error.errors : [] },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Lỗi khi phê duyệt giải ngân' },
      { status: 500 }
    );
  }
}
