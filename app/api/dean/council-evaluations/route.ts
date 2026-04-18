import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

type ProjectCouncilContext = {
    callRoundId: string;
    callRoundName: string;
    councilId: string;
    councilName: string;
    projectRegistrationId: string;
    projectRegistrationTitle: string;
    defenseDate: Date | null;
    defenseLocation: string | null;
    studentName: string;
    studentCode: string | null;
    studentEmail: string;
    studentClassName: string | null;
    advisorName: string | null;
    advisorCode: string | null;
    advisorEmail: string | null;
};

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const callRoundId = request.nextUrl.searchParams.get('callRoundId');

        const callRounds = await prisma.callRound.findMany({
            where: {
                createdById: session.userId,
                ...(callRoundId ? { id: callRoundId } : {}),
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (callRounds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    summary: {
                        totalEvaluations: 0,
                        totalProjects: 0,
                        averageScore: null,
                    },
                    items: [],
                },
            });
        }

        const callRoundIds = callRounds.map((round) => round.id);

        const projectAssignments = await prisma.projectCouncilAssignment.findMany({
            where: {
                council: {
                    callRoundId: {
                        in: callRoundIds,
                    },
                },
            },
            select: {
                projectRegistrationId: true,
                projectRegistration: {
                    select: {
                        id: true,
                        title: true,
                        instructor: {
                            select: {
                                name: true,
                                code: true,
                                email: true,
                            },
                        },
                        user: {
                            select: {
                                name: true,
                                code: true,
                                email: true,
                                class: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                council: {
                    select: {
                        id: true,
                        name: true,
                        defenseDate: true,
                        defenseLocation: true,
                        callRoundId: true,
                        callRound: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        const registrationContextMap = new Map<string, ProjectCouncilContext>();
        projectAssignments.forEach((assignment) => {
            registrationContextMap.set(assignment.projectRegistrationId, {
                callRoundId: assignment.council.callRoundId,
                callRoundName: assignment.council.callRound.name,
                councilId: assignment.council.id,
                councilName: assignment.council.name,
                projectRegistrationId: assignment.projectRegistration.id,
                projectRegistrationTitle: assignment.projectRegistration.title,
                defenseDate: assignment.council.defenseDate,
                defenseLocation: assignment.council.defenseLocation,
                studentName: assignment.projectRegistration.user.name,
                studentCode: assignment.projectRegistration.user.code,
                studentEmail: assignment.projectRegistration.user.email,
                studentClassName: assignment.projectRegistration.user.class?.name ?? null,
                advisorName: assignment.projectRegistration.instructor?.name ?? null,
                advisorCode: assignment.projectRegistration.instructor?.code ?? null,
                advisorEmail: assignment.projectRegistration.instructor?.email ?? null,
            });
        });

        const registrationIds = Array.from(registrationContextMap.keys());
        if (registrationIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    summary: {
                        totalEvaluations: 0,
                        totalProjects: 0,
                        averageScore: null,
                    },
                    items: [],
                },
            });
        }

        const projects = await prisma.project.findMany({
            where: {
                leader: {
                    registrations: {
                        some: {
                            id: {
                                in: registrationIds,
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                leader: {
                    select: {
                        registrations: {
                            where: {
                                id: {
                                    in: registrationIds,
                                },
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        const projectContextMap = new Map<string, ProjectCouncilContext & { projectTitle: string }>();
        projects.forEach((project) => {
            const matchedContext = project.leader.registrations
                .map((registration) => registrationContextMap.get(registration.id))
                .find((context): context is ProjectCouncilContext => Boolean(context));

            if (!matchedContext) {
                return;
            }

            projectContextMap.set(project.id, {
                ...matchedContext,
                projectTitle: project.title,
            });
        });

        const projectIds = Array.from(projectContextMap.keys());
        if (projectIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    summary: {
                        totalEvaluations: 0,
                        totalProjects: 0,
                        averageScore: null,
                    },
                    items: [],
                },
            });
        }

        const evaluations = await prisma.councilEvaluation.findMany({
            where: {
                projectId: {
                    in: projectIds,
                },
            },
            include: {
                councilMember: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                evaluatedAt: 'desc',
            },
        });

        const items = evaluations
            .map((evaluation) => {
                const context = projectContextMap.get(evaluation.projectId);
                if (!context) {
                    return null;
                }

                return {
                    id: evaluation.id,
                    callRoundId: context.callRoundId,
                    callRoundName: context.callRoundName,
                    councilId: context.councilId,
                    councilName: context.councilName,
                    projectId: evaluation.projectId,
                    projectTitle: context.projectTitle,
                    projectRegistrationId: context.projectRegistrationId,
                    projectRegistrationTitle: context.projectRegistrationTitle,
                    defenseDate: context.defenseDate,
                    defenseLocation: context.defenseLocation,
                    student: {
                        name: context.studentName,
                        code: context.studentCode,
                        email: context.studentEmail,
                        className: context.studentClassName,
                    },
                    advisor: {
                        name: context.advisorName,
                        code: context.advisorCode,
                        email: context.advisorEmail,
                    },
                    evaluator: {
                        id: evaluation.councilMember.id,
                        name: evaluation.councilMember.name,
                        code: evaluation.councilMember.code,
                        email: evaluation.councilMember.email,
                    },
                    score: evaluation.score,
                    decision: evaluation.decision,
                    comment: evaluation.comment,
                    evaluatedAt: evaluation.evaluatedAt,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        const uniqueProjectIds = new Set(items.map((item) => item.projectId));
        const totalEvaluations = items.length;
        const averageScore =
            totalEvaluations > 0
                ? Number((items.reduce((sum, item) => sum + item.score, 0) / totalEvaluations).toFixed(2))
                : null;

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalEvaluations,
                    totalProjects: uniqueProjectIds.size,
                    averageScore,
                },
                items,
            },
        });
    } catch (error) {
        console.error('Error fetching dean council evaluations:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch council evaluations' }, { status: 500 });
    }
}
