import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';

const teamMemberArraySchema = registrationTeamMemberSchema.array();

const parseTeamMembers = (raw: unknown): Array<{ name: string; studentId?: string }> => {
    const parsed = teamMemberArraySchema.safeParse(raw);
    if (!parsed.success) {
        return [];
    }

    return parsed.data.map((member) => ({
        name: member.name,
        studentId: member.studentId,
    }));
};

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'LECTURER') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const assignments = await prisma.councilMemberAssignment.findMany({
            where: {
                councilMemberId: user.userId,
                council: {
                    callRound: {
                        isLocked: true,
                    },
                },
            },
            include: {
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
                        projects: {
                            include: {
                                projectRegistration: {
                                    select: {
                                        id: true,
                                        title: true,
                                        teamMembers: true,
                                        instructor: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                code: true,
                                                phone: true,
                                            },
                                        },
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                code: true,
                                            },
                                        },
                                    },
                                },
                            },
                            orderBy: {
                                createdAt: 'desc',
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
            assignmentId: assignment.id,
            role: assignment.role,
            joinedAt: assignment.createdAt,
            council: {
                id: assignment.council.id,
                name: assignment.council.name,
                description: assignment.council.description,
                callRoundId: assignment.council.callRoundId,
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
                projects: assignment.council.projects.map((projectItem) => ({
                    id: projectItem.projectRegistration.id,
                    title: projectItem.projectRegistration.title,
                    advisor: projectItem.projectRegistration.instructor
                        ? {
                              id: projectItem.projectRegistration.instructor.id,
                              name: projectItem.projectRegistration.instructor.name,
                              email: projectItem.projectRegistration.instructor.email,
                              code: projectItem.projectRegistration.instructor.code,
                              phone: projectItem.projectRegistration.instructor.phone,
                          }
                        : null,
                    students: [
                        {
                            id: projectItem.projectRegistration.user.id,
                            name: projectItem.projectRegistration.user.name,
                            email: projectItem.projectRegistration.user.email,
                            code: projectItem.projectRegistration.user.code,
                            roleLabel: 'Trưởng nhóm',
                        },
                        ...parseTeamMembers(projectItem.projectRegistration.teamMembers)
                            .filter((member) => member.studentId !== projectItem.projectRegistration.user.id)
                            .map((member, index) => ({
                                id: member.studentId ?? `${projectItem.projectRegistration.id}-member-${index}`,
                                name: member.name,
                                email: null,
                                code: null,
                                roleLabel: 'Thành viên',
                            })),
                    ],
                })),
            },
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching lecturer councils:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch lecturer councils' }, { status: 500 });
    }
}
