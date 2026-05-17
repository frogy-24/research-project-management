import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId } from '@/lib/project-permissions';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
    const userId = getActorUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dean = await prisma.user.findUnique({ where: { id: userId } });
    if (!dean || dean.role !== 'DEAN') {
        return NextResponse.json({ error: 'Forbidden: Only Dean can access' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const template = await prisma.reportTemplate.findUnique({ where: { id } });
        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const relativeFilePath = template.fileUrl.startsWith('/') ? template.fileUrl.slice(1) : template.fileUrl;
        const absoluteFilePath = join(process.cwd(), 'public', relativeFilePath);

        await prisma.reportTemplate.delete({ where: { id } });

        if (existsSync(absoluteFilePath)) {
            await unlink(absoluteFilePath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete template error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
