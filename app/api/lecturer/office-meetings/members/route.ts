import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';

type TeamMemberWithMeta = {
    studentId: string;
    invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
};

const teamMemberArraySchema = registrationTeamMemberSchema.array();

const parseTeamMembers = (raw: unknown): TeamMemberWithMeta[] => {
    const parsed = teamMemberArraySchema.safeParse(raw);
    if (!parsed.success) {
        return [];
    }

    return parsed.data
        .filter((member) => typeof member.studentId === 'string' && member.studentId.length > 0)
        .map((member) => ({
            studentId: member.studentId as string,
            invitationStatus: member.invitationStatus,
        }));
};

export async function GET(request: Request) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'LECTURER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                instructorId: session.userId,
            },
            select: {
                id: true,
                title: true,
                leaderId: true,
                callRoundId: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: 'Không tìm thấy đề tài hoặc không có quyền truy cập' }, { status: 404 });
        }

        const registration = await prisma.projectRegistration.findFirst({
            where: {
                userId: project.leaderId,
                instructorId: session.userId,
                title: project.title,
                ...(project.callRoundId ? { callRoundId: project.callRoundId } : {}),
            },
            select: {
                teamMembers: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        const parsedTeamMembers = parseTeamMembers(registration?.teamMembers);
        const candidateIds = Array.from(new Set([project.leaderId, ...parsedTeamMembers.map((member) => member.studentId)]));

        const users = await prisma.user.findMany({
            where: {
                id: { in: candidateIds },
            },
            select: {
                id: true,
                name: true,
                email: true,
                code: true,
            },
        });

        const invitationStatusByUserId = new Map(parsedTeamMembers.map((member) => [member.studentId, member.invitationStatus]));
        const usersById = new Map(users.map((user) => [user.id, user]));

        const orderedMembers = candidateIds
            .map((id) => usersById.get(id))
            .filter((user): user is NonNullable<typeof user> => Boolean(user))
            .map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                code: user.code,
                roleLabel: user.id === project.leaderId ? 'Trưởng nhóm' : 'Thành viên',
                isLeader: user.id === project.leaderId,
                invitationStatus: invitationStatusByUserId.get(user.id),
            }));

        return NextResponse.json({
            success: true,
            data: orderedMembers,
        });
    } catch (error) {
        console.error('Error loading office meeting members:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
