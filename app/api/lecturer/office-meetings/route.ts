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

        const currentUser = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true, email: true }
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

        const recipientIdsWithCreator = Array.from(new Set([...recipientIds, session.userId]));

        // Lưu bản ghi gốc vào bảng riêng
        const newOfficeMeeting = await prisma.officeMeeting.create({
            data: {
                projectId: project.id,
                instructorId: session.userId,
                target: parsed.data.meetingTarget,
                memberUserIds: requestedMemberIds.length > 0 ? requestedMemberIds : [],
                meetingAt: meetingDate,
                location: parsed.data.location,
                note: parsed.data.note || null,
                views: {
                    create: recipientIdsWithCreator.map((id) => ({
                        userId: id,
                        isRead: false,
                    })),
                },
            },
        });

        // Vẫn gửi thông báo kèm reference tới ID của cuộc họp ở bảng mới
        const notifications = await prisma.$transaction(
            recipientIdsWithCreator.map((recipientId) =>
                prisma.notification.create({
                    data: {
                        userId: recipientId,
                        type: 'PROJECT_STATUS_CHANGE',
                        title: 'Lịch họp mới',
                        message:
                            recipientId === session.userId
                                ? `Bạn đã tạo lịch họp cho đề tài "${project.title}" vào ${formattedTime} tại ${parsed.data.location}.`
                                : parsed.data.meetingTarget === 'GROUP'
                                    ? `Giảng viên đã hẹn họp cho đề tài "${project.title}" vào ${formattedTime} tại ${parsed.data.location}.`
                                    : `Giảng viên đã hẹn họp với sinh viên phụ trách đề tài "${project.title}" vào ${formattedTime} tại ${parsed.data.location}.`,
                        link: recipientId === session.userId ? '/lecturer/meetings' : '/student/meetings',
                        metadata: {
                            officeMeetingId: newOfficeMeeting.id, // Linking back
                            projectId: project.id,
                            meetingTarget: parsed.data.meetingTarget,
                            meetingAt: meetingDate.toISOString(),
                            location: parsed.data.location,
                            note: parsed.data.note || null,
                            kind: 'OFFICE_MEETING',
                            scheduledBy: {
                                id: session.userId,
                                name: currentUser?.name || 'Giảng viên hướng dẫn',
                                email: currentUser?.email || null,
                            },
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
