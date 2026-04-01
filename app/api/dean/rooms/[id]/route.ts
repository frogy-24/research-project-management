// app/api/dean/rooms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { updateRoomSchema } from '@/types/room.schema';

const ROOM_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
  _count: { select: { officeMeetings: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

// GET /api/dean/rooms/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getAuthUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id }, include: ROOM_INCLUDE });
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  return NextResponse.json(room);
}

// PUT /api/dean/rooms/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getAuthUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'DEAN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  // Dean chỉ được sửa phòng thuộc khoa mình
  if (session.role === 'DEAN' && room.departmentId !== session.departmentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Check duplicate code if code changed
  if (parsed.data.code && parsed.data.code !== room.code) {
    const conflict = await prisma.room.findUnique({
      where: { code_departmentId: { code: parsed.data.code, departmentId: room.departmentId } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Mã phòng đã tồn tại trong khoa này' }, { status: 409 });
    }
  }

  const updated = await prisma.room.update({
    where: { id },
    data: parsed.data,
    include: ROOM_INCLUDE,
  });

  return NextResponse.json(updated);
}

// DELETE /api/dean/rooms/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getAuthUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'DEAN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const room = await prisma.room.findUnique({
    where: { id },
    include: { _count: { select: { officeMeetings: true } } },
  });
  if (!room) return NextResponse.json({ error: 'Phòng không tồn tại' }, { status: 404 });

  if (session.role === 'DEAN' && room.departmentId !== session.departmentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (room._count.officeMeetings > 0) {
    return NextResponse.json(
      { error: 'Không thể xóa phòng đang có buổi họp liên quan' },
      { status: 409 },
    );
  }

  await prisma.room.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
