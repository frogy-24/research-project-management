import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import {
    assignProjectsToCouncilSchema,
    finalizeCouncilAssignmentsSchema,
    unassignProjectsFromCouncilSchema,
    updateCouncilDefenseLocationSchema,
} from '@/types/council-project-assignment.schema';

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
            select: { id: true, approvalStatus: true, isLocked: true },
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
                callRound: {
                    select: {
                        contactInfo: true,
                    },
                },
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
            defenseLocation: council.callRound.contactInfo,
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

        return NextResponse.json({ councils: normalizedCouncils, approvedProjects, isFinalized: callRound.isLocked });
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
            return NextResponse.json(
                { error: 'Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.' },
                { status: 400 },
            );
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
            return NextResponse.json(
                { error: 'Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.' },
                { status: 400 },
            );
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

        if (typeof body === 'object' && body !== null && 'defenseLocation' in body) {
            const updateParsed = updateCouncilDefenseLocationSchema.safeParse(body);

            if (!updateParsed.success) {
                return NextResponse.json(
                    { error: 'Invalid payload', fields: updateParsed.error.flatten().fieldErrors },
                    { status: 400 },
                );
            }

            const { callRoundId, defenseLocation } = updateParsed.data;

            const callRound = await prisma.callRound.findUnique({
                where: { id: callRoundId },
                select: { id: true, approvalStatus: true },
            });

            if (!callRound) {
                return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
            }

            if (callRound.approvalStatus !== 'APPROVED') {
                return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
            }

            const normalizedLocation = defenseLocation?.trim();

            await prisma.callRound.update({
                where: { id: callRoundId },
                data: {
                    contactInfo: normalizedLocation && normalizedLocation.length > 0 ? normalizedLocation : null,
                },
            });

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

        const totalApprovedProjects = await prisma.projectRegistration.count({
            where: {
                callRoundId,
                facultyStatus: 'APPROVED',
            },
        });

        const assignedProjects = await prisma.projectCouncilAssignment.count({
            where: {
                council: { callRoundId },
            },
        });

        if (totalApprovedProjects !== assignedProjects) {
            return NextResponse.json(
                { error: 'Vui lòng gán đủ tất cả đề tài đã duyệt trước khi hoàn tất.' },
                { status: 400 },
            );
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
