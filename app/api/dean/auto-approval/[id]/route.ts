import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId, getActorRole } from '@/lib/project-permissions';

// GET /api/dean/auto-approval/[id] - Lấy chi tiết job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getActorUserId(request);
    const role = getActorRole(request);
    
    if (!userId || role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.autoApprovalJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.deanId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching auto-approval job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dean/auto-approval/[id]/confirm - Xác nhận và áp dụng kết quả
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getActorUserId(request);
    const role = getActorRole(request);
    
    if (!userId || role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { selectedIds } = body; // Danh sách ID đề tài được chọn để approve

    if (!Array.isArray(selectedIds)) {
      return NextResponse.json(
        { error: 'selectedIds must be an array' },
        { status: 400 }
      );
    }

    const job = await prisma.autoApprovalJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.deanId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (job.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Job is not completed yet' },
        { status: 400 }
      );
    }

    // Áp dụng phê duyệt cho các đề tài được chọn
    await prisma.projectRegistration.updateMany({
      where: {
        id: { in: selectedIds },
        facultyStatus: 'PENDING',
      },
      data: {
        facultyStatus: 'APPROVED',
        facultyReviewerId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Approved ${selectedIds.length} projects`,
    });
  } catch (error) {
    console.error('Error confirming auto-approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
