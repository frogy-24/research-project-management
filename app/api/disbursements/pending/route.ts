// app/api/disbursements/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';

/**
 * GET /api/disbursements/pending
 * Lấy danh sách giải ngân chờ phê duyệt (Admin)
 */
export async function GET(request: NextRequest) {
  try {
    const actorRole = getActorRole(request);
    const actorUserId = getActorUserId(request);

    if (!actorRole || !actorUserId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Chỉ Admin xem được
    if (actorRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Chỉ Admin mới có quyền xem danh sách chờ duyệt' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [disbursements, total] = await Promise.all([
      prisma.fundingDisbursement.findMany({
        where: {
          status: 'PENDING',
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
        },
      }),
      prisma.fundingDisbursement.count({
        where: {
          status: 'PENDING',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: disbursements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching pending disbursements:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách giải ngân chờ duyệt' },
      { status: 500 }
    );
  }
}
