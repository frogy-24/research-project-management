import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { createPostSchema } from '@/types/post.schema';
import type { Role } from '@/types/user.schema';
import type { Prisma } from '@/prisma/generated/prisma';

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

function buildAudienceWhere(role: Role, departmentId: string | null): Prisma.PostWhereInput {
  if (role === 'ADMIN' || role === 'DEAN') {
    return {};
  }

  const allowedAudience: Array<'ALL' | 'LECTURERS' | 'STUDENTS'> = ['ALL'];

  if (role === 'STUDENT') {
    allowedAudience.push('STUDENTS');
  } else {
    allowedAudience.push('LECTURERS');
  }

  if (!departmentId) {
    return { audience: { in: allowedAudience } };
  }

  return {
    OR: [
      { audience: { in: allowedAudience } },
      { audience: 'DEPARTMENT' as const, departmentId },
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mine = request.nextUrl.searchParams.get('mine') === 'true';

    const where: Prisma.PostWhereInput = mine
      ? { authorId: authUser.userId }
      : {
          status: 'APPROVED' as const,
          ...buildAudienceWhere(authUser.role, authUser.departmentId),
        };

    const posts = await prisma.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: mine
        ? [{ createdAt: 'desc' }]
        : [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'DEAN' && authUser.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const userDepartmentId = authUser.departmentId ?? null;
    const isDean = authUser.role === 'DEAN';

    if (authUser.role === 'LECTURER' && !userDepartmentId) {
      return NextResponse.json(
        { error: 'Giảng viên cần thuộc một khoa để đăng bài' },
        { status: 400 },
      );
    }

    if (parsed.data.audience === 'DEPARTMENT' && !userDepartmentId) {
      return NextResponse.json(
        { error: 'Tài khoản hiện tại không có khoa liên kết' },
        { status: 400 },
      );
    }

    const now = new Date();

    const post = await prisma.post.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        audience: parsed.data.audience,
        authorId: authUser.userId,
        authorRole: authUser.role,
        departmentId: userDepartmentId,
        status: isDean ? 'APPROVED' : 'PENDING',
        approvedById: isDean ? authUser.userId : null,
        approvedAt: isDean ? now : null,
        publishedAt: isDean ? now : null,
      },
      include: POST_INCLUDE,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
