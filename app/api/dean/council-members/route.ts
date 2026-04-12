import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// GET - Lấy danh sách thành viên hội đồng theo call round (with pagination)
export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const callRoundId = searchParams.get('callRoundId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!callRoundId) {
            return NextResponse.json({ error: 'callRoundId is required' }, { status: 400 });
        }

        // Calculate skip
        const skip = (page - 1) * limit;

        // Get total count
        const total = await prisma.callRoundCouncilMember.count({
            where: {
                callRoundId,
                invitationStatus: 'ACCEPTED',
            },
        });

        // Get paginated data
        const councilMembers = await prisma.callRoundCouncilMember.findMany({
            where: {
                callRoundId,
                invitationStatus: 'ACCEPTED',
            },
            include: {
                councilMember: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        code: true,
                        majorId: true,
                        major: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            skip,
            take: limit,
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            data: councilMembers,
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching council members:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Thêm thành viên vào hội đồng
export async function POST(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { callRoundId, councilMemberId } = body;

        if (!callRoundId || !councilMemberId) {
            return NextResponse.json({ error: 'callRoundId and councilMemberId are required' }, { status: 400 });
        }

        // Check nếu đã tồn tại
        const existing = await prisma.callRoundCouncilMember.findFirst({
            where: { callRoundId, councilMemberId },
        });

        if (existing) {
            if (existing.invitationStatus === 'ACCEPTED') {
                return NextResponse.json({ error: 'Member already in council' }, { status: 400 });
            }

            const updated = await prisma.callRoundCouncilMember.update({
                where: { id: existing.id },
                data: {
                    invitationStatus: 'ACCEPTED',
                    respondedAt: new Date(),
                },
                include: {
                    councilMember: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            code: true,
                            majorId: true,
                            major: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            return NextResponse.json(updated);
        }

        const councilMember = await prisma.callRoundCouncilMember.create({
            data: {
                callRoundId,
                councilMemberId,
                invitationStatus: 'ACCEPTED',
                respondedAt: new Date(),
            },
            include: {
                councilMember: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        code: true,
                        majorId: true,
                        major: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(councilMember);
    } catch (error) {
        console.error('Error adding council member:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Xóa thành viên khỏi hội đồng
export async function DELETE(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const callRoundId = searchParams.get('callRoundId');
        const councilMemberId = searchParams.get('councilMemberId');

        if (!callRoundId || !councilMemberId) {
            return NextResponse.json({ error: 'callRoundId and councilMemberId are required' }, { status: 400 });
        }

        await prisma.callRoundCouncilMember.deleteMany({
            where: { callRoundId, councilMemberId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing council member:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
