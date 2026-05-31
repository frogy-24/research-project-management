// app/api/disbursements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorRole, getActorUserId } from '@/lib/project-permissions';
import { createDisbursementSchema } from '@/types/disbursement.schema';
import { Prisma } from '@/prisma/generated/prisma';

/**
 * GET /api/disbursements
 * Lấy danh sách giải ngân với filters
 */
export async function GET(request: NextRequest) {
    try {
        const actorRole = getActorRole(request);
        const actorUserId = getActorUserId(request);

        if (!actorRole || !actorUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filters = {
            projectId: searchParams.get('projectId') || undefined,
            status: searchParams.get('status') || undefined,
            callRoundId: searchParams.get('callRoundId') || undefined,
            createdById: searchParams.get('createdById') || undefined,
            fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
            toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
        };

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.FundingDisbursementWhereInput = {};

        if (filters.projectId) where.projectId = filters.projectId;
        if (filters.status) where.status = filters.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
        if (filters.createdById) where.createdById = filters.createdById;

        if (filters.fromDate || filters.toDate) {
            where.disbursedAt = {};
            if (filters.fromDate) where.disbursedAt.gte = filters.fromDate;
            if (filters.toDate) where.disbursedAt.lte = filters.toDate;
        }

        const projectWhere: Prisma.ProjectWhereInput = {};

        // Filter by callRoundId
        if (filters.callRoundId) {
            projectWhere.callRoundId = filters.callRoundId;
        }

        // Role-based filtering
        if (actorRole === 'DEAN') {
            // Dean chỉ xem giải ngân của projects thuộc call rounds do mình tạo
            projectWhere.callRound = {
                createdById: actorUserId,
            };
        }

        // Người giải ngân chỉ thấy các khoản đã được phê duyệt hoặc đã thanh toán
        if (actorRole === 'DISBURSER' && !filters.status) {
            where.status = { in: ['APPROVED', 'PAID'] };
        }

        if (Object.keys(projectWhere).length > 0) {
            where.project = {
                is: projectWhere,
            };
        }

        const [disbursements, total] = await Promise.all([
            prisma.fundingDisbursement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    project: {
                        select: {
                            id: true,
                            code: true,
                            title: true,
                            budgetApproved: true,
                            callRoundId: true,
                            callRound: {
                                select: {
                                    id: true,
                                    name: true,
                                    createdById: true,
                                },
                            },
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    approvedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.fundingDisbursement.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: disbursements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching disbursements:', error);
        return NextResponse.json({ success: false, message: 'Lỗi khi lấy danh sách giải ngân' }, { status: 500 });
    }
}

/**
 * POST /api/disbursements
 * Tạo mới giải ngân (Dean/Admin)
 */
export async function POST(request: NextRequest) {
    try {
        const actorRole = getActorRole(request);
        const actorUserId = getActorUserId(request);

        if (!actorRole || !actorUserId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Chỉ Dean và Admin được tạo giải ngân
        if (!['DEAN', 'ADMIN'].includes(actorRole)) {
            return NextResponse.json({ success: false, message: 'Bạn không có quyền tạo giải ngân' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = createDisbursementSchema.parse(body);

        // Kiểm tra project tồn tại
        const project = await prisma.project.findUnique({
            where: { id: validatedData.projectId },
            include: {
                callRound: true,
                disbursements: true,
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, message: 'Không tìm thấy đề tài' }, { status: 404 });
        }

        // Kiểm tra quyền: Dean chỉ tạo cho projects thuộc call rounds do mình tạo
        if (actorRole === 'DEAN') {
            if (project.callRound?.createdById !== actorUserId) {
                return NextResponse.json(
                    { success: false, message: 'Bạn chỉ có thể tạo giải ngân cho đề tài thuộc đợt đăng ký do bạn tạo' },
                    { status: 403 },
                );
            }
        }

        // Kiểm tra project status
        const validStatuses = ['APPROVED', 'IN_PROGRESS', 'COMPLETED'];
        if (!validStatuses.includes(project.status)) {
            return NextResponse.json(
                { success: false, message: 'Chỉ có thể giải ngân cho đề tài đã được phê duyệt' },
                { status: 400 },
            );
        }

        const budgetApproved = project.budgetApproved ? Number(project.budgetApproved) : 0;

        // Kiểm tra ngân sách
        if (budgetApproved <= 0) {
            return NextResponse.json(
                { success: false, message: 'Đề tài chưa có ngân sách được phê duyệt' },
                { status: 400 },
            );
        }

        // Tính tổng đã giải ngân (chỉ tính APPROVED)
        const totalDisbursed = project.disbursements
            .filter((d) => d.status === 'APPROVED')
            .reduce((sum: number, d) => sum + Number(d.amount), 0);

        const remainingBudget = budgetApproved - totalDisbursed;

        if (validatedData.amount > remainingBudget) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Số tiền giải ngân vượt quá ngân sách còn lại (${remainingBudget.toLocaleString('vi-VN')} VNĐ)`,
                },
                { status: 400 },
            );
        }

        // Tạo giải ngân
        const disbursement = await prisma.fundingDisbursement.create({
            data: {
                projectId: validatedData.projectId,
                amount: validatedData.amount,
                disbursedAt: validatedData.disbursedAt,
                voucherNo: validatedData.voucherNo,
                voucherFileUrl: validatedData.voucherFileUrl,
                reason: validatedData.reason,
                status: 'PENDING',
                createdById: actorUserId,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        budgetApproved: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: disbursement,
            message: 'Tạo yêu cầu giải ngân thành công',
        });
    } catch (error) {
        console.error('Error creating disbursement:', error);
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, message: 'Dữ liệu không hợp lệ', errors: 'errors' in error ? error.errors : [] },
                { status: 400 },
            );
        }
        return NextResponse.json({ success: false, message: 'Lỗi khi tạo giải ngân' }, { status: 500 });
    }
}
