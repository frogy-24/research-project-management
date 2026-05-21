import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createUserSchema } from '@/types/user.schema';
import { getAuthUser, getDepartmentFilter, isAdmin } from '@/lib/auth-helpers';

export async function GET(request: Request) {
    try {
        // Get authenticated user for role-based filtering
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const role = searchParams.get('role');
        const departmentId = searchParams.get('departmentId');
        const majorId = searchParams.get('majorId');
        const classId = searchParams.get('classId');
        const gender = searchParams.get('gender');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        const whereClause: any = {};

        // Apply role-based filtering
        const departmentFilter = getDepartmentFilter(authUser);
        if (departmentFilter && !isAdmin(authUser)) {
            // DEAN sees only their department
            whereClause.departmentId = departmentFilter;
        } else if (departmentId) {
            // ADMIN can filter by specific department
            whereClause.departmentId = departmentId;
        }

        if (role) whereClause.role = role;
        if (majorId) whereClause.majorId = majorId;
        if (classId) whereClause.classId = classId;
        if (gender) whereClause.gender = gender;

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                include: {
                    departmentRef: true,
                    major: true,
                    class: true,
                    lecturerProfile: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where: whereClause }),
        ]);

        return NextResponse.json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch users',
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = createUserSchema.parse(body);

        // DEAN can only create users in their own department
        // Auto-assign dean's departmentId if not provided or different
        if (authUser.role === 'DEAN') {
            if (!authUser.departmentId) {
                return NextResponse.json({ error: 'Forbidden: Dean has no department assigned' }, { status: 403 });
            }
            // Force departmentId to be the dean's own department
            validatedData.departmentId = authUser.departmentId;
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: validatedData.email }, { code: validatedData.code || undefined }].filter(Boolean) as any,
            },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Email hoặc mã số đã tồn tại' }, { status: 400 });
        }

        const { lecturerProfile, ...userData } = validatedData as any;

        const user = await prisma.user.create({
            data: {
                ...userData,
                dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
                lecturerProfile:
                    userData.role === 'LECTURER' && lecturerProfile
                        ? {
                              create: {
                                  ...lecturerProfile,
                                  researchInterests: lecturerProfile.researchInterests ?? [],
                              },
                          }
                        : undefined,
            },
            include: {
                departmentRef: true,
                major: true,
                class: true,
                lecturerProfile: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
