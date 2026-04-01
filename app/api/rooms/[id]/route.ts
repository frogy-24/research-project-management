// app/api/rooms/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, canManageDepartment } from '@/lib/auth-helpers';
import { updateRoomSchema } from '@/types/room.schema';

async function getRoomOrFail(id: string) {
  return prisma.room.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { officeMeetings: true } },
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const room = await getRoomOrFail(id);

    if (!room) {
      return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const room = await getRoomOrFail(id);

    if (!room) {
      return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });
    }

    if (!canManageDepartment(authUser, room.departmentId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = updateRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Kiểm tra mã phòng trùng (bỏ qua chính nó)
    if (parsed.data.code && parsed.data.code !== room.code) {
      const duplicate = await prisma.room.findUnique({
        where: {
          code_departmentId: {
            code: parsed.data.code,
            departmentId: room.departmentId,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Mã phòng "${parsed.data.code}" đã tồn tại trong khoa này` },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data: parsed.data,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { officeMeetings: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const room = await getRoomOrFail(id);

    if (!room) {
      return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });
    }

    if (!canManageDepartment(authUser, room.departmentId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kiểm tra ràng buộc
    if (room._count.officeMeetings > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa phòng vì đang có ${room._count.officeMeetings} buổi họp liên quan`,
        },
        { status: 400 },
      );
    }

    await prisma.room.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
