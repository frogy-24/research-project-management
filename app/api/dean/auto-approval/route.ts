import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId, getActorRole } from '@/lib/project-permissions';

// POST /api/dean/auto-approval - Tạo job phê duyệt tự động
export async function POST(request: NextRequest) {
  try {
    const userId = getActorUserId(request);
    const role = getActorRole(request);
    
    if (!userId || role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filters, criteria } = body;

    if (!filters || !criteria) {
      return NextResponse.json(
        { error: 'Missing filters or criteria' },
        { status: 400 }
      );
    }

    // Tạo job trong database
    const job = await prisma.autoApprovalJob.create({
      data: {
        deanId: userId,
        filters,
        criteria,
        status: 'QUEUED',
        progress: 0,
      },
    });

    // Gửi message vào RabbitMQ queue (sẽ được Python worker xử lý)
    // Note: Không cần RabbitMQ client ở đây, Python worker sẽ poll database
    
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Job created successfully',
    });
  } catch (error) {
    console.error('Error creating auto-approval job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/dean/auto-approval - Lấy danh sách jobs
export async function GET(request: NextRequest) {
  try {
    const userId = getActorUserId(request);
    const role = getActorRole(request);
    
    if (!userId || role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get callRoundId from query params
    const { searchParams } = new URL(request.url);
    const callRoundId = searchParams.get('callRoundId');

    // Build where clause
    const where: any = {
      deanId: userId,
      status: {
        in: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      },
    };

    // Filter by callRoundId if provided
    if (callRoundId) {
      where.filters = {
        path: ['callRoundId'],
        equals: callRoundId,
      };
    }

    const jobs = await prisma.autoApprovalJob.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching auto-approval jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
