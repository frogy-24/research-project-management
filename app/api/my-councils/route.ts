import { NextResponse } from 'next/server';
import type { Prisma } from '@/prisma/generated/prisma';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';

const canViewMyCouncils = (role: string) => role === 'STUDENT';

export async function GET(request: Request) {
    try {
        const actorUserId = getActorUserId(request);
        const actorRole = getActorRole(request);

        if (!actorUserId || !actorRole) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!canViewMyCouncils(actorRole)) {
            return NextResponse.json({ success: false, error: 'Bạn không có quyền xem hội đồng.' }, { status: 403 });
        }

        const acceptedTeamMemberFilter = [
            {
                studentId: actorUserId,
                invitationStatus: 'ACCEPTED',
            },
        ] as Prisma.InputJsonValue;

        const assignments = await prisma.projectCouncilAssignment.findMany({
            where: {
                council: {
                    callRound: {
                        isLocked: true,
                    },
                },
                projectRegistration: {
                    status: { not: 'CANCELED' },
                    OR: [
                        { userId: actorUserId },
                        {
                            teamMembers: {
                                array_contains: acceptedTeamMemberFilter,
                            },
                        },
                    ],
                },
            },
            include: {
                projectRegistration: {
                    select: {
                        id: true,
                        title: true,
                        userId: true,
                    },
                },
                council: {
                    include: {
                        callRound: {
                            select: {
                                id: true,
                                name: true,
                                reviewDeadline: true,
                                projectEndDate: true,
                                contactInfo: true,
                            },
                        },
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
                            orderBy: {
                                createdAt: 'asc',
                            },
                        },
                        _count: {
                            select: {
                                members: true,
                                projects: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const data = assignments.map((assignment) => ({
            projectAssignmentId: assignment.id,
            projectRegistrationId: assignment.projectRegistration.id,
            projectTitle: assignment.projectRegistration.title,
            participationRole:
                assignment.projectRegistration.userId === actorUserId ? ('OWNER' as const) : ('TEAM_MEMBER' as const),
            assignedAt: assignment.createdAt,
            council: {
                id: assignment.council.id,
                name: assignment.council.name,
                description: assignment.council.description,
                callRoundId: assignment.council.callRound.id,
                callRoundName: assignment.council.callRound.name,
                defenseDate: assignment.council.callRound.reviewDeadline ?? assignment.council.callRound.projectEndDate,
                defenseLocation: assignment.council.callRound.contactInfo,
                memberCount: assignment.council._count.members,
                projectCount: assignment.council._count.projects,
                members: assignment.council.members.map((member) => ({
                    id: member.councilMember.id,
                    name: member.councilMember.name,
                    email: member.councilMember.email,
                    code: member.councilMember.code,
                    role: member.role,
                })),
            },
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching student councils:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch student councils' }, { status: 500 });
    }
}
