// components/projects/instructor-review-progress-client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useAuthSession } from '@/hooks/useAuth';
import { useCallRounds } from '@/hooks/useCallRounds';
import { useCreateOfficeMeeting, useOfficeMeetingMembers } from '@/hooks/useOfficeMeetings';
import { ProgressReportPanel } from '@/components/projects/progress-report-panel';
import type { Project } from '@/types/project.schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, CalendarPlus, Search, User, Mail, Phone, Users } from 'lucide-react';

type ProjectWithLeader = {
    id: string;
    title: string;
    status: string;
    leaderId: string;
    instructorId?: string | null;
    callRoundId?: string | null;
    leaderInfo?: {
        id: string;
        name: string;
        email: string;
        code?: string | null;
        phone?: string | null;
    };
};

export function InstructorReviewProgressClient() {
    const { data: session } = useAuthSession();
    const { data: projects = [], isLoading: projectsLoading } = useProjects();
    const { data: callRounds = [] } = useCallRounds();
    const createOfficeMeeting = useCreateOfficeMeeting();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>('ALL');
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
    const [meetingCallRoundId, setMeetingCallRoundId] = useState<string>('ALL');
    const [meetingProjectId, setMeetingProjectId] = useState('');
    const [selectedMeetingMemberIds, setSelectedMeetingMemberIds] = useState<string[]>([]);
    const [meetingAt, setMeetingAt] = useState('');
    const [meetingLocation, setMeetingLocation] = useState('');
    const [meetingNote, setMeetingNote] = useState('');

    const isLoading = projectsLoading;

    const instructorProjects = useMemo(() => {
        return projects.filter((p) => p.instructorId === session?.userId);
    }, [projects, session?.userId]);

    const callRoundOptions = useMemo(() => {
        const map = new Map<string, string>();
        instructorProjects.forEach((project) => {
            if (!project.callRoundId) return;
            const callRound = callRounds.find((round) => round.id === project.callRoundId);
            map.set(project.callRoundId, callRound?.name || 'Đợt không xác định');
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [instructorProjects, callRounds]);


    const projectsWithLeader = useMemo<ProjectWithLeader[]>(() => {
        return instructorProjects.map((project) => {
            const projectWithRelations = project as Project;
            const leader = projectWithRelations.leader;
            return {
                ...project,
                leaderInfo: leader
                    ? {
                          id: leader.id,
                          name: leader.name,
                          email: leader.email,
                          code: leader.code ?? null,
                          phone: leader.phone ?? null,
                      }
                    : undefined,
            };
        });
    }, [instructorProjects]);

    const filteredProjects = useMemo(() => {
        const callRoundFiltered =
            selectedCallRoundId === 'ALL'
                ? projectsWithLeader
                : projectsWithLeader.filter((p) => p.callRoundId === selectedCallRoundId);

        if (!searchQuery.trim()) return callRoundFiltered;

        const query = searchQuery.toLowerCase();
        return callRoundFiltered.filter(
            (p) =>
                p.title.toLowerCase().includes(query) ||
                p.leaderInfo?.name.toLowerCase().includes(query) ||
                p.leaderInfo?.code?.toLowerCase().includes(query) ||
                p.leaderInfo?.email.toLowerCase().includes(query),
        );
    }, [projectsWithLeader, searchQuery, selectedCallRoundId]);

    const selectedMeetingProject = useMemo(
        () => projectsWithLeader.find((project) => project.id === meetingProjectId) ?? null,
        [projectsWithLeader, meetingProjectId],
    );

    const meetingCallRoundOptions = useMemo(
        () => callRounds.map((round) => ({ id: round.id, name: round.name })),
        [callRounds],
    );

    const meetingProjects = useMemo(() => {
        if (meetingCallRoundId === 'ALL') {
            return projectsWithLeader;
        }

        return projectsWithLeader.filter((project) => project.callRoundId === meetingCallRoundId);
    }, [meetingCallRoundId, projectsWithLeader]);

    const { data: meetingMembers = [], isLoading: meetingMembersLoading } = useOfficeMeetingMembers(meetingProjectId || undefined);

    const hasAnyMemberSelected = selectedMeetingMemberIds.length > 0;

    useEffect(() => {
        if (!meetingProjectId) {
            return;
        }

        const stillExistsInFilteredProjects = meetingProjects.some((project) => project.id === meetingProjectId);
        if (!stillExistsInFilteredProjects) {
            setMeetingProjectId('');
            setSelectedMeetingMemberIds([]);
        }
    }, [meetingProjectId, meetingProjects]);

    useEffect(() => {
        setSelectedMeetingMemberIds([]);
    }, [meetingProjectId]);

    const openMeetingDialog = (project?: ProjectWithLeader) => {
        const nextCallRoundId = project?.callRoundId ?? 'ALL';
        setMeetingCallRoundId(nextCallRoundId);
        setMeetingProjectId(project?.id ?? '');
        setSelectedMeetingMemberIds([]);
        setMeetingAt('');
        setMeetingLocation('');
        setMeetingNote('');
        setMeetingDialogOpen(true);
    };

    const toggleMeetingMember = (memberId: string, checked: boolean) => {
        setSelectedMeetingMemberIds((prev) => {
            if (checked) {
                if (prev.includes(memberId)) {
                    return prev;
                }
                return [...prev, memberId];
            }
            return prev.filter((id) => id !== memberId);
        });
    };

    const selectAllMeetingMembers = () => {
        setSelectedMeetingMemberIds(meetingMembers.map((member) => member.id));
    };

    const clearSelectedMeetingMembers = () => {
        setSelectedMeetingMemberIds([]);
    };

    const handleScheduleMeeting = () => {
        if (!meetingProjectId) {
            toast.error('Vui lòng chọn đề tài');
            return;
        }

        if (!selectedMeetingProject) {
            toast.error('Đề tài không hợp lệ');
            return;
        }

        if (!meetingAt) {
            toast.error('Vui lòng chọn thời gian họp');
            return;
        }
        if (!meetingLocation.trim()) {
            toast.error('Vui lòng nhập địa điểm họp');
            return;
        }

        createOfficeMeeting.mutate(
            {
                projectId: meetingProjectId,
                meetingTarget: 'GROUP',
                meetingAt,
                location: meetingLocation,
                note: meetingNote.trim() || undefined,
                memberUserIds: selectedMeetingMemberIds.length > 0 ? selectedMeetingMemberIds : undefined,
            },
            {
                onSuccess: () => {
                    toast.success('Đã đặt lịch họp thành công');
                    setMeetingDialogOpen(false);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể đặt lịch họp';
                    toast.error(message);
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-3">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (selectedProjectId) {
        const selectedProject = projectsWithLeader.find((p) => p.id === selectedProjectId);

        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => setSelectedProjectId(null)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại danh sách
                </Button>

                {selectedProject && (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => openMeetingDialog(selectedProject)}>
                                    <CalendarPlus className="h-4 w-4 mr-2" />
                                    Đặt lịch họp
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {selectedProject.leaderInfo?.name || 'N/A'}
                                </span>
                                {selectedProject.leaderInfo?.code && (
                                    <span>MSSV: {selectedProject.leaderInfo.code}</span>
                                )}
                                {selectedProject.leaderInfo?.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-4 w-4" />
                                        {selectedProject.leaderInfo.email}
                                    </span>
                                )}
                                <Badge variant="secondary">{selectedProject.status}</Badge>
                            </div>
                        </CardHeader>
                    </Card>
                )}

                <ProgressReportPanel projectId={selectedProjectId} />
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Danh sách đề tài hướng dẫn</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Có {instructorProjects.length} đề tài bạn đang hướng dẫn
                            </p>
                        </div>
                        <Button onClick={() => openMeetingDialog()}>
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Đặt lịch
                        </Button>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}>
                            <SelectTrigger className="w-full sm:w-60">
                                <SelectValue placeholder="Lọc theo đợt đề tài" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả đợt đề tài</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm đề tài, sinh viên..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                {instructorProjects.length === 0
                                    ? 'Bạn chưa được phân công hướng dẫn đề tài nào.'
                                    : 'Không tìm thấy kết quả phù hợp.'}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">STT</TableHead>
                                        <TableHead>Tên đề tài</TableHead>
                                        <TableHead>Trưởng nhóm</TableHead>
                                        <TableHead>MSSV</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>SĐT</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.map((project, index) => (
                                        <TableRow
                                            key={project.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedProjectId(project.id)}
                                        >
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell className="font-medium max-w-xs">
                                                <div className="line-clamp-2">{project.title}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    {project.leaderInfo?.name || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>{project.leaderInfo?.code || '-'}</TableCell>
                                            <TableCell>
                                                {project.leaderInfo?.email ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <span className="truncate max-w-50">
                                                            {project.leaderInfo.email}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {project.leaderInfo?.phone ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        {project.leaderInfo.phone}
                                                    </div>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openMeetingDialog(project);
                                                        }}
                                                    >
                                                        <CalendarPlus className="h-4 w-4 mr-1" />
                                                        Đặt lịch
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedProjectId(project.id);
                                                        }}
                                                    >
                                                        Xem báo cáo
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
                <DialogContent className='sm:max-w-1/2'>
                    <DialogHeader>
                        <DialogTitle>Đặt lịch họp</DialogTitle>
                        <DialogDescription>
                            Chọn đợt, đề tài và người nhận lịch họp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Đợt đề tài</Label>
                            <Select value={meetingCallRoundId} onValueChange={setMeetingCallRoundId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn đợt đề tài" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả đợt đề tài</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Đề tài</Label>
                            <Select value={meetingProjectId} onValueChange={setMeetingProjectId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn đề tài" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meetingProjects.map((project) => (
                                        <SelectItem key={project.id} value={project.id}>
                                            {project.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {meetingProjects.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Không có đề tài phù hợp trong đợt đã chọn.
                                </p>
                            )}
                        </div>

                        {selectedMeetingProject && (
                            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                                <p className="font-medium">{selectedMeetingProject.title}</p>
                                <p className="text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        Chọn người nhận lịch trong danh sách bên dưới.
                                    </span>
                                </p>
                            </div>
                        )}

                        {selectedMeetingProject && (
                            <div className="space-y-2 rounded-md border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="text-sm font-medium">Thành viên nhận lịch</Label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" size="sm" variant="outline" onClick={selectAllMeetingMembers}>
                                            Chọn tất cả
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={clearSelectedMeetingMembers}
                                        >
                                            Bỏ chọn
                                        </Button>
                                    </div>
                                </div>

                                {meetingMembersLoading ? (
                                    <p className="text-sm text-muted-foreground">Đang tải danh sách thành viên...</p>
                                ) : meetingMembers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Không có dữ liệu thành viên để lựa chọn.</p>
                                ) : (
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {meetingMembers.map((member) => (
                                            <label
                                                key={member.id}
                                                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Checkbox
                                                        checked={selectedMeetingMemberIds.includes(member.id)}
                                                        onCheckedChange={(checked) => toggleMeetingMember(member.id, checked === true)}
                                                    />
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium leading-none">{member.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {member.roleLabel}
                                                            {member.code ? ` - ${member.code}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    {hasAnyMemberSelected
                                        ? `Đã chọn ${selectedMeetingMemberIds.length} thành viên nhận lịch.`
                                        : 'Nếu không chọn thành viên cụ thể, hệ thống sẽ gửi lịch cho toàn bộ đề tài.'}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="meeting-at">Thời gian họp</Label>
                            <Input
                                id="meeting-at"
                                type="datetime-local"
                                value={meetingAt}
                                onChange={(e) => setMeetingAt(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meeting-location">Địa điểm / Link họp</Label>
                            <Input
                                id="meeting-location"
                                placeholder="VD: Phòng A2.03 hoặc https://meet.google.com/..."
                                value={meetingLocation}
                                onChange={(e) => setMeetingLocation(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meeting-note">Ghi chú</Label>
                            <Textarea
                                id="meeting-note"
                                placeholder="Nội dung cần chuẩn bị trước buổi họp..."
                                value={meetingNote}
                                onChange={(e) => setMeetingNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleScheduleMeeting} disabled={createOfficeMeeting.isPending}>
                            {createOfficeMeeting.isPending ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
