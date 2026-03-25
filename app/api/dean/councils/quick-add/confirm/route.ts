import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth-helpers';

const confirmSchema = z.object({
  callRoundId: z.string().min(1),
  selectedCouncilIds: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = confirmSchema.safeParse(body);

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

    const response = await fetch(`${botBaseUrl}/api/dean/councils/quick-add/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_base_url: process.env.APP_BASE_URL || 'http://localhost:3000',
        call_round_id: parsed.data.callRoundId,
        selected_council_ids: parsed.data.selectedCouncilIds,
        cookie: incomingCookie,
      }),
      cache: 'no-store',
    });

    const responseData = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Confirm quick add failed',
          details: responseData,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in quick-add confirm proxy:', error);
    return NextResponse.json({ error: 'Failed to confirm quick add councils' }, { status: 500 });
  }
}
