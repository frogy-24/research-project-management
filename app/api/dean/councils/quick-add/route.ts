import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth-helpers';

const quickAddSchema = z.object({
    callRoundId: z.string().min(1),
    requiredFromUser: z.string().optional(),
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

        const botBaseUrl = process.env.AI_API_URL || 'http://localhost:8000';
        const incomingCookie = request.headers.get('cookie') ?? '';
        const response = await fetch(`${botBaseUrl}/api/dean/councils/quick-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_base_url: process.env.APP_BASE_URL || 'http://localhost:3000',
                call_round_id: parsed.data.callRoundId,
                requiredFromUser: parsed.data.requiredFromUser,
                clear_existing: parsed.data.clearExisting,
                cookie: incomingCookie,
            }),
            cache: 'no-store',
        });

        const responseData = await response.json();
        console.log('Response from quick-add AI:', responseData);
        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Quick add AI failed',
                    details: responseData,
                },
                { status: response.status },
            );
        }

        // Transform response để phù hợp với frontend
        // Bot API trả về: { success, session_id, reasoning, councils, total_councils, lecturers, message }
        // Frontend expect: { success, client_view: { items, summary, totalCouncils, totalProjects, availableLecturers } }
        const transformedData = {
            success: responseData.success,
            session_id: responseData.session_id,
            reasoning: responseData.reasoning || '',
            client_view: {
                summary:
                    responseData.message ||
                    `Đã tạo ${responseData.total_councils || 0} hội đồng. Vui lòng xem trước và xác nhận.`,
                callRoundId: parsed.data.callRoundId,
                totalCouncils: responseData.total_councils || 0,
                totalProjects: 0,
                // Trả về danh sách giảng viên khả dụng từ đợt đăng ký
                availableLecturers: (responseData.lecturers || []).map((lecturer: any) => ({
                    id: lecturer.id,
                    name: lecturer.name,
                    email: lecturer.email,
                    department: lecturer.department_name || lecturer.department || null,
                    departmentId: lecturer.department_id || null,
                    major: lecturer.major_name || lecturer.major || null,
                    majorId: lecturer.major_id || null,
                    source: lecturer.source || 'UNKNOWN',
                })),
                items: (responseData.councils || []).map((council: any) => ({
                    councilId: council.id,
                    name: council.name,
                    description: council.description || null,
                    projectCount: Array.isArray(council.projects) ? council.projects.length : 0,
                    memberCount: Array.isArray(council.members) ? council.members.length : 0,
                    members: council.members || [],
                    projects: council.projects || [],
                    agreeButton: {
                        label: 'Đồng ý',
                        action: 'confirm',
                        payload: {
                            councilId: council.id,
                        },
                    },
                })),
            },
        };

        return NextResponse.json(transformedData);
    } catch (error) {
        console.error('Error in quick-add proxy:', error);
        return NextResponse.json({ error: 'Failed to process quick add councils' }, { status: 500 });
    }
}
