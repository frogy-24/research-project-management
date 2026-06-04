import { NextResponse } from 'next/server';
import { updateClassSchema } from '@/types/organization.schema';
import prisma from '@/lib/prisma';
import { getAuthUser, canManageDepartment } from '@/lib/auth-helpers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const classObj = await prisma.class.findUnique({
            where: { id },
            include: {
                major: {
                    include: {
                        department: true,
                    },
                },
            },
        });

        if (!classObj) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        return NextResponse.json(classObj);
    } catch (error) {
        console.error('Error fetching class:', error);
        return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get the class to check its department
        const existingClassForAuth = await prisma.class.findUnique({
            where: { id },
            include: { major: { select: { departmentId: true } } },
        });

        if (!existingClassForAuth) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (!canManageDepartment(authUser, existingClassForAuth.major?.departmentId ?? null)) {
            return NextResponse.json(
                { error: 'Forbidden: You can only manage classes in your department' },
                { status: 403 },
            );
        }

        const body = await request.json();
        const validatedData = updateClassSchema.parse(body);

        // Check for duplicate code/name (excluding self)
        const duplicateClass = await prisma.class.findFirst({
            where: {
                OR: [{ code: validatedData.code }, { name: validatedData.name }],
                id: { not: id },
            },
        });

        if (duplicateClass) {
            return NextResponse.json({ error: 'Mã lớp hoặc tên lớp đã tồn tại' }, { status: 400 });
        }

        // If dean, ensure the new major is still within their department
        if (authUser.role === 'DEAN') {
            const newMajor = await prisma.major.findUnique({
                where: { id: validatedData.majorId },
                select: { departmentId: true },
            });
            if (!newMajor || newMajor.departmentId !== authUser.departmentId) {
                return NextResponse.json(
                    { error: 'Forbidden: Major does not belong to your department' },
                    { status: 403 },
                );
            }
        }

        const major = await prisma.major.findUnique({
            where: { id: validatedData.majorId },
            include: { department: true },
        });

        if (!major) {
            return NextResponse.json({ error: 'Ngành không tồn tại' }, { status: 400 });
        }

        const classObj = await prisma.class.update({
            where: { id },
            data: validatedData,
            include: {
                major: {
                    include: {
                        department: true,
                    },
                },
            },
        });

        return NextResponse.json({ success: true, data: classObj });
    } catch (error) {
        console.error('Error updating class:', error);
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Get the class to check its department
        const existingClassForAuth = await prisma.class.findUnique({
            where: { id },
            include: { major: { select: { departmentId: true } } },
        });

        if (!existingClassForAuth) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (!canManageDepartment(authUser, existingClassForAuth.major?.departmentId ?? null)) {
            return NextResponse.json(
                { error: 'Forbidden: You can only delete classes in your department' },
                { status: 403 },
            );
        }

        // Check if class has related records
        const [users, callRounds] = await Promise.all([
            prisma.user.count({ where: { classId: id } }),
            prisma.callRound.count({
                where: {
                    classes: {
                        some: { id },
                    },
                },
            }),
        ]);

        if (users > 0 || callRounds > 0) {
            return NextResponse.json(
                {
                    error: 'Không thể xóa lớp vì đang có dữ liệu liên quan',
                    details: { users, callRounds },
                },
                { status: 400 },
            );
        }

        await prisma.class.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Error deleting class:', error);
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
