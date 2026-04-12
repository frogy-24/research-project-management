import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// POST /api/dean/councils - Tạo hội đồng thủ công
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { callRoundId, name, description, members } = body;

    // Validation
    if (!callRoundId || !name) {
      return NextResponse.json(
        { error: 'Call round ID and name are required' },
        { status: 400 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'At least one member is required' },
        { status: 400 }
      );
    }

    if (members.length > 3) {
      return NextResponse.json(
        { error: 'Một hội đồng chỉ được tối đa 3 thành viên' },
        { status: 400 }
      );
    }

    // Kiểm tra call round tồn tại
    const callRound = await prisma.callRound.findUnique({
      where: { id: callRoundId },
    });

    if (!callRound) {
      return NextResponse.json(
        { error: 'Call round not found' },
        { status: 404 }
      );
    }

    if (callRound.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Chỉ có thể tạo hội đồng cho đợt đề tài đã APPROVED' },
        { status: 400 }
      );
    }

    // Tạo hội đồng và phân công thành viên trong transaction
    const council = await prisma.$transaction(async (tx) => {
      // Tạo hội đồng
      const newCouncil = await tx.council.create({
        data: {
          callRoundId,
          name,
          description: description || null,
        },
      });

      // Phân công thành viên
      const memberAssignments = members.map((member: any, index: number) => ({
        councilId: newCouncil.id,
        councilMemberId: member.councilMemberId,
        role: member.role || (index === 0 ? 'Chủ tịch' : index === 1 ? 'Thư ký' : 'Ủy viên'),
      }));

      await tx.councilMemberAssignment.createMany({
        data: memberAssignments,
      });

      // Lấy thông tin đầy đủ của hội đồng vừa tạo
      return await tx.council.findUnique({
        where: { id: newCouncil.id },
        include: {
          members: {
            include: {
              councilMember: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  code: true,
                },
              },
            },
          },
          projects: {
            include: {
              projectRegistration: {
                select: {
                  id: true,
                  title: true,
                  objective: true,
                  status: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      });
    });

    return NextResponse.json(council, { status: 201 });
  } catch (error: any) {
    console.error('Error creating council:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create council' },
      { status: 500 }
    );
  }
}
