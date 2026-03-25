import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth-helpers';

const quickAddSchema = z.object({
  callRoundId: z.string().min(1),
  minProjectsPerCouncil: z.number().min(1).max(20).default(5),
  maxProjectsPerCouncil: z.number().min(1).max(20).default(10),
  clearExisting: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = quickAddSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const botBaseUrl = process.env.BOT_API_BASE_URL || 'http://localhost:8000';
    const incomingCookie = request.headers.get('cookie') ?? '';

    const response = await fetch(`${botBaseUrl}/api/dean/councils/quick-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_base_url: process.env.APP_BASE_URL || 'http://localhost:3000',
        call_round_id: parsed.data.callRoundId,
        min_projects_per_council: parsed.data.minProjectsPerCouncil,
        max_projects_per_council: parsed.data.maxProjectsPerCouncil,
        clear_existing: parsed.data.clearExisting,
        cookie: incomingCookie,
      }),
      cache: 'no-store',
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Quick add AI failed',
          details: responseData,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in quick-add proxy:', error);
    return NextResponse.json({ error: 'Failed to process quick add councils' }, { status: 500 });
  }
}
