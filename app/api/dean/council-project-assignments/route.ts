import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import {
    assignProjectsToCouncilSchema,
    finalizeCouncilAssignmentsSchema,
    unassignProjectsFromCouncilSchema,
    updateCouncilDefenseLocationSchema,
} from '@/types/council-project-assignment.schema';
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

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const callRoundId = request.nextUrl.searchParams.get('callRoundId');
        if (!callRoundId) {
            return NextResponse.json({ error: 'callRoundId is required' }, { status: 400 });
        }

        const callRound = await prisma.callRound.findUnique({
            where: { id: callRoundId },
            select: { id: true, approvalStatus: true, isLocked: true, defenseDate: true, contactInfo: true },
        });

        if (!callRound) {
            return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
        }

        if (callRound.approvalStatus !== 'APPROVED') {
            return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
        }

        const councils = await prisma.council.findMany({
            where: { callRoundId },
            select: {
                id: true,
                name: true,
                description: true,
                defenseDate: true,
                defenseLocation: true,
                _count: {
                    select: {
                        members: true,
                        projects: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        const normalizedCouncils = councils.map((council) => ({
            id: council.id,
            name: council.name,
            description: council.description,
            defenseDate: council.defenseDate ?? callRound.defenseDate,
            defenseLocation: council.defenseLocation ?? callRound.contactInfo,
            _count: council._count,
        }));

        const approvedProjects = await prisma.projectRegistration.findMany({
            where: {
                callRoundId,
                facultyStatus: 'APPROVED',
            },
            select: {
                id: true,
                title: true,
                objective: true,
                facultyStatus: true,
                instructorStatus: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                councilAssignment: {
                    select: {
                        id: true,
                        councilId: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
            callRound: {
                id: callRound.id,
                defenseDate: callRound.defenseDate,
                defenseLocation: callRound.contactInfo,
            },
            councils: normalizedCouncils,
            approvedProjects,
            isFinalized: callRound.isLocked,
        });
    } catch (error) {
        console.error('Error fetching council project assignments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = assignProjectsToCouncilSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload', fields: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const { callRoundId, councilId, projectRegistrationIds } = parsed.data;

        const callRound = await prisma.callRound.findUnique({
            where: { id: callRoundId },
            select: { id: true, approvalStatus: true, isLocked: true },
        });

        if (!callRound) {
            return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
        }

        if (callRound.approvalStatus !== 'APPROVED') {
            return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
        }

        if (callRound.isLocked) {
            return NextResponse.json({ error: 'Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.' }, { status: 400 });
        }

        const council = await prisma.council.findUnique({
            where: { id: councilId },
            select: { id: true, callRoundId: true },
        });

        if (!council) {
            return NextResponse.json({ error: 'Council not found' }, { status: 404 });
        }

        if (council.callRoundId !== callRoundId) {
            return NextResponse.json({ error: 'Council does not belong to selected call round' }, { status: 400 });
        }

        const projects = await prisma.projectRegistration.findMany({
            where: {
                id: { in: projectRegistrationIds },
            },
            select: {
                id: true,
                callRoundId: true,
                facultyStatus: true,
                councilAssignment: {
                    select: { councilId: true },
                },
            },
        });

        if (projects.length !== projectRegistrationIds.length) {
            return NextResponse.json({ error: 'Some projects not found' }, { status: 400 });
        }

        const invalid = projects.find(
            (project) =>
                project.callRoundId !== council.callRoundId ||
                project.facultyStatus !== 'APPROVED' ||
                project.councilAssignment,
        );

        if (invalid) {
            return NextResponse.json(
                {
                    error: 'Chỉ có thể gán đề tài đã duyệt, cùng đợt và chưa được gán hội đồng.',
                },
                { status: 400 },
            );
        }

        await prisma.projectCouncilAssignment.createMany({
            data: projectRegistrationIds.map((projectRegistrationId) => ({
                councilId,
                projectRegistrationId,
            })),
            skipDuplicates: true,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error assigning projects to council:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = unassignProjectsFromCouncilSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload', fields: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const { callRoundId, projectRegistrationIds } = parsed.data;

        const callRound = await prisma.callRound.findUnique({
            where: { id: callRoundId },
            select: { id: true, approvalStatus: true, isLocked: true },
        });

        if (!callRound) {
            return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
        }

        if (callRound.approvalStatus !== 'APPROVED') {
            return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
        }

        if (callRound.isLocked) {
            return NextResponse.json({ error: 'Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.' }, { status: 400 });
        }

        await prisma.projectCouncilAssignment.deleteMany({
            where: {
                projectRegistrationId: { in: projectRegistrationIds },
                council: {
                    callRoundId,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unassigning projects from council:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (
            typeof body === 'object' &&
            body !== null &&
            ('defenseLocation' in body || 'defenseDate' in body)
        ) {
            const updateParsed = updateCouncilDefenseLocationSchema.safeParse(body);

            if (!updateParsed.success) {
                return NextResponse.json(
                    { error: 'Invalid payload', fields: updateParsed.error.flatten().fieldErrors },
                    { status: 400 },
                );
            }

            const { callRoundId, councilId, defenseLocation, defenseDate } = updateParsed.data;

            const callRound = await prisma.callRound.findUnique({
                where: { id: callRoundId },
                select: { id: true, approvalStatus: true, isLocked: true, defenseDate: true, contactInfo: true },
            });

            if (!callRound) {
                return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
            }

            if (callRound.approvalStatus !== 'APPROVED') {
                return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
            }

            if (callRound.isLocked) {
                return NextResponse.json({ error: 'Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.' }, { status: 400 });
            }

            const council = await prisma.council.findUnique({
                where: { id: councilId },
                select: { id: true, callRoundId: true, defenseDate: true, defenseLocation: true },
            });

            if (!council) {
                return NextResponse.json({ error: 'Council not found' }, { status: 404 });
            }

            if (council.callRoundId !== callRoundId) {
                return NextResponse.json({ error: 'Council does not belong to selected call round' }, { status: 400 });
            }

            await prisma.council.update({
                where: { id: councilId },
                data: {
                    ...(defenseLocation !== undefined
                        ? {
                              defenseLocation:
                                  defenseLocation && defenseLocation.trim().length > 0
                                      ? defenseLocation.trim()
                                      : null,
                          }
                        : {}),
                    ...(defenseDate !== undefined ? { defenseDate } : {}),
                },
            });

            const assignments = await prisma.projectCouncilAssignment.findMany({
                where: {
                    councilId,
                },
                select: {
                    projectRegistration: {
                        select: {
                            userId: true,
                            teamMembers: true,
                        },
                    },
                },
            });

            const recipientIds = Array.from(
                new Set(
                    assignments.flatMap((assignment) => {
                        const registration = assignment.projectRegistration;
                        return [registration.userId, ...extractTeamMemberUserIds(registration.teamMembers)];
                    }),
                ),
            );

            if (recipientIds.length > 0) {
                const targetDate = defenseDate ?? council.defenseDate ?? callRound.defenseDate;
                const normalizedLocation =
                    defenseLocation !== undefined
                        ? defenseLocation && defenseLocation.trim().length > 0
                            ? defenseLocation.trim()
                            : null
                        : (council.defenseLocation ?? callRound.contactInfo);

                const formattedDate = targetDate
                    ? new Intl.DateTimeFormat('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                      }).format(targetDate)
                    : 'chưa cập nhật';

                await prisma.notification.createMany({
                    data: recipientIds.map((userId) => ({
                        userId,
                        type: 'PROJECT_STATUS_CHANGE',
                        title: 'Cập nhật lịch báo cáo hội đồng',
                        message: `Lịch báo cáo đề tài đã được cập nhật. Ngày báo cáo: ${formattedDate}. Phòng/Nơi báo cáo: ${normalizedLocation || 'chưa cập nhật'}.`,
                        link: '/student/meetings',
                        metadata: {
                            kind: 'COUNCIL_REPORT_SCHEDULE',
                            callRoundId,
                            councilId,
                            defenseDate: targetDate ? targetDate.toISOString() : null,
                            defenseLocation: normalizedLocation,
                        },
                    })),
                });
            }

            return NextResponse.json({ success: true });
        }

        const parsed = finalizeCouncilAssignmentsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload', fields: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const { callRoundId } = parsed.data;

        const callRound = await prisma.callRound.findUnique({
            where: { id: callRoundId },
            select: { id: true, approvalStatus: true, isLocked: true },
        });

        if (!callRound) {
            return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
        }

        if (callRound.approvalStatus !== 'APPROVED') {
            return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
        }

        if (callRound.isLocked) {
            return NextResponse.json({ success: true });
        }

        await prisma.callRound.update({
            where: { id: callRoundId },
            data: { isLocked: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error finalizing council project assignments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
