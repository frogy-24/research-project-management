'use client';

import { useMemo, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { CalendarClock, MapPin, Clock, NotebookPen, List, ChevronRight, User } from 'lucide-react';
import { useOfficeMeetingsList } from '@/hooks/useOfficeMeetings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const toHttpUrl = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = new URL(value);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
        return null;
    } catch {
        return null;
    }
};

type MeetingItem = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    meetingAt: string;
    location: string;
    note: string | null;
    scheduledBy: {
        name: string;
        email: string | null;
    };
};

export function OfficeMeetingsPage() {
    const { data, isLoading } = useOfficeMeetingsList(200);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
    const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
    const [quickViewOpen, setQuickViewOpen] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    const meetings: MeetingItem[] = useMemo(() => {
        const items: MeetingItem[] = data?.meetings ?? [];
        return items.sort((a, b) => {
            const timeA = new Date(a.meetingAt).getTime();
            const timeB = new Date(b.meetingAt).getTime();
            return timeB - timeA;
        });
    }, [data?.meetings]);

    const calendarEvents = useMemo(
        () =>
            meetings.map((meeting) => {
                const startAt = meeting.meetingAt || meeting.createdAt;

                return {
                    id: meeting.id,
                    title: meeting.title,
                    start: startAt,
                    allDay: false,
                    backgroundColor: meeting.isRead ? '#2563eb' : '#ea580c',
                    borderColor: meeting.isRead ? '#1d4ed8' : '#c2410c',
                    extendedProps: {
                        message: meeting.message,
                        location: meeting.location,
                        note: meeting.note,
                        isRead: meeting.isRead,
                    },
                };
            }),
        [meetings],
    );

    const selectedMeeting = useMemo(
        () => meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null,
        [meetings, selectedMeetingId],
    );

    const visibleMeetingsCount = useMemo(() => {
        if (!visibleRange) {
            return meetings.length;
        }

        return meetings.filter((meeting) => {
            const sourceDate = meeting.meetingAt ?? meeting.createdAt;
            const timestamp = new Date(sourceDate).getTime();

            return timestamp >= visibleRange.start.getTime() && timestamp < visibleRange.end.getTime();
        }).length;
    }, [meetings, visibleRange]);

    const handleEventClick = (eventClick: EventClickArg) => {
        setSelectedMeetingId(eventClick.event.id);
    };

    const handleDatesSet = (dateInfo: DatesSetArg) => {
        setVisibleRange({
            start: dateInfo.start,
            end: dateInfo.end,
        });
    };

    const jumpToMeeting = (meeting: NonNullable<typeof meetings>[number]) => {
        const targetDate = meeting.meetingAt ? new Date(meeting.meetingAt) : new Date(meeting.createdAt);
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.gotoDate(targetDate);
            // Cũng có thể mở popup detail:
            // setSelectedMeetingId(meeting.id);
        }
        setQuickViewOpen(false);
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 p-6 md:p-8">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Lịch hẹn</h1>
                <p className="text-sm text-muted-foreground">Xem lịch họp theo tháng, tuần và ngày.</p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={`meeting-skeleton-${index}`}>
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-4 w-2/5" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleMeetingsCount === 0 && meetings.length > 0 && (
                        <Card className="border-amber-300 bg-amber-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Vẫn có lịch hẹn</span>
                                    <Button variant="outline" size="sm" onClick={() => setQuickViewOpen(true)} className="h-8">
                                        <List className="mr-2 h-4 w-4" />
                                        Xem nhanh
                                    </Button>
                                </CardTitle>
                                <CardDescription>
                                    Bạn đang có {meetings.length} lịch hẹn, nhưng không có lịch nào trong khung thời gian đang xem.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 text-sm text-muted-foreground">
                                Hãy bấm nút "Hôm nay" hoặc chuyển sang tháng/tuần khác để xem đầy đủ lịch hẹn.
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-border/70">
                        <CardContent className="p-4">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                locale={viLocale}
                                initialView="dayGridMonth"
                                events={calendarEvents}
                                eventClick={handleEventClick}
                                datesSet={handleDatesSet}
                                height="auto"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                }}
                                buttonText={{
                                    today: 'Hôm nay',
                                    month: 'Tháng',
                                    week: 'Tuần',
                                    day: 'Ngày',
                                }}
                                eventTimeFormat={{
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    meridiem: false,
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={Boolean(selectedMeeting)} onOpenChange={(open) => !open && setSelectedMeetingId(null)}>
                <DialogContent className="sm:max-w-lg">
                    {selectedMeeting && (
                        <>
                            {/** Only make location clickable when it's a valid http/https URL. */}
                            {(() => {
                                const locationUrl = toHttpUrl(selectedMeeting.location);

                                return (
                                    <>
                            <DialogHeader>
                                <DialogTitle className="text-base flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-primary" />
                                    {selectedMeeting.title}
                                </DialogTitle>
                                <DialogDescription>Mô tả cuộc họp</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-2 text-sm">
                                    {!selectedMeeting.isRead && <Badge variant="secondary" className="mb-2">Mới</Badge>}
                                    <p className="text-sm leading-relaxed text-muted-foreground rounded-md bg-muted/40 p-3">
                                        {selectedMeeting.message}
                                    </p>
                                    <p className="flex items-center gap-2 text-muted-foreground">
                                        <User className="h-4 w-4 shrink-0" />
                                        <span>
                                            Người hẹn: {selectedMeeting.scheduledBy?.name || 'Giảng viên hướng dẫn'}
                                            {selectedMeeting.scheduledBy?.email
                                                ? ` (${selectedMeeting.scheduledBy.email})`
                                                : ''}
                                        </span>
                                    </p>
                                    <p className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4 shrink-0" />
                                        <span>
                                            {selectedMeeting.meetingAt
                                                ? new Date(selectedMeeting.meetingAt).toLocaleString('vi-VN')
                                                : new Date(selectedMeeting.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </p>
                                    {selectedMeeting.location && (
                                        <p className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4 shrink-0" />
                                            {locationUrl ? (
                                                <a
                                                    href={locationUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="underline underline-offset-2 text-blue-600 hover:text-blue-700"
                                                >
                                                    {selectedMeeting.location}
                                                </a>
                                            ) : (
                                                <span>{selectedMeeting.location}</span>
                                            )}
                                        </p>
                                    )}
                                </div>

                                {selectedMeeting.note && (
                                    <div className="rounded-md bg-muted/40 p-3 space-y-3 text-sm">
                                        <div className="space-y-1">
                                            <p className="font-medium flex items-center gap-2">
                                                <NotebookPen className="h-4 w-4 text-primary" />
                                                Ghi chú
                                            </p>
                                            <p className="text-muted-foreground whitespace-pre-wrap pl-6">
                                                {selectedMeeting.note}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={quickViewOpen} onOpenChange={setQuickViewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Danh sách lịch hẹn</DialogTitle>
                        <DialogDescription>Chọn một lịch hẹn để đi tới phần đó trên lịch.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] rounded-md border p-2">
                        <div className="space-y-2">
                            {meetings.map((meeting) => (
                                <button
                                    key={`quick-${meeting.id}`}
                                    onClick={() => jumpToMeeting(meeting)}
                                    className="flex w-full items-start justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                                >
                                    <div className="flex-1 space-y-1 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium line-clamp-1">{meeting.title}</span>
                                            {!meeting.isRead && <Badge variant="secondary" className="text-[10px] h-4 px-1">Mới</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            {meeting.meetingAt
                                                ? new Date(meeting.meetingAt).toLocaleString('vi-VN')
                                                : new Date(meeting.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground shrink-0" />
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
