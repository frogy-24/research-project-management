import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAuthUser();

        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: callRoundId } = await params;

        // Get total registrations count
        const totalRegistrations = await prisma.projectRegistration.count({
            where: { callRoundId },
        });

        // Get registrations by status
        const registrationsByStatus = await prisma.projectRegistration.groupBy({
            by: ['status'],
            where: { callRoundId },
            _count: true,
        });

        // Get unique students count
        const uniqueStudents = await prisma.projectRegistration.findMany({
            where: { callRoundId },
            select: { userId: true },
            distinct: ['userId'],
        });

        // Get unique instructors count
        const uniqueInstructors = await prisma.projectRegistration.findMany({
            where: {
                callRoundId,
                instructorId: { not: null },
            },
            select: { instructorId: true },
            distinct: ['instructorId'],
        });

        // Get registrations with instructor status
        const instructorStatusBreakdown = await prisma.projectRegistration.groupBy({
            by: ['instructorStatus'],
            where: {
                callRoundId,
                instructorId: { not: null },
            },
            _count: true,
        });

        // Get registrations with faculty status
        const facultyStatusBreakdown = await prisma.projectRegistration.groupBy({
            by: ['facultyStatus'],
            where: { callRoundId },
            _count: true,
        });

        // Get council members count
        const councilMembersCount = await prisma.callRoundCouncilMember.count({
            where: { callRoundId },
        });

        // Transform status data to easier format
        const statusCounts = registrationsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {} as Record<string, number>);

        const instructorStatusCounts = instructorStatusBreakdown.reduce((acc, item) => {
            acc[item.instructorStatus] = item._count;
            return acc;
        }, {} as Record<string, number>);

        const facultyStatusCounts = facultyStatusBreakdown.reduce((acc, item) => {
            acc[item.facultyStatus] = item._count;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            totalRegistrations,
            totalStudents: uniqueStudents.length,
            totalInstructors: uniqueInstructors.length,
            totalCouncilMembers: councilMembersCount,
            statusBreakdown: {
                pending: statusCounts.PENDING || 0,
                approved: statusCounts.APPROVED || 0,
                rejected: statusCounts.REJECTED || 0,
                canceled: statusCounts.CANCELED || 0,
            },
            instructorStatusBreakdown: {
                pending: instructorStatusCounts.PENDING || 0,
                accepted: instructorStatusCounts.ACCEPTED || 0,
                rejected: instructorStatusCounts.REJECTED || 0,
            },
            facultyStatusBreakdown: {
                pending: facultyStatusCounts.PENDING || 0,
                approved: facultyStatusCounts.APPROVED || 0,
                rejected: facultyStatusCounts.REJECTED || 0,
            },
        });
    } catch (error) {
        console.error('Error fetching call round stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
