import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import type { Prisma } from '@/prisma/generated/prisma';

type TeamMemberJson = {
    name: string;
    role: string;
    studentId?: string;
    invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    invitedAt?: string | Date;
    respondedAt?: string | Date | null;
};

const canViewInvitations = (role: string) => role === 'STUDENT';

export async function GET(request: Request) {
    try {
        const actorUserId = getActorUserId(request);
        const actorRole = getActorRole(request);

        if (!actorUserId || !actorRole) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!canViewInvitations(actorRole)) {
            return NextResponse.json(
                { success: false, error: 'Bạn không có quyền xem lời mời thành viên.' },
                { status: 403 },
            );
        }

        const registrations = await prisma.projectRegistration.findMany({
            where: {
                status: { not: 'CANCELED' },
                teamMembers: {
                    array_contains: [{ studentId: actorUserId }] as Prisma.InputJsonValue,
                },
            },
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
            orderBy: {
                createdAt: 'desc',
            },
        });

        const invitations = registrations
            .map((registration) => {
                const members = Array.isArray(registration.teamMembers)
                    ? (registration.teamMembers as unknown as TeamMemberJson[])
                    : [];

                const matchedMember = members.find((member) => member.studentId === actorUserId);
                if (!matchedMember) {
                    return null;
                }

                return {
                    registrationId: registration.id,
                    registrationTitle: registration.title,
                    registrationObjective: registration.objective,
                    registrationExpectedOutput: registration.expectedOutput,
                    registrationStatus: registration.status,
                    instructorStatus: registration.instructorStatus,
                    facultyStatus: registration.facultyStatus,
                    inviterId: registration.userId,
                    inviterName: registration.user.name,
                    inviterEmail: registration.user.email,
                    inviterCode: registration.user.code,
                    role: matchedMember.role,
                    invitationStatus: matchedMember.invitationStatus ?? 'PENDING',
                    instructorId: registration.instructorId,
                    instructorName: registration.instructor?.name ?? null,
                    instructorEmail: registration.instructor?.email ?? null,
                    invitedAt: matchedMember.invitedAt ?? registration.createdAt,
                    respondedAt: matchedMember.respondedAt ?? null,
                    callRoundId: registration.callRoundId,
                    callRoundName: registration.callRound?.name ?? null,
                    teamMembers: members.map((member) => ({
                        name: member.name,
                        role: member.role,
                        studentId: member.studentId,
                        invitationStatus: member.invitationStatus ?? 'PENDING',
                        invitedAt: member.invitedAt,
                        respondedAt: member.respondedAt ?? null,
                    })),
                    createdAt: registration.createdAt,
                    updatedAt: registration.updatedAt,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime());

        return NextResponse.json({ success: true, data: invitations });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch team invitations',
            },
            { status: 500 },
        );
    }
}
