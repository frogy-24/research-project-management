import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';

const isDeadlinePassed = (deadline: Date | null) => {
    if (!deadline) return false;
    return deadline.getTime() <= Date.now();
};

// GET: Get call round invitations for the current lecturer
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode');
        const callRoundId = searchParams.get('callRoundId');
        const actorRole = getActorRole(req);
        const actorUserId = getActorUserId(req);

        if (actorRole !== 'LECTURER' || !actorUserId) {
            return NextResponse.json(
                { success: false, error: 'Chỉ giảng viên mới có quyền xem lời mời.' },
                { status: 403 },
            );
        }

        if (mode === 'options') {
            const [instructorCallRounds, councilCallRounds] = await Promise.all([
                prisma.callRoundInstructor.findMany({
                    where: { instructorId: actorUserId },
                    select: {
                        callRound: {
                            select: {
                                id: true,
                                name: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.callRoundCouncilMember.findMany({
                    where: { councilMemberId: actorUserId },
                    select: {
                        callRound: {
                            select: {
                                id: true,
                                name: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);

            const uniqueByIdMap = new Map<string, { id: string; name: string; createdAt: Date }>();
            for (const item of instructorCallRounds) {
                uniqueByIdMap.set(item.callRound.id, item.callRound);
            }
            for (const item of councilCallRounds) {
                uniqueByIdMap.set(item.callRound.id, item.callRound);
            }

            const byNewest = Array.from(uniqueByIdMap.values()).sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );

            const uniqueNameSet = new Set<string>();
            const deduplicatedByName: Array<{ id: string; name: string }> = [];

            for (const item of byNewest) {
                const normalizedName = item.name.trim().toLowerCase();
                if (uniqueNameSet.has(normalizedName)) {
                    continue;
                }

                uniqueNameSet.add(normalizedName);
                deduplicatedByName.push({ id: item.id, name: item.name });
            }

            const options = deduplicatedByName.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

            return NextResponse.json({ success: true, data: options });
        }

        const instructorWhere = {
            instructorId: actorUserId,
            ...(callRoundId ? { callRoundId } : {}),
        };
        const councilWhere = {
            councilMemberId: actorUserId,
            ...(callRoundId ? { callRoundId } : {}),
        };

        // Get invitations as instructor (CallRoundInstructor)
        const instructorInvitations = await prisma.callRoundInstructor.findMany({
            where: instructorWhere,
            include: {
                callRound: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        registrationStartDate: true,
                        registrationEndDate: true,
                        projectStartDate: true,
                        projectEndDate: true,
                        defenseDate: true,
                        invitationDeadline: true,
                        applicableFor: true,
                        approvalStatus: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get invitations as council member (CallRoundCouncilMember)
        const councilMemberInvitations = await prisma.callRoundCouncilMember.findMany({
            where: councilWhere,
            include: {
                callRound: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        registrationStartDate: true,
                        registrationEndDate: true,
                        projectStartDate: true,
                        projectEndDate: true,
                        defenseDate: true,
                        invitationDeadline: true,
                        applicableFor: true,
                        approvalStatus: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                instructorInvitations,
                councilMemberInvitations,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Không thể lấy danh sách lời mời.',
            },
            { status: 500 },
        );
    }
}

// PATCH: Respond to an invitation (accept/reject)
export async function PATCH(request: Request) {
    try {
        const actorRole = getActorRole(request);
        const actorUserId = getActorUserId(request);

        if (actorRole !== 'LECTURER' || !actorUserId) {
            return NextResponse.json(
                { success: false, error: 'Chỉ giảng viên mới có quyền phản hồi lời mời.' },
                { status: 403 },
            );
        }

        const body = await request.json();
        const { invitationId, invitationType, status } = body;

        if (!invitationId || !invitationType || !status) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin cần thiết.' }, { status: 400 });
        }

        if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Trạng thái không hợp lệ.' }, { status: 400 });
        }

        if (!['INSTRUCTOR', 'COUNCIL_MEMBER'].includes(invitationType)) {
            return NextResponse.json({ success: false, error: 'Loại lời mời không hợp lệ.' }, { status: 400 });
        }

        if (invitationType === 'INSTRUCTOR') {
            const invitation = await prisma.callRoundInstructor.findFirst({
                where: {
                    id: invitationId,
                    instructorId: actorUserId,
                },
                include: {
                    callRound: {
                        select: {
                            invitationDeadline: true,
                        },
                    },
                },
            });

            if (!invitation) {
                return NextResponse.json({ success: false, error: 'Không tìm thấy lời mời.' }, { status: 404 });
            }

            if (status !== 'PENDING' && isDeadlinePassed(invitation.callRound.invitationDeadline)) {
                return NextResponse.json({ success: false, error: 'Đã quá hạn phản hồi lời mời.' }, { status: 400 });
            }

            const updated = await prisma.callRoundInstructor.update({
                where: {
                    callRoundId_instructorId: {
                        callRoundId: invitation.callRoundId,
                        instructorId: actorUserId,
                    },
                },
                data: {
                    invitationStatus: status,
                    respondedAt: status === 'PENDING' ? null : new Date(),
                },
                include: {
                    callRound: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return NextResponse.json({ success: true, data: updated });
        } else {
            const invitation = await prisma.callRoundCouncilMember.findFirst({
                where: {
                    id: invitationId,
                    councilMemberId: actorUserId,
                },
                include: {
                    callRound: {
                        select: {
                            invitationDeadline: true,
                        },
                    },
                },
            });

            if (!invitation) {
                return NextResponse.json({ success: false, error: 'Không tìm thấy lời mời.' }, { status: 404 });
            }

            if (status !== 'PENDING' && isDeadlinePassed(invitation.callRound.invitationDeadline)) {
                return NextResponse.json({ success: false, error: 'Đã quá hạn phản hồi lời mời.' }, { status: 400 });
            }

            const updated = await prisma.callRoundCouncilMember.update({
                where: {
                    callRoundId_councilMemberId: {
                        callRoundId: invitation.callRoundId,
                        councilMemberId: actorUserId,
                    },
                },
                data: {
                    invitationStatus: status,
                    respondedAt: status === 'PENDING' ? null : new Date(),
                },
                include: {
                    callRound: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            return NextResponse.json({ success: true, data: updated });
        }
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Không thể phản hồi lời mời.',
            },
            { status: 500 },
        );
    }
}
