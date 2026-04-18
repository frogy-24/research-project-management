import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';

const BOT_API_URL = process.env.BOT_API_URL || 'http://127.0.0.1:8000';

export async function GET() {
    try {
        const authUser = await getAuthUser();
        if (!authUser || authUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const response = await fetch(`${BOT_API_URL}/reports/admin-statistics`, {
            method: 'GET',
            cache: 'no-store',
        });

        if (!response.ok) {
            const detail = await response.text();
            return NextResponse.json(
                { success: false, error: `Khong goi duoc bot service: ${detail}` },
                { status: 502 },
            );
        }

        const fileBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'text/markdown; charset=utf-8';
        const contentDisposition =
            response.headers.get('content-disposition') ||
            `attachment; filename="BaoCaoThongKe_AI_URMS_${new Date().toISOString().slice(0, 10)}.md"`;

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': contentDisposition,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('AI statistics report error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate AI report' }, { status: 500 });
    }
}
