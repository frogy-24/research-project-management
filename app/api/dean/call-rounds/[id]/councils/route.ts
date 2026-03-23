import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// GET /api/dean/call-rounds/[id]/councils - Lấy danh sách hội đồng của đợt
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const councils = await prisma.council.findMany({
            where: { callRoundId: id },
            include: {
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
                },
                projects: {
                    where: {
                        projectRegistration: {
                            facultyStatus: 'APPROVED', // Chỉ hiển thị đề tài đã được phê duyệt
                        },
                    },
                    include: {
                        projectRegistration: {
                            select: {
                                id: true,
                                title: true,
                                objective: true,
                                status: true,
                                facultyStatus: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
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

        return NextResponse.json(councils);
    } catch (error) {
        console.error('Error fetching councils:', error);
        return NextResponse.json({ error: 'Failed to fetch councils' }, { status: 500 });
    }
}

// POST /api/dean/call-rounds/[id]/councils/auto-divide - Tự động chia hội đồng
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const body = await request.json();
        const { minProjectsPerCouncil = 5, maxProjectsPerCouncil = 10, clearExisting = false } = body;

        // Xóa hội đồng cũ nếu cần
        if (clearExisting) {
            await prisma.council.deleteMany({
                where: { callRoundId: id },
            });
        }

        // Lấy danh sách đề tài đã được duyệt
        const approvedProjects = await prisma.projectRegistration.findMany({
            where: {
                callRoundId: id,
                facultyStatus: 'APPROVED',
                ...(clearExisting
                    ? {}
                    : {
                          projects: {
                              none: {}, // Chỉ lấy đề tài chưa được phân vào hội đồng
                          },
                      }),
            },
            orderBy: { createdAt: 'asc' },
        });

        if (approvedProjects.length === 0) {
            return NextResponse.json({ error: 'No approved projects to assign' }, { status: 400 });
        }

        // Lấy danh sách thành viên hội đồng
        const councilMembers = await prisma.callRoundCouncilMember.findMany({
            where: { callRoundId: id },
            include: {
                councilMember: true,
            },
        });

        if (councilMembers.length === 0) {
            return NextResponse.json({ error: 'No council members assigned to this call round' }, { status: 400 });
        }

        // Tính số lượng hội đồng cần tạo
        const totalProjects = approvedProjects.length;
        const avgProjectsPerCouncil = Math.ceil((minProjectsPerCouncil + maxProjectsPerCouncil) / 2);
        const numCouncils = Math.ceil(totalProjects / avgProjectsPerCouncil);

        // Tính số đề tài mỗi hội đồng
        const projectsPerCouncil = Math.ceil(totalProjects / numCouncils);

        // Tạo hội đồng và phân công
        const councils = [];
        for (let i = 0; i < numCouncils; i++) {
            const startIdx = i * projectsPerCouncil;
            const endIdx = Math.min(startIdx + projectsPerCouncil, totalProjects);
            const councilProjects = approvedProjects.slice(startIdx, endIdx);

            if (councilProjects.length === 0) continue;

            // Tạo hội đồng
            const council = await prisma.council.create({
                data: {
                    callRoundId: id,
                    name: `Hội đồng ${i + 1}`,
                    description: `Hội đồng đánh giá gồm ${councilProjects.length} đề tài`,
                },
            });

            // Phân công thành viên vào hội đồng (phân đều)
            const membersPerCouncil = Math.floor(councilMembers.length / numCouncils);
            const startMemberIdx = i * membersPerCouncil;
            const endMemberIdx = i === numCouncils - 1 ? councilMembers.length : startMemberIdx + membersPerCouncil;
            const assignedMembers = councilMembers.slice(startMemberIdx, endMemberIdx);

            // Tạo phân công thành viên
            for (let j = 0; j < assignedMembers.length; j++) {
                const member = assignedMembers[j];
                let role = 'Ủy viên';
                if (j === 0) role = 'Chủ tịch';
                else if (j === 1) role = 'Thư ký';

                await prisma.councilMemberAssignment.create({
                    data: {
                        councilId: council.id,
                        councilMemberId: member.councilMemberId,
                        role,
                    },
                });
            }

            // Phân công đề tài vào hội đồng
            for (const project of councilProjects) {
                await prisma.projectCouncilAssignment.create({
                    data: {
                        councilId: council.id,
                        projectRegistrationId: project.id,
                    },
                });
            }

            councils.push({
                ...council,
                projectCount: councilProjects.length,
                memberCount: assignedMembers.length,
            });
        }

        return NextResponse.json({
            success: true,
            councils,
            totalProjects,
            totalCouncils: numCouncils,
        });
    } catch (error) {
        console.error('Error auto-dividing councils:', error);
        return NextResponse.json({ error: 'Failed to auto-divide councils' }, { status: 500 });
    }
}
