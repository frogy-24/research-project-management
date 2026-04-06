import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { updatePostSchema } from '@/types/post.schema';

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

function canReadPublishedByAudience(
  authRole: string,
  authDepartmentId: string | null,
  postAudience: string,
  postDepartmentId: string | null,
): boolean {
  if (authRole === 'ADMIN' || authRole === 'DEAN') {
    return true;
  }

  if (postAudience === 'ALL') {
    return true;
  }

  if (postAudience === 'STUDENTS') {
    return authRole === 'STUDENT';
  }

  if (postAudience === 'LECTURERS') {
    return authRole !== 'STUDENT';
  }

  if (postAudience === 'DEPARTMENT') {
    return Boolean(authDepartmentId && postDepartmentId && authDepartmentId === postDepartmentId);
  }

  return false;
}

function canReadPost(
  authUserId: string,
  authRole: string,
  authDepartmentId: string | null,
  post: {
    authorId: string;
    status: string;
    audience: string;
    departmentId: string | null;
  },
): boolean {
  if (authRole === 'ADMIN' || authRole === 'DEAN') {
    return true;
  }

  if (post.authorId === authUserId) {
    return true;
  }

  if (post.status !== 'APPROVED') {
    return false;
  }

  return canReadPublishedByAudience(authRole, authDepartmentId, post.audience, post.departmentId);
}

function canUpdatePost(authUserId: string, authRole: string, postAuthorId: string): boolean {
  if (authRole === 'DEAN' || authRole === 'ADMIN') {
    return true;
  }

  return authUserId === postAuthorId;
}

function canDeletePost(authUserId: string, authRole: string, postAuthorId: string): boolean {
  if (authRole === 'DEAN') {
    return true;
  }

  return authUserId === postAuthorId;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
    }

    if (!canUpdatePost(authUser.userId, authUser.role, post.authorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const isDeanLike = authUser.role === 'DEAN' || authUser.role === 'ADMIN';
    const now = new Date();

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        audience: parsed.data.audience,
        status: isDeanLike ? 'APPROVED' : 'PENDING',
        rejectionReason: null,
        approvedById: isDeanLike ? authUser.userId : null,
        approvedAt: isDeanLike ? now : null,
        publishedAt: isDeanLike ? now : null,
        departmentId:
          parsed.data.audience === 'DEPARTMENT'
            ? authUser.departmentId ?? post.departmentId ?? null
            : authUser.departmentId ?? post.departmentId ?? null,
      },
      include: POST_INCLUDE,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });

    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
    }

    if (!canReadPost(authUser.userId, authUser.role, authUser.departmentId, post)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post detail:', error);
    return NextResponse.json({ error: 'Failed to fetch post detail' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
    }

    if (!canDeletePost(authUser.userId, authUser.role, post.authorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
