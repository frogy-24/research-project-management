import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// GET - Lấy danh sách thành viên hội đồng theo call round
export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const callRoundId = searchParams.get('callRoundId');

        if (!callRoundId) {
            return NextResponse.json({ error: 'callRoundId is required' }, { status: 400 });
        }

        const councilMembers = await prisma.callRoundCouncilMember.findMany({
            where: { callRoundId },
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
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ data: councilMembers });
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
            return NextResponse.json({ error: 'Member already in council' }, { status: 400 });
        }

        const councilMember = await prisma.callRoundCouncilMember.create({
            data: {
                callRoundId,
                councilMemberId,
            },
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
