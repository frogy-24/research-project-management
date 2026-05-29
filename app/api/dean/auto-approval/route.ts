import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/prisma/generated/prisma';
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

    const job = await prisma.autoApprovalJob.create({
      data: {
        deanId: userId,
        filters,
        criteria,
        status: 'QUEUED',
        progress: 0,
      },
    });

    const botBaseUrl = process.env.AI_API_URL || process.env.BOT_API_URL || 'http://localhost:8000';
    const response = await fetch(`${botBaseUrl}/api/dean/evaluate-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters,
        criteria,
        jobId: job.id,
        wait: false,
      }),
      cache: 'no-store',
    });

    const responseData = await response.json();
    if (!response.ok) {
      await prisma.autoApprovalJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: `Queue publish failed: ${response.status}`,
        },
      });
      return NextResponse.json(
        { error: 'Evaluate-with-ai failed', details: responseData },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      status: 'QUEUED',
      job,
      queue: responseData,
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

    const { searchParams } = new URL(request.url);
    const callRoundId = searchParams.get('callRoundId');

    const where: Prisma.AutoApprovalJobWhereInput = {
      deanId: userId,
      status: {
        in: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      },
    };

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
