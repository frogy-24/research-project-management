// app/api/disbursements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import { updateDisbursementSchema } from '@/types/disbursement.schema';

/**
 * GET /api/disbursements/[id]
 * Lấy chi tiết giải ngân
 */
export async function GET(
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

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            code: true,
            title: true,
            budgetApproved: true,
            callRoundId: true,
            callRound: {
              select: {
                id: true,
                name: true,
                createdById: true,
              },
            },
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

    if (!disbursement) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy giải ngân' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xem
    if (actorRole === 'DEAN') {
      if (disbursement.project.callRound?.createdById !== actorUserId) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền xem giải ngân này' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: disbursement,
    });
  } catch (error) {
    console.error('Error fetching disbursement:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy thông tin giải ngân' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/disbursements/[id]
 * Cập nhật giải ngân (chỉ PENDING)
 */
export async function PATCH(
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

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            callRound: true,
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

    // Chỉ cập nhật được khi PENDING
    if (disbursement.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể cập nhật giải ngân đang chờ duyệt' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền: chỉ người tạo hoặc Admin
    if (actorRole === 'DEAN') {
      if (disbursement.createdById !== actorUserId) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền cập nhật giải ngân này' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = updateDisbursementSchema.parse(body);

    // Nếu cập nhật số tiền, kiểm tra ngân sách
    if (validatedData.amount) {
      const project = await prisma.project.findUnique({
        where: { id: disbursement.projectId },
        include: {
          disbursements: {
            where: {
              status: 'APPROVED',
              id: { not: id },
            },
          },
        },
      });

      if (project) {
        const totalDisbursed = project.disbursements.reduce(
          (sum: number, d) => sum + Number(d.amount),
          0
        );
        const remainingBudget = Number(project.budgetApproved) - totalDisbursed;

        if (validatedData.amount > remainingBudget) {
          return NextResponse.json(
            {
              success: false,
              message: `Số tiền giải ngân vượt quá ngân sách còn lại (${remainingBudget.toLocaleString('vi-VN')} VNĐ)`,
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.fundingDisbursement.update({
      where: { id },
      data: validatedData,
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
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Cập nhật giải ngân thành công',
    });
  } catch (error) {
    console.error('Error updating disbursement:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ', errors: 'errors' in error ? error.errors : [] },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật giải ngân' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/disbursements/[id]
 * Xóa giải ngân (chỉ PENDING)
 */
export async function DELETE(
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

    const disbursement = await prisma.fundingDisbursement.findUnique({
      where: { id },
    });

    if (!disbursement) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy giải ngân' },
        { status: 404 }
      );
    }

    // Chỉ xóa được khi PENDING
    if (disbursement.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: 'Chỉ có thể xóa giải ngân đang chờ duyệt' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền: chỉ người tạo hoặc Admin
    if (actorRole === 'DEAN') {
      if (disbursement.createdById !== actorUserId) {
        return NextResponse.json(
          { success: false, message: 'Bạn không có quyền xóa giải ngân này' },
          { status: 403 }
        );
      }
    }

    await prisma.fundingDisbursement.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Xóa giải ngân thành công',
    });
  } catch (error) {
    console.error('Error deleting disbursement:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa giải ngân' },
      { status: 500 }
    );
  }
}
