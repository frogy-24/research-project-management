import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const description = typeof body?.description === 'string' ? body.description.trim() : '';
        const members = Array.isArray(body?.members) ? body.members : undefined;

        if (!name) {
            return NextResponse.json({ error: 'Tên hội đồng là bắt buộc' }, { status: 400 });
        }

        const existing = await prisma.council.findUnique({
            where: { id },
            select: {
                id: true,
                callRound: {
                    select: {
                        isLocked: true,
                    },
                },
            },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy hội đồng' }, { status: 404 });
        }

        if (existing.callRound?.isLocked) {
            return NextResponse.json(
                { error: 'Đợt đề tài đã hoàn tất công bố hội đồng, không thể chỉnh sửa' },
                { status: 409 },
            );
        }

        if (members && members.length === 0) {
            return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 thành viên' }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (members) {
                await tx.councilMemberAssignment.deleteMany({
                    where: { councilId: id },
                });

                await tx.councilMemberAssignment.createMany({
                    data: members.map((member: { councilMemberId: string; role?: string }) => ({
                        councilId: id,
                        councilMemberId: member.councilMemberId,
                        role: member.role || 'Ủy viên',
                    })),
                });
            }

            return tx.council.update({
                where: { id },
                data: {
                    name,
                    description: description || null,
                },
                include: {
                    members: {
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
                    },
                    projects: {
                        include: {
                            projectRegistration: {
                                select: {
                                    id: true,
                                    title: true,
                                    objective: true,
                                    status: true,
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            code: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            members: true,
                            projects: true,
                        },
                    },
                },
            });
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating council:', error);
        return NextResponse.json({ error: 'Failed to update council' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'DEAN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const existing = await prisma.council.findUnique({
            where: { id },
            select: {
                id: true,
                callRound: {
                    select: {
                        isLocked: true,
                    },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Không tìm thấy hội đồng' }, { status: 404 });
        }

        if (existing.callRound?.isLocked) {
            return NextResponse.json(
                { error: 'Đợt đề tài đã hoàn tất công bố hội đồng, không thể xóa' },
                { status: 409 },
            );
        }

        await prisma.council.delete({ where: { id } });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Error deleting council:', error);
        return NextResponse.json({ error: 'Failed to delete council' }, { status: 500 });
    }
}
