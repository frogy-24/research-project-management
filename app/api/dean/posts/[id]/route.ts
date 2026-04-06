import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { moderatePostSchema } from '@/types/post.schema';

const POST_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      role: true,
      departmentId: true,
    },
  },
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'DEAN' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = moderatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { id } = await params;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
    }

    if (post.status !== 'PENDING') {
      return NextResponse.json({ error: 'Bài viết đã được xử lý trước đó' }, { status: 409 });
    }

    if (post.authorRole !== 'LECTURER') {
      return NextResponse.json({ error: 'Bài viết này không thuộc luồng duyệt của Trưởng khoa' }, { status: 409 });
    }

    if (
      authUser.role === 'DEAN' &&
      (post.departmentId == null || authUser.departmentId == null || post.departmentId !== authUser.departmentId)
    ) {
      return NextResponse.json({ error: 'Bạn không có quyền duyệt bài viết này' }, { status: 403 });
    }

    const now = new Date();

    const updated = await prisma.post.update({
      where: { id },
      data: {
        status: parsed.data.status,
        approvedById: authUser.userId,
        approvedAt: now,
        publishedAt: parsed.data.status === 'APPROVED' ? now : null,
        rejectionReason: parsed.data.status === 'REJECTED' ? parsed.data.rejectionReason ?? null : null,
      },
      include: POST_INCLUDE,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error moderating post:', error);
    return NextResponse.json({ error: 'Failed to moderate post' }, { status: 500 });
  }
}
