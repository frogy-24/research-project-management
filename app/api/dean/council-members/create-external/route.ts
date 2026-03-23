import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// POST - Tạo thành viên hội đồng thủ công (không thuộc khoa)
export async function POST(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { callRoundId, name, email, phone, organization } = body;

        if (!callRoundId || !name || !email) {
            return NextResponse.json(
                { error: 'callRoundId, name và email là bắt buộc' },
                { status: 400 }
            );
        }

        // Kiểm tra email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Email không hợp lệ' },
                { status: 400 }
            );
        }

        // Kiểm tra xem user với email này đã tồn tại chưa
        let councilMember = await prisma.user.findUnique({
            where: { email },
        });

        if (councilMember) {
            // User đã tồn tại, kiểm tra xem đã trong hội đồng chưa
            const existing = await prisma.callRoundCouncilMember.findFirst({
                where: {
                    callRoundId,
                    councilMemberId: councilMember.id,
                },
            });

            if (existing) {
                return NextResponse.json(
                    { error: 'Thành viên này đã có trong hội đồng' },
                    { status: 400 }
                );
            }

            // Thêm vào hội đồng
            const assignment = await prisma.callRoundCouncilMember.create({
                data: {
                    callRoundId,
                    councilMemberId: councilMember.id,
                },
                include: {
                    councilMember: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            code: true,
                            phone: true,
                        },
                    },
                },
            });

            return NextResponse.json(assignment, { status: 201 });
        }

        // Tạo user mới (external member - không thuộc department)
        councilMember = await prisma.user.create({
            data: {
                email,
                name,
                code: `EXT-${Date.now()}`, // Mã số external member
                phone: phone || null,
                role: 'LECTURER', // Role mặc định
                // departmentId: null - không thuộc khoa nào
            },
        });

        // Thêm vào hội đồng
        const assignment = await prisma.callRoundCouncilMember.create({
            data: {
                callRoundId,
                councilMemberId: councilMember.id,
            },
            include: {
                councilMember: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        code: true,
                        phone: true,
                    },
                },
            },
        });

        return NextResponse.json(assignment, { status: 201 });
    } catch (error) {
        console.error('Error creating external council member:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
