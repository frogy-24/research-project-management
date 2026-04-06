import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

const POST_INCLUDE = {
  author: {
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

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'DEAN' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';

    const where = {
      status: 'PENDING' as const,
      authorRole: 'LECTURER' as const,
      ...(authUser.role === 'DEAN'
        ? authUser.departmentId
          ? { departmentId: authUser.departmentId }
          : { departmentId: '__NO_MATCH__' }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { content: { contains: search, mode: 'insensitive' as const } },
              { author: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const posts = await prisma.post.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching pending posts:', error);
    return NextResponse.json({ error: 'Failed to fetch pending posts' }, { status: 500 });
  }
}
