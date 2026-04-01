// app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, canManageDepartment } from '@/lib/auth-helpers';
import { createRoomSchema } from '@/types/room.schema';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    // DEAN chỉ xem phòng của khoa mình
    const filterDepartmentId =
      authUser.role === 'DEAN'
        ? (authUser.departmentId ?? undefined)
        : (departmentId ?? undefined);

    const rooms = await prisma.room.findMany({
      where: {
        ...(filterDepartmentId ? { departmentId: filterDepartmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { officeMeetings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { departmentId: bodyDeptId, ...roomData } = parsed.data as typeof parsed.data & {
      departmentId?: string;
    };

    // Xác định departmentId
    let targetDepartmentId: string;
    if (authUser.role === 'DEAN') {
      if (!authUser.departmentId) {
        return NextResponse.json({ error: 'Trưởng khoa chưa có khoa' }, { status: 400 });
      }
      targetDepartmentId = authUser.departmentId;
    } else if (authUser.role === 'ADMIN') {
      if (!bodyDeptId) {
        return NextResponse.json({ error: 'Admin phải cung cấp departmentId' }, { status: 400 });
      }
      targetDepartmentId = bodyDeptId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canManageDepartment(authUser, targetDepartmentId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kiểm tra mã phòng trùng trong cùng khoa
    const existing = await prisma.room.findUnique({
      where: {
        code_departmentId: {
          code: roomData.code,
          departmentId: targetDepartmentId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Mã phòng "${roomData.code}" đã tồn tại trong khoa này` },
        { status: 409 },
      );
    }

    const room = await prisma.room.create({
      data: {
        ...roomData,
        departmentId: targetDepartmentId,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { officeMeetings: true } },
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
