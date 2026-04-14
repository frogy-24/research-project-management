import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';

type ScheduleMetadata = {
    kind: string;
    callRoundId?: string;
    councilId?: string;
    defenseDate?: string | null;
    defenseLocation?: string | null;
};

const isScheduleMetadata = (value: unknown): value is ScheduleMetadata => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const item = value as Record<string, unknown>;
    return item.kind === 'COUNCIL_REPORT_SCHEDULE';
};

export async function GET(request: Request) {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Search parameters: limit
        const { searchParams } = new URL(request.url);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 200;

        // User should see meetings where they are the instructor, or they are in the views
        // Or simpler: queries through views
        // Wait, OfficeMeetingView has the receipt status for this user
        
        const [meetings, scheduleNotifications] = await Promise.all([
            prisma.officeMeeting.findMany({
            where: {
                views: {
                    some: {
                        userId: session.userId,
                    }
                }
            },
            include: {
                project: {
                    select: {
                        title: true,
                    }
                },
                instructor: {
                    select: {
                        name: true,
                        email: true,
                    }
                },
                views: {
                    where: {
                        userId: session.userId,
                    },
                    select: {
                        isRead: true,
                    },
                    take: 1
                }
            },
            orderBy: {
                meetingAt: 'desc'
            },
            take: limit > 0 && limit <= 1000 ? limit : 200,
            }),
            prisma.notification.findMany({
                where: {
                    userId: session.userId,
                    link: '/student/meetings',
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit > 0 && limit <= 1000 ? limit : 200,
            }),
        ]);

        // Map to format that UI expects so migration is easy
        const formattedOfficeMeetings = meetings.map(meeting => {
            const isRead = meeting.views[0]?.isRead ?? false;
            
            // Reconstruct a title and message locally for display
            // Usually the notification had logic:
            // "Giáº£ng viÃªn Ä‘Ã£ háº¹n há»p..."
            const isInstructor = session.userId === meeting.instructorId;
            const formattedTime = new Date(meeting.meetingAt).toLocaleString('vi-VN', { hour12: false });
            
            let message = '';
            if (isInstructor) {
                message = `Bạn đã tạo lịch họp cho đề tài "${meeting.project.title}" vào ${formattedTime} tại ${meeting.location}.`;
            } else {
                if (meeting.target === 'GROUP') {
                    message = `Giảng viên đã hẹn họp cho đề tài "${meeting.project.title}" vào ${formattedTime} tại ${meeting.location}.`;
                } else {
                    message = `Giảng viên đã hẹn họp với sinh viên phụ trách đề tài "${meeting.project.title}" vào ${formattedTime} tại ${meeting.location}.`;
                }
            }

            return {
                id: meeting.id,
                title: 'Lịch họp mới',
                message,
                isRead,
                createdAt: meeting.createdAt.toISOString(),
                meetingAt: meeting.meetingAt.toISOString(),
                location: meeting.location,
                note: meeting.note,
                scheduledBy: {
                    name: meeting.instructor.name,
                    email: meeting.instructor.email
                }
            };
        });

        const latestScheduleByCallRound = new Map<string, (typeof scheduleNotifications)[number]>();

        for (const notification of scheduleNotifications) {
            if (!isScheduleMetadata(notification.metadata)) {
                continue;
            }

            const metadata = notification.metadata as ScheduleMetadata;
            const key = metadata.councilId || metadata.callRoundId || 'global';
            const existing = latestScheduleByCallRound.get(key);

            if (!existing || existing.createdAt < notification.createdAt) {
                latestScheduleByCallRound.set(key, notification);
            }
        }

        const formattedReportSchedules = Array.from(latestScheduleByCallRound.values()).map((item) => {
            const metadata = item.metadata as ScheduleMetadata;
            const fallbackDate = item.createdAt.toISOString();

            return {
                id: `report-schedule-${item.id}`,
                title: 'Lịch báo cáo hội đồng',
                message: item.message,
                isRead: item.isRead,
                createdAt: item.createdAt.toISOString(),
                meetingAt: metadata.defenseDate || fallbackDate,
                location: metadata.defenseLocation || 'Chưa cập nhật',
                note: null,
                scheduledBy: {
                    name: 'Khoa',
                    email: null,
                },
            };
        });

        const formattedMeetings = [...formattedOfficeMeetings, ...formattedReportSchedules].sort((a, b) => {
            const timeA = new Date(a.meetingAt).getTime();
            const timeB = new Date(b.meetingAt).getTime();
            return timeB - timeA;
        });

        return NextResponse.json({
            meetings: formattedMeetings
        });

    } catch (error) {
        console.error('Error fetching office meetings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
