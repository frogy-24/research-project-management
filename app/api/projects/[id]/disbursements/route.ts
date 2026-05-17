import { Prisma } from '@/prisma/generated/prisma';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canCreateDisbursement, getActorRole, getActorUserId } from '@/lib/project-permissions';
import { createDisbursementSchema } from '@/types/disbursement.schema';
import { ZodError } from 'zod';

type Params = {
    params: Promise<{ id: string }>;
};

const mapZodError = (zodError: ZodError) => {
    const fields: Record<string, string[]> = {};

    for (const issue of zodError.issues) {
        const key = issue.path.join('.') || 'form';
        fields[key] = [...(fields[key] ?? []), issue.message];
    }

    return fields;
};

export async function GET(_: Request, { params }: Params) {
    try {
        const { id } = await params;

        const disbursements = await prisma.fundingDisbursement.findMany({
            where: { projectId: id },
            orderBy: { disbursedAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: disbursements });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch disbursements',
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request, { params }: Params) {
    try {
        const actorRole = getActorRole(request);
        const actorUserId = getActorUserId(request);

        if (!actorRole || !actorUserId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                },
                { status: 401 },
            );
        }

        if (!canCreateDisbursement(actorRole)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Bạn không có quyền cập nhật giải ngân.',
                },
                { status: 403 },
            );
        }

        const { id } = await params;
        const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });

        if (!project) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Project not found',
                },
                { status: 404 },
            );
        }

        const body: unknown = await request.json();
        const parsed = createDisbursementSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid payload',
                    fields: mapZodError(parsed.error),
                },
                { status: 400 },
            );
        }

        const disbursement = await prisma.fundingDisbursement.create({
            data: {
                projectId: id,
                amount: new Prisma.Decimal(parsed.data.amount),
                disbursedAt: parsed.data.disbursedAt,
                voucherNo: parsed.data.voucherNo ?? null,
                voucherFileUrl: parsed.data.voucherFileUrl ?? null,
                createdById: actorUserId,
            },
        });

        return NextResponse.json({ success: true, data: disbursement }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create disbursement',
            },
            { status: 500 },
        );
    }
}
