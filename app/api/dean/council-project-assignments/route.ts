import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { assignProjectsToCouncilSchema } from '@/types/council-project-assignment.schema';

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
            select: { id: true, approvalStatus: true },
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
                _count: {
                    select: {
                        members: true,
                        projects: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

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

        return NextResponse.json({ councils, approvedProjects });
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
            select: { id: true, approvalStatus: true },
        });

        if (!callRound) {
            return NextResponse.json({ error: 'Call round not found' }, { status: 404 });
        }

        if (callRound.approvalStatus !== 'APPROVED') {
            return NextResponse.json({ error: 'Call round must be APPROVED' }, { status: 400 });
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
