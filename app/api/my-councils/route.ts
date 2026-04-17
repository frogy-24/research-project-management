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

        const registrationIds = assignments.map((assignment) => assignment.projectRegistration.id);

        const projects = await prisma.project.findMany({
            where: {
                leader: {
                    registrations: {
                        some: {
                            id: { in: registrationIds },
                        },
                    },
                },
            },
            select: {
                id: true,
                leader: {
                    select: {
                        registrations: {
                            where: {
                                id: { in: registrationIds },
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        const registrationToProjectMap = new Map<string, string>();
        projects.forEach((project) => {
            project.leader.registrations.forEach((registration) => {
                registrationToProjectMap.set(registration.id, project.id);
            });
        });

        const projectIds = Array.from(registrationToProjectMap.values());

        const evaluations = await prisma.councilEvaluation.findMany({
            where: {
                projectId: { in: projectIds },
            },
            include: {
                councilMember: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        code: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                evaluatedAt: 'desc',
            },
        });

        const evaluationMap = new Map<string, typeof evaluations>();
        evaluations.forEach((evaluation) => {
            const existing = evaluationMap.get(evaluation.projectId) ?? [];
            existing.push(evaluation);
            evaluationMap.set(evaluation.projectId, existing);
        });

        const data = assignments.map((assignment) => ({
            projectAssignmentId: assignment.id,
            projectRegistrationId: assignment.projectRegistration.id,
            projectId: registrationToProjectMap.get(assignment.projectRegistration.id) ?? null,
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
                defenseDate:
                    assignment.council.defenseDate ??
                    assignment.council.callRound.reviewDeadline ??
                    assignment.council.callRound.projectEndDate,
                defenseLocation: assignment.council.defenseLocation ?? assignment.council.callRound.contactInfo,
                memberCount: assignment.council._count.members,
                projectCount: assignment.council._count.projects,
                members: assignment.council.members.map((member) => ({
                    id: member.councilMember.id,
                    name: member.councilMember.name,
                    email: member.councilMember.email,
                    code: member.councilMember.code,
                    role: member.role,
                })),
                evaluations: evaluationMap
                    .get(registrationToProjectMap.get(assignment.projectRegistration.id) ?? '')
                    ?.map((evaluation) => ({
                        id: evaluation.id,
                        projectId: evaluation.projectId,
                        councilMemberId: evaluation.councilMemberId,
                        score: evaluation.score,
                        decision: evaluation.decision,
                        comment: evaluation.comment,
                        evaluatedAt: evaluation.evaluatedAt,
                        councilMember: {
                            id: evaluation.councilMember.id,
                            name: evaluation.councilMember.name,
                            email: evaluation.councilMember.email,
                            code: evaluation.councilMember.code,
                            role: evaluation.councilMember.role,
                        },
                    })) ?? [],
                averageScore: (() => {
                    const projectId = registrationToProjectMap.get(assignment.projectRegistration.id);
                    const projectEvaluations = projectId ? evaluationMap.get(projectId) ?? [] : [];
                    if (projectEvaluations.length === 0) {
                        return null;
                    }

                    const total = projectEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
                    return total / projectEvaluations.length;
                })(),
            },
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching student councils:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch student councils' }, { status: 500 });
    }
}
