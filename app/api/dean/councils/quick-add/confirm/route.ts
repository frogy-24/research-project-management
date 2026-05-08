import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { quickAddCouncilItemSchema } from '@/types/council.schema';

const confirmSchema = z.object({
  callRoundId: z.string().min(1),
  items: z.array(quickAddCouncilItemSchema).min(1),
  selectedCouncilIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const callRound = await prisma.callRound.findUnique({
      where: { id: parsed.data.callRoundId },
      select: { id: true, approvalStatus: true, isLocked: true },
    });

    if (!callRound) {
      return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
    }

    if (callRound.isLocked) {
      return NextResponse.json(
        { error: 'Đợt đề tài đã hoàn tất công bố hội đồng, không thể chỉnh sửa' },
        { status: 409 },
      );
    }

    if (callRound.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Chỉ có thể tạo hội đồng cho đợt đề tài đã APPROVED' },
        { status: 400 },
      );
    }

    const selectedIds = new Set(parsed.data.selectedCouncilIds ?? []);
    const itemsToCreate = selectedIds.size
      ? parsed.data.items.filter((item) => selectedIds.has(item.councilId))
      : parsed.data.items;

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 hội đồng' }, { status: 400 });
    }

    const invalidMemberCount = itemsToCreate.find((item) => item.members.length > 3);
    if (invalidMemberCount) {
      return NextResponse.json(
        { error: `Một hội đồng chỉ được tối đa 3 thành viên: ${invalidMemberCount.name}` },
        { status: 400 },
      );
    }

    const createdCouncils = await prisma.$transaction(async (tx) => {
      const created: Array<{ id: string; name: string }> = [];

      for (const item of itemsToCreate) {
        const council = await tx.council.create({
          data: {
            callRoundId: parsed.data.callRoundId,
            name: item.name,
            description: item.description || null,
          },
        });

        const uniqueMembers = new Map<string, { id: string; role?: string | null }>();
        for (const member of item.members) {
          if (member?.id && !uniqueMembers.has(member.id)) {
            uniqueMembers.set(member.id, { id: member.id, role: member.role ?? null });
          }
        }

        const memberAssignments = Array.from(uniqueMembers.values()).map((member, index) => {
          const normalizedRole = member.role === 'MEMBER' ? null : member.role;
          const role =
            normalizedRole || (index === 0 ? 'Chủ tịch' : index === 1 ? 'Thư ký' : 'Ủy viên');

          return {
            councilId: council.id,
            councilMemberId: member.id,
            role,
          };
        });

        if (memberAssignments.length > 0) {
          await tx.councilMemberAssignment.createMany({ data: memberAssignments });
        }

        created.push({ id: council.id, name: council.name });
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      message: `Đã xác nhận ${createdCouncils.length} hội đồng`,
      confirmed_count: createdCouncils.length,
      confirmed_items: createdCouncils,
    });
  } catch (error) {
    console.error('Error in quick-add confirm proxy:', error);
    return NextResponse.json({ error: 'Failed to confirm quick add councils' }, { status: 500 });
  }
}