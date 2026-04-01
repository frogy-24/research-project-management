// app/api/dean/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { createRoomSchema } from '@/types/room.schema';

const ROOM_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
  _count: { select: { officeMeetings: true } },
} as const;

// GET /api/dean/rooms — list rooms belonging to dean's department
export async function GET(_req: NextRequest) {
  const session = await getAuthUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'DEAN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const where =
    session.role === 'DEAN' && session.departmentId
      ? { departmentId: session.departmentId }
      : {};

  const rooms = await prisma.room.findMany({
    where,
    include: ROOM_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rooms);
}

// POST /api/dean/rooms — create a new room
export async function POST(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'DEAN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const departmentId = session.departmentId;
  if (!departmentId) {
    return NextResponse.json({ error: 'Tài khoản không có khoa liên kết' }, { status: 400 });
  }

  // Check duplicate code within same department
  const existing = await prisma.room.findUnique({
    where: { code_departmentId: { code: parsed.data.code, departmentId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Mã phòng đã tồn tại trong khoa này' }, { status: 409 });
  }

  const room = await prisma.room.create({
    data: { ...parsed.data, departmentId },
    include: ROOM_INCLUDE,
  });

  return NextResponse.json(room, { status: 201 });
}
