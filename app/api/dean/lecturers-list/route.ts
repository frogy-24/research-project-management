import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

// GET - Lấy danh sách giảng viên trong khoa của Dean
export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Lấy thông tin Dean để biết departmentId
        const dean = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { departmentId: true },
        });

        if (!dean?.departmentId) {
            return NextResponse.json({ error: 'Dean has no department' }, { status: 400 });
        }

        // Lấy tất cả giảng viên (LECTURER) trong cùng khoa
        const lecturers = await prisma.user.findMany({
            where: {
                departmentId: dean.departmentId,
                role: 'LECTURER',
            },
            select: {
                id: true,
                name: true,
                email: true,
                code: true,
                departmentId: true,
                majorId: true,
                major: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ data: lecturers });
    } catch (error) {
        console.error('Error fetching lecturers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
