import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { createOfficeMeetingSchema } from '@/types/office-meeting.schema';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';

const teamMemberArraySchema = registrationTeamMemberSchema.array();

const extractTeamMemberUserIds = (teamMembers: unknown): string[] => {
    const parsed = teamMemberArraySchema.safeParse(teamMembers);
    if (!parsed.success) {
        return [];
    }

    return parsed.data
        .map((member) => member.studentId)
        .filter((studentId): studentId is string => typeof studentId === 'string' && studentId.length > 0);
};

export async function POST(request: Request) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'LECTURER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: unknown = await request.json();
        const parsed = createOfficeMeetingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Invalid payload',
                    fields: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const meetingDate = new Date(parsed.data.meetingAt);
        if (Number.isNaN(meetingDate.getTime())) {
            return NextResponse.json({ error: 'Thời gian họp không hợp lệ' }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id: parsed.data.projectId },
            select: {
                id: true,
                title: true,
                leaderId: true,
                instructorId: true,
                callRoundId: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: 'Không tìm thấy đề tài' }, { status: 404 });
        }

        if (project.instructorId !== session.userId) {
            return NextResponse.json({ error: 'Bạn không có quyền đặt lịch cho đề tài này' }, { status: 403 });
        }

        const formattedTime = meetingDate.toLocaleString('vi-VN', {
            hour12: false,
        });

        const registration = await prisma.projectRegistration.findFirst({
            where: {
                userId: project.leaderId,
                instructorId: session.userId,
                title: project.title,
                ...(project.callRoundId ? { callRoundId: project.callRoundId } : {}),
            },
            select: {
                teamMembers: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        const candidateRecipientIds = Array.from(
            new Set([project.leaderId, ...extractTeamMemberUserIds(registration?.teamMembers)]),
        );

        const requestedMemberIds = Array.from(new Set(parsed.data.memberUserIds ?? []));
        const hasInvalidMemberIds = requestedMemberIds.some((memberId) => !candidateRecipientIds.includes(memberId));

        if (hasInvalidMemberIds) {
            return NextResponse.json({ error: 'Danh sách thành viên được chọn không hợp lệ' }, { status: 400 });
        }

        const recipientIds =
            parsed.data.meetingTarget === 'GROUP'
                ? requestedMemberIds.length > 0
                    ? requestedMemberIds
                    : candidateRecipientIds
                : [project.leaderId];

        const notifications = await prisma.$transaction(
            recipientIds.map((recipientId) =>
                prisma.notification.create({
                    data: {
                        userId: recipientId,
                        type: 'PROJECT_STATUS_CHANGE',
                        title: 'Lịch họp Office mới',
                        message:
                            parsed.data.meetingTarget === 'GROUP'
                                ? `Giảng viên đã hẹn họp office cho đề tài "${project.title}" vào ${formattedTime} tại ${parsed.data.location}.`
                                : `Giảng viên đã hẹn họp office với sinh viên phụ trách đề tài "${project.title}" vào ${formattedTime} tại ${parsed.data.location}.`,
                        link: '/student/progress',
                        metadata: {
                            projectId: project.id,
                            meetingTarget: parsed.data.meetingTarget,
                            meetingAt: meetingDate.toISOString(),
                            location: parsed.data.location,
                            note: parsed.data.note || null,
                            kind: 'OFFICE_MEETING',
                        },
                    },
                    select: {
                        id: true,
                    },
                }),
            ),
        );

        if (notifications.length === 0) {
            return NextResponse.json({ error: 'Không có người nhận hợp lệ cho lịch họp' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            notificationId: notifications[0].id,
            notificationCount: notifications.length,
        });
    } catch (error) {
        console.error('Error creating office meeting:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
