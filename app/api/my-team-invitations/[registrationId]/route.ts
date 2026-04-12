import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import { respondTeamInvitationSchema } from '@/types/team-invitation.schema';
import { createNotification } from '@/lib/notification-service';

type Params = {
    params: Promise<{ registrationId: string }>;
};

type TeamMemberJson = {
    name: string;
    role: string;
    studentId?: string;
    invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
    invitedAt?: string | Date;
    respondedAt?: string | Date | null;
};

const canRespondInvitation = (role: string) => role === 'STUDENT';
const INVITATION_EXPIRE_MS = 24 * 60 * 60 * 1000;

const isExpiredPendingInvitation = (member: TeamMemberJson, fallbackDate: Date, now: Date): boolean => {
    if ((member.invitationStatus ?? 'PENDING') !== 'PENDING') {
        return false;
    }

    const invitedAt = new Date(member.invitedAt ?? fallbackDate);
    if (Number.isNaN(invitedAt.getTime())) {
        return false;
    }

    return now.getTime() - invitedAt.getTime() >= INVITATION_EXPIRE_MS;
};

const hasAcceptedMembership = (rawMembers: unknown, userId: string) => {
    if (!Array.isArray(rawMembers)) {
        return false;
    }

    return (rawMembers as TeamMemberJson[]).some(
        (member) => member.studentId === userId && (member.invitationStatus ?? 'PENDING') === 'ACCEPTED',
    );
};

