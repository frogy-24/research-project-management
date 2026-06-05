import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId } from '@/lib/project-permissions';
import { exportDisbursementsToExcel } from '@/lib/export-disbursement-excel';
import type { FundingDisbursementWithRelations } from '@/types/disbursement.schema';

export async function GET(req: NextRequest) {
    try {
        const userId = getActorUserId(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, departmentId: true },
        });

        if (!user || (user.role !== 'DEAN' && user.role !== 'ADMIN' && user.role !== 'DISBURSER')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || '';
        const callRoundId = searchParams.get('callRoundId') || '';
        const projectId = searchParams.get('projectId') || '';
        const fromDate = searchParams.get('fromDate') || '';
        const toDate = searchParams.get('toDate') || '';

        const whereClause: Record<string, unknown> = {};
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }
        if (projectId) {
            whereClause.projectId = projectId;
        }
        if (fromDate || toDate) {
            whereClause.disbursedAt = {};
            if (fromDate) (whereClause.disbursedAt as Record<string, Date>).gte = new Date(fromDate);
            if (toDate) (whereClause.disbursedAt as Record<string, Date>).lte = new Date(toDate);
        }

        // Lọc theo khoa nếu là DEAN
        const projectWhere: Record<string, unknown> = {};
        if (user.role === 'DEAN' && user.departmentId) {
            projectWhere.callRound = { createdById: userId };
        }
        if (callRoundId) {
            projectWhere.callRoundId = callRoundId;
        }
        if (Object.keys(projectWhere).length > 0) {
            whereClause.project = projectWhere;
        }

        const disbursements = await prisma.fundingDisbursement.findMany({
            where: whereClause,
            include: {
                project: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        budgetApproved: true,
                        callRoundId: true,
                        callRound: {
                            select: { id: true, name: true, createdById: true },
                        },
                    },
                },
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                approvedBy: { select: { id: true, name: true, email: true } },
                paidBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { disbursedAt: 'desc' },
        });

        // Cast sang type chuẩn của lib
        const data: FundingDisbursementWithRelations[] = disbursements.map((d) => ({
            ...d,
            amount: Number(d.amount),
        })) as unknown as FundingDisbursementWithRelations[];

        const callRoundName = disbursements[0]?.project?.callRound?.name;

        const buffer = await exportDisbursementsToExcel(data, callRoundName);

        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
            now.getDate(),
        ).padStart(2, '0')}`;
        const filename = callRoundName
            ? `DS-GiaiNgan-${slugify(callRoundName)}-${timestamp}.xlsx`
            : `DS-GiaiNgan-${timestamp}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting styled disbursements:', error);
        return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
    }
}

function slugify(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}