export async function PATCH(request: Request, { params }: Params) {
    try {
        const actorUserId = getActorUserId(request);
        const actorRole = getActorRole(request);

        if (!actorUserId || !actorRole) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!canRespondInvitation(actorRole)) {
            return NextResponse.json(
                { success: false, error: 'Bạn không có quyền xác nhận lời mời này.' },
                { status: 403 },
            );
        }

        const { registrationId } = await params;
        const body: unknown = await request.json();
        const parsed = respondTeamInvitationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
                { status: 400 },
            );
        }

        const registration = await prisma.projectRegistration.findUnique({
            where: { id: registrationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!registration) {
            return NextResponse.json({ success: false, error: 'Không tìm thấy đăng ký đề tài.' }, { status: 404 });
        }

        if (registration.status === 'CANCELED') {
            return NextResponse.json({ success: false, error: 'Đề tài đã bị hủy, không thể xác nhận.' }, { status: 409 });
        }

        const currentMembers = Array.isArray(registration.teamMembers)
            ? (registration.teamMembers as unknown as TeamMemberJson[])
            : [];

        const targetIndex = currentMembers.findIndex((member) => member.studentId === actorUserId);
        if (targetIndex < 0) {
            return NextResponse.json({ success: false, error: 'Bạn không nằm trong danh sách thành viên.' }, { status: 404 });
        }

        const now = new Date();
        const nowIso = now.toISOString();

        if (isExpiredPendingInvitation(currentMembers[targetIndex], registration.createdAt, now)) {
            const expiredMembers = currentMembers.map((member, index) =>
                index === targetIndex
                    ? {
                          ...member,
                          invitationStatus: 'CANCELED' as const,
                          respondedAt: member.respondedAt ?? nowIso,
                      }
                    : member,
            );

            await prisma.projectRegistration.update({
                where: { id: registrationId },
                data: {
                    teamMembers: expiredMembers,
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'Lời mời đã hết hạn sau 1 ngày và đã được tự động hủy.',
                },
                { status: 409 },
            );
        }

        const currentStatus = currentMembers[targetIndex].invitationStatus ?? 'PENDING';

        if (currentStatus === 'CANCELED') {
            return NextResponse.json(
                { success: false, error: 'Lời mời này đã bị hủy tự động do quá thời hạn phản hồi.' },
                { status: 409 },
            );
        }

        if (parsed.data.decision === 'PENDING') {
            if (currentStatus === 'PENDING') {
                return NextResponse.json({ success: false, error: 'Lời mời hiện đã ở trạng thái chờ xác nhận.' }, { status: 409 });
            }
        } else if (currentStatus !== 'PENDING') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Vui lòng hủy xác nhận hiện tại trước khi chọn trạng thái mới.',
                },
                { status: 409 },
            );
        }

        if (parsed.data.decision === 'ACCEPTED') {
            const ownRegistrationInRound = await prisma.projectRegistration.findFirst({
                where: {
                    callRoundId: registration.callRoundId,
                    userId: actorUserId,
                    status: { not: 'CANCELED' },
                },
                select: { id: true },
            });

            if (ownRegistrationInRound && ownRegistrationInRound.id !== registration.id) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Bạn đã có đề tài trong đợt đăng ký này, không thể nhận thêm lời mời nhóm khác.',
                    },
                    { status: 409 },
                );
            }

            const registrationsInRound = await prisma.projectRegistration.findMany({
                where: {
                    callRoundId: registration.callRoundId,
                    status: { not: 'CANCELED' },
                    id: { not: registration.id },
                },
                select: {
                    id: true,
                    teamMembers: true,
                },
            });

            const acceptedElsewhere = registrationsInRound.some((item) =>
                hasAcceptedMembership(item.teamMembers, actorUserId),
            );

            if (acceptedElsewhere) {
                return NextResponse.json(
                    {
                        success: false,
                        error:
                            'Bạn đã tham gia một đề tài khác trong cùng đợt đăng ký, không thể nhận thêm lời mời này.',
                    },
                    { status: 409 },
                );
            }
        }

        const actorUser = await prisma.user.findUnique({
            where: { id: actorUserId },
            select: { name: true },
        });

        const updatedMembers = currentMembers.map((member, index) =>
            index === targetIndex
                ? {
                      ...member,
                      invitationStatus: parsed.data.decision,
                      respondedAt: parsed.data.decision === 'PENDING' ? null : nowIso,
                  }
                : member,
        );

        const updated = await prisma.projectRegistration.update({
            where: { id: registrationId },
            data: {
                teamMembers: updatedMembers,
            },
        });

        const detailedRegistration = await prisma.projectRegistration.findUnique({
            where: { id: registrationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        code: true,
                    },
                },
                instructor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                callRound: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!detailedRegistration) {
            return NextResponse.json({ success: false, error: 'Không tìm thấy đăng ký đề tài.' }, { status: 404 });
        }

        const notificationActionText =
            parsed.data.decision === 'ACCEPTED'
                ? 'đồng ý'
                : parsed.data.decision === 'REJECTED'
                  ? 'từ chối'
                  : 'hủy xác nhận';

        await createNotification({
            userId: registration.userId,
            type: 'REGISTRATION_STATUS_CHANGE',
            title: `Thành viên đã ${notificationActionText} lời mời`,
            message: `${actorUser?.name ?? 'Thành viên'} trong đề tài "${registration.title}" đã ${notificationActionText} tham gia nhóm.`,
            link: '/student/projects',
            metadata: {
                registrationId,
                memberUserId: actorUserId,
                decision: parsed.data.decision,
            },
        });

        const targetMember = updatedMembers[targetIndex];

        return NextResponse.json({
            success: true,
            data: {
                registrationId: detailedRegistration.id,
                registrationTitle: detailedRegistration.title,
                registrationObjective: detailedRegistration.objective,
                registrationExpectedOutput: detailedRegistration.expectedOutput,
                registrationStatus: detailedRegistration.status,
                instructorStatus: detailedRegistration.instructorStatus,
                facultyStatus: detailedRegistration.facultyStatus,
                inviterId: registration.userId,
                inviterName: registration.user.name,
                inviterEmail: detailedRegistration.user.email,
                inviterCode: detailedRegistration.user.code,
                role: targetMember.role,
                invitationStatus: targetMember.invitationStatus ?? 'PENDING',
                instructorId: detailedRegistration.instructorId,
                instructorName: detailedRegistration.instructor?.name ?? null,
                instructorEmail: detailedRegistration.instructor?.email ?? null,
                invitedAt: targetMember.invitedAt ?? updated.createdAt,
                respondedAt: targetMember.respondedAt ?? null,
                callRoundId: detailedRegistration.callRoundId,
                callRoundName: detailedRegistration.callRound?.name ?? null,
                teamMembers: updatedMembers.map((member) => ({
                    name: member.name,
                    role: member.role,
                    studentId: member.studentId,
                    invitationStatus: member.invitationStatus ?? 'PENDING',
                    invitedAt: member.invitedAt,
                    respondedAt: member.respondedAt ?? null,
                })),
                createdAt: detailedRegistration.createdAt,
                updatedAt: detailedRegistration.updatedAt,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to respond to invitation',
            },
            { status: 500 },
        );
    }
}
