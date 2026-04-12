'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useCancelMyProjectRegistration,
    useCreateMyProjectRegistration,
    useMyProjectRegistrations,
    useUpdateMyProjectRegistration,
} from '@/hooks/useMyProjectRegistrations';
import { useMyTeamInvitations } from '@/hooks/useMyTeamInvitations';
import { FileText, MonitorX, PlusCircle, CalendarClock, AlertCircle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useAuthSession } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCallRounds } from '@/hooks/useCallRounds';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMe } from '@/hooks/useMe';
import type { CallRoundWithTemplate } from '@/types/call-round.schema';
import type { ProjectRegistration } from '@/types/project-registration.schema';
import type { User } from '@/types/user.schema';
import { useDebounce } from '@/hooks/useDebounce';
import { useMajors } from '@/hooks/useMajors';
import { useClasses } from '@/hooks/useClasses';

type ProjectRegistrationPageProps = {
    title: string;
};

type TeamMemberInput = {
    name: string;
    role: string;
    studentId?: string;
    invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    invitedAt?: Date;
    respondedAt?: Date | null;
};

type TeamMemberPickerMode = 'create' | 'edit';

const MEMBER_PICKER_LIMIT = 7;

const statusLabel: Record<string, string> = {
    PENDING: 'Chờ phê duyệt',
    APPROVED: 'Đã phê duyệt',
    CANCELED: 'Đã hủy',
    REJECTED: 'Bị từ chối',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    CANCELED: 'outline',
    REJECTED: 'destructive',
};

type DisplayRegistrationStatus = 'PENDING_INSTRUCTOR' | 'PENDING_FACULTY' | 'APPROVED' | 'CANCELED' | 'REJECTED';

const displayStatusLabel: Record<DisplayRegistrationStatus, string> = {
    PENDING_INSTRUCTOR: 'Chờ giảng viên duyệt',
    PENDING_FACULTY: 'Chờ khoa duyệt',
    APPROVED: 'Đã phê duyệt',
    CANCELED: 'Đã hủy',
    REJECTED: 'Bị từ chối',
};

const displayStatusVariant: Record<DisplayRegistrationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING_INSTRUCTOR: 'secondary',
    PENDING_FACULTY: 'secondary',
    APPROVED: 'default',
    CANCELED: 'outline',
    REJECTED: 'destructive',
};

const invitationStatusLabel: Record<'PENDING' | 'ACCEPTED' | 'REJECTED', string> = {
    PENDING: 'Chờ xác nhận',
    ACCEPTED: 'Đã đồng ý',
    REJECTED: 'Đã từ chối',
};

const invitationStatusVariant: Record<'PENDING' | 'ACCEPTED' | 'REJECTED', 'secondary' | 'default' | 'destructive'> = {
    PENDING: 'secondary',
    ACCEPTED: 'default',
    REJECTED: 'destructive',
};

const toStartOfDay = (value: Date | string): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const toEndOfDay = (value: Date | string): Date => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const isDateWithinRangeByDay = (startDate: Date | string, endDate: Date | string, now: Date = new Date()): boolean => {
    const current = new Date(now);
    return current >= toStartOfDay(startDate) && current <= toEndOfDay(endDate);
};

const getDisplayStatus = (item: ProjectRegistration): DisplayRegistrationStatus => {
    if (item.status === 'CANCELED') {
        return 'CANCELED';
    }

    if (item.status === 'APPROVED' || item.facultyStatus === 'APPROVED') {
        return 'APPROVED';
    }

    if (item.status === 'REJECTED' || item.facultyStatus === 'REJECTED' || item.instructorStatus === 'REJECTED') {
        return 'REJECTED';
    }

    if (item.instructorId && item.instructorStatus !== 'ACCEPTED') {
        return 'PENDING_INSTRUCTOR';
    }

    return 'PENDING_FACULTY';
};

const isCallRoundEnded = (item: ProjectRegistration): boolean => {
    const endDate = item.callRound?.registrationEndDate;
    if (!endDate) {
        return false;
    }

    return new Date() > toEndOfDay(endDate);
};

export function ProjectRegistrationPage({ title }: ProjectRegistrationPageProps) {
    const [projectTitle, setProjectTitle] = useState('');
    const [objective, setObjective] = useState('');
    const [expectedOutput, setExpectedOutput] = useState('');
    const [instructorId, setInstructorId] = useState('');
    const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>('');
    const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);
    const [editingRegistration, setEditingRegistration] = useState<ProjectRegistration | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editObjective, setEditObjective] = useState('');
    const [editExpectedOutput, setEditExpectedOutput] = useState('');
    const [editTeamMembers, setEditTeamMembers] = useState<TeamMemberInput[]>([]);
    const [memberPickerOpen, setMemberPickerOpen] = useState(false);
    const [memberPickerMode, setMemberPickerMode] = useState<TeamMemberPickerMode>('create');
    const [memberKeyword, setMemberKeyword] = useState('');
    const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [historySearchKeyword, setHistorySearchKeyword] = useState('');
    const [historyCallRoundFilter, setHistoryCallRoundFilter] = useState('all');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | DisplayRegistrationStatus>('all');
    const { data: me } = useMe();
    const { data: session } = useAuthSession();
    const myDepartmentId = me?.departmentId ?? undefined;
    const debouncedMemberKeyword = useDebounce(memberKeyword, 300);
    const { data: majorsData } = useMajors(
        {
            departmentId: myDepartmentId,
            page: 1,
            limit: 200,
        },
        { enabled: Boolean(myDepartmentId) && memberPickerOpen },
    );
    const majors = majorsData?.data ?? [];
    const selectedMajorFilter = selectedMajorId !== 'all' ? selectedMajorId : undefined;
    const { data: classesData } = useClasses(
        {
            departmentId: myDepartmentId,
            majorId: selectedMajorFilter,
            page: 1,
            limit: 200,
        },
        { enabled: Boolean(myDepartmentId) && memberPickerOpen },
    );
    const classes = classesData?.data ?? [];
    const { data: departmentStudentsData, isLoading: isLoadingDepartmentStudents } = useUsers(
        {
            role: 'STUDENT',
            departmentId: myDepartmentId,
            majorId: selectedMajorFilter,
            classId: selectedClassId !== 'all' ? selectedClassId : undefined,
            search: debouncedMemberKeyword.trim() || undefined,
            page: 1,
            limit: MEMBER_PICKER_LIMIT,
        },
        { enabled: Boolean(myDepartmentId) && memberPickerOpen },
    );
    const departmentStudents = departmentStudentsData?.data ?? [];
    const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});

    const { data: registrations = [], isLoading } = useMyProjectRegistrations();
    const { data: myTeamInvitations = [] } = useMyTeamInvitations();
    const { data: callRounds = [] } = useCallRounds();
    const createMutation = useCreateMyProjectRegistration();
    const cancelMutation = useCancelMyProjectRegistration();
    const updateMutation = useUpdateMyProjectRegistration();

    const availableCallRounds = React.useMemo(() => {
        const now = new Date();
        const role = session?.role;

        if (role !== 'STUDENT' && role !== 'LECTURER') {
            return [];
        }

        return (callRounds as CallRoundWithTemplate[]).filter((round) => {
            if (!round.isActive) return false;
            if (round.approvalStatus !== 'APPROVED') return false;
            if (role === 'STUDENT' && !['STUDENT', 'BOTH'].includes(round.applicableFor)) return false;
            if (role === 'LECTURER' && !['LECTURER', 'BOTH'].includes(round.applicableFor)) return false;
            return isDateWithinRangeByDay(round.registrationStartDate, round.registrationEndDate, now);
        });
    }, [callRounds, session?.role]);

    const activeCallRound = React.useMemo(() => {
        if (availableCallRounds.length === 0) return undefined;
        if (availableCallRounds.length === 1) return availableCallRounds[0];
        return availableCallRounds.find((r) => r.id === selectedCallRoundId) ?? undefined;
    }, [availableCallRounds, selectedCallRoundId]);

    const acceptedInstructorsInActiveCallRound = React.useMemo(() => {
        if (!activeCallRound?.availableInstructors) {
            return [];
        }

        return activeCallRound.availableInstructors.filter((item) => item.invitationStatus === 'ACCEPTED');
    }, [activeCallRound]);

    React.useEffect(() => {
        if (availableCallRounds.length === 1 && selectedCallRoundId !== availableCallRounds[0].id) {
            setSelectedCallRoundId(availableCallRounds[0].id);
        }
    }, [availableCallRounds, selectedCallRoundId]);

    React.useEffect(() => {
        if (!instructorId) {
            return;
        }

        const isInstructorStillEligible = acceptedInstructorsInActiveCallRound.some(
            (item) => item.instructor.id === instructorId,
        );

        if (!isInstructorStillEligible) {
            setInstructorId('');
        }
    }, [acceptedInstructorsInActiveCallRound, instructorId]);

    const sortedRegistrations = React.useMemo(() => {
        return [...registrations].sort((a, b) => {
            const aConfirmed =
                a.status === 'APPROVED' || a.facultyStatus === 'APPROVED' || a.instructorStatus === 'ACCEPTED';
            const bConfirmed =
                b.status === 'APPROVED' || b.facultyStatus === 'APPROVED' || b.instructorStatus === 'ACCEPTED';
            if (aConfirmed && !bConfirmed) return -1;
            if (!aConfirmed && bConfirmed) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [registrations]);

    const historyCallRoundOptions = React.useMemo(() => {
        const seen = new Set<string>();
        return sortedRegistrations
            .map((registration) => registration.callRound)
            .filter((callRound): callRound is NonNullable<ProjectRegistration['callRound']> => Boolean(callRound))
            .filter((callRound) => {
                if (seen.has(callRound.id)) {
                    return false;
                }

                seen.add(callRound.id);
                return true;
            });
    }, [sortedRegistrations]);

    const filteredHistoryRegistrations = React.useMemo(() => {
        const keyword = historySearchKeyword.trim().toLowerCase();

        return sortedRegistrations.filter((registration) => {
            const displayStatus = getDisplayStatus(registration);

            if (historyCallRoundFilter !== 'all' && registration.callRoundId !== historyCallRoundFilter) {
                return false;
            }

            if (historyStatusFilter !== 'all' && displayStatus !== historyStatusFilter) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            const teamMembers = (registration.teamMembers as TeamMemberInput[] | null | undefined) ?? [];
            const textPool = [
                registration.title,
                registration.objective,
                registration.expectedOutput ?? '',
                registration.instructor?.name ?? '',
                registration.callRound?.name ?? '',
                displayStatusLabel[displayStatus],
                ...teamMembers.map((member) => `${member.name} ${member.role}`),
            ]
                .join(' ')
                .toLowerCase();

            return textPool.includes(keyword);
        });
    }, [historyCallRoundFilter, historySearchKeyword, historyStatusFilter, sortedRegistrations]);

    const hasRegistrationInSelectedCallRound = React.useMemo(() => {
        if (!activeCallRound) return false;

        return registrations.some(
            (r) =>
                r.callRoundId === activeCallRound.id &&
                (r.status === 'APPROVED' ||
                    r.facultyStatus === 'APPROVED' ||
                    (r.status === 'PENDING' && r.instructorStatus !== 'REJECTED')),
        );
    }, [activeCallRound, registrations]);

    const hasAcceptedInvitationInSelectedCallRound = React.useMemo(() => {
        if (!activeCallRound) return false;

        return myTeamInvitations.some(
            (invitation) => invitation.callRoundId === activeCallRound.id && invitation.invitationStatus === 'ACCEPTED',
        );
    }, [activeCallRound, myTeamInvitations]);

    const isFormDisabled =
        !activeCallRound || hasRegistrationInSelectedCallRound || hasAcceptedInvitationInSelectedCallRound;

    const normalizeTeamMembers = (members: TeamMemberInput[]) => {
        const trimmed = members.map((member) => ({
            name: member.name.trim(),
            role: member.role.trim(),
            studentId: member.studentId,
            invitationStatus: member.invitationStatus,
            invitedAt: member.invitedAt,
            respondedAt: member.respondedAt,
        }));

        const hasIncomplete = trimmed.some(
            (member) =>
                (member.name.length > 0 && member.role.length === 0) ||
                (member.role.length > 0 && member.name.length === 0),
        );

        if (hasIncomplete) {
            return { valid: false, data: [] as TeamMemberInput[] };
        }

        return {
            valid: true,
            data: trimmed.filter((member) => member.name.length > 0 && member.role.length > 0),
        };
    };

    const openMemberPicker = (mode: TeamMemberPickerMode) => {
        const targetMembers = mode === 'edit' ? editTeamMembers : teamMembers;
        if (targetMembers.length >= 5) {
            toast.error('Tối đa 5 thành viên nhóm');
            return;
        }

        if (!myDepartmentId) {
            toast.error('Không xác định được khoa của bạn để lọc sinh viên');
            return;
        }

        setMemberPickerMode(mode);
        setMemberKeyword('');
        setSelectedMajorId('all');
        setSelectedClassId('all');
        setMemberPickerOpen(true);
    };

    const handleMajorFilterChange = (value: string) => {
        setSelectedMajorId(value);
        setSelectedClassId('all');
    };

    const filteredDepartmentStudents = React.useMemo(() => {
        const targetMembers = memberPickerMode === 'edit' ? editTeamMembers : teamMembers;
        const usedIds = new Set(
            targetMembers.map((member) => member.studentId).filter((id): id is string => Boolean(id)),
        );
        const usedNames = new Set(targetMembers.map((member) => member.name.trim().toLowerCase()).filter(Boolean));
        const keyword = memberKeyword.trim().toLowerCase();

        return departmentStudents
            .filter((student) => student.id !== session?.userId)
            .filter((student) => {
                const normalizedName = student.name.trim().toLowerCase();
                if (usedIds.has(student.id) || usedNames.has(normalizedName)) {
                    return false;
                }

                if (!keyword) {
                    return true;
                }

                return (
                    student.name.toLowerCase().includes(keyword) ||
                    student.email.toLowerCase().includes(keyword) ||
                    (student.code ?? '').toLowerCase().includes(keyword)
                );
            });
    }, [departmentStudents, editTeamMembers, memberKeyword, memberPickerMode, session?.userId, teamMembers]);

    const addStudentToTeam = (student: User) => {
        const applyAdd = (members: TeamMemberInput[]): TeamMemberInput[] => {
            if (members.length >= 5) {
                toast.error('Tối đa 5 thành viên nhóm');
                return members;
            }

            const normalizedName = student.name.trim().toLowerCase();
            const isDuplicated = members.some(
                (member) => member.studentId === student.id || member.name.trim().toLowerCase() === normalizedName,
            );

            if (isDuplicated) {
                toast.error('Sinh viên này đã có trong nhóm');
                return members;
            }

            return [...members, { name: student.name, role: 'Thành viên', studentId: student.id }];
        };

        if (memberPickerMode === 'edit') {
            setEditTeamMembers((prev) => applyAdd(prev));
        } else {
            setTeamMembers((prev) => applyAdd(prev));
        }

        setMemberPickerOpen(false);
    };

    const handleCreate = () => {
        if (!activeCallRound) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }
        if (!projectTitle.trim()) {
            toast.error('Vui lòng nhập tên đề tài');
            return;
        }
        if (!objective.trim()) {
            toast.error('Vui lòng nhập mục tiêu nghiên cứu');
            return;
        }
        if (!instructorId) {
            toast.error('Vui lòng chọn giảng viên hướng dẫn');
            return;
        }

        if (acceptedInstructorsInActiveCallRound.length === 0) {
            toast.error('Đợt này chưa có giảng viên nào chấp nhận lời mời hướng dẫn.');
            return;
        }

        const isSelectedInstructorAccepted = acceptedInstructorsInActiveCallRound.some(
            (item) => item.instructor.id === instructorId,
        );

        if (!isSelectedInstructorAccepted) {
            toast.error('Giảng viên được chọn chưa chấp nhận lời mời tham gia đợt này.');
            return;
        }

        const normalizedMembers = normalizeTeamMembers(teamMembers);
        if (!normalizedMembers.valid) {
            toast.error('Vui lòng nhập đầy đủ tên và vai trò cho từng thành viên nhóm');
            return;
        }

        createMutation.mutate(
            {
                title: projectTitle,
                objective,
                expectedOutput: expectedOutput.trim() ? expectedOutput : null,
                teamMembers: normalizedMembers.data,
                instructorId,
                callRoundId: activeCallRound.id,
            },
            {
                onSuccess: () => {
                    toast.success('Đăng ký đề tài thành công');
                    setProjectTitle('');
                    setObjective('');
                    setExpectedOutput('');
                    setInstructorId('');
                    setTeamMembers([]);
                },
                onError: (err: unknown) => {
                    const msg = err instanceof Error ? err.message : 'Không thể đăng ký đề tài';
                    toast.error(msg);
                },
            },
        );
    };

    const handleCancel = (id: string) => {
        const cancelReason = cancelReasonById[id]?.trim();

        if (!cancelReason) {
            toast.error('Vui lòng nhập lý do hủy');
            return;
        }

        cancelMutation.mutate(
            { id, payload: { cancelReason } },
            {
                onSuccess: () => {
                    toast.success('Đã hủy đăng ký đề tài');
                    setCancelReasonById((prev) => ({ ...prev, [id]: '' }));
                },
                onError: () => {
                    toast.error('Không thể hủy đăng ký đề tài');
                },
            },
        );
    };

    const canEditRegistration = (item: ProjectRegistration) => {
        return item.status === 'PENDING' && item.instructorStatus === 'PENDING' && item.facultyStatus === 'PENDING';
    };

    const openEditDialog = (item: ProjectRegistration) => {
        setEditingRegistration(item);
        setEditTitle(item.title);
        setEditObjective(item.objective);
        setEditExpectedOutput(item.expectedOutput ?? '');
        setEditTeamMembers((item.teamMembers as TeamMemberInput[] | null | undefined) ?? []);
    };

    const closeEditDialog = () => {
        setEditingRegistration(null);
        setEditTitle('');
        setEditObjective('');
        setEditExpectedOutput('');
        setEditTeamMembers([]);
    };

    const handleUpdate = () => {
        if (!editingRegistration) return;
        if (!editTitle.trim()) {
            toast.error('Vui lòng nhập tên đề tài');
            return;
        }
        if (!editObjective.trim()) {
            toast.error('Vui lòng nhập mục tiêu nghiên cứu');
            return;
        }

        const normalizedMembers = normalizeTeamMembers(editTeamMembers);
        if (!normalizedMembers.valid) {
            toast.error('Vui lòng nhập đầy đủ tên và vai trò cho từng thành viên nhóm');
            return;
        }

        updateMutation.mutate(
            {
                id: editingRegistration.id,
                payload: {
                    title: editTitle,
                    objective: editObjective,
                    expectedOutput: editExpectedOutput.trim() || null,
                    teamMembers: normalizedMembers.data,
                },
            },
            {
                onSuccess: () => {
                    toast.success('Cập nhật đề tài thành công');
                    closeEditDialog();
                },
                onError: (err: unknown) => {
                    const msg = err instanceof Error ? err.message : 'Không thể cập nhật đề tài';
                    toast.error(msg);
                },
            },
        );
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
                <p className="text-muted-foreground">Quản lý các đề xuất và thuyết minh nghiên cứu khoa học.</p>
            </div>

            {availableCallRounds.length === 0 ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Chưa mở đợt đăng ký</AlertTitle>
                    <AlertDescription>
                        Hiện tại chưa có đợt đăng ký phù hợp (đã duyệt và đúng đối tượng) đang mở. Vui lòng liên hệ quản
                        trị viên để biết thêm chi tiết.
                    </AlertDescription>
                </Alert>
            ) : availableCallRounds.length > 1 ? (
                <Alert className="border-primary/50 bg-primary/5">
                    <CalendarClock className="h-4 w-4" />
                    <AlertTitle>Có {availableCallRounds.length} đợt đăng ký đang mở</AlertTitle>
                    <AlertDescription>
                        <div className="mt-2 space-y-1">
                            {availableCallRounds.map((round) => (
                                <div key={round.id} className="text-xs">
                                    <strong>{round.name}</strong>:{' '}
                                    {new Date(round.registrationStartDate).toLocaleDateString('vi-VN')} –{' '}
                                    {new Date(round.registrationEndDate).toLocaleDateString('vi-VN')}
                                </div>
                            ))}
                        </div>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert className="border-primary/50 bg-primary/5">
                    <CalendarClock className="h-4 w-4" />
                    <AlertTitle>Đợt đăng ký hiện tại: {availableCallRounds[0].name}</AlertTitle>
                    <AlertDescription>
                        Thời gian đăng ký:{' '}
                        {new Date(availableCallRounds[0].registrationStartDate).toLocaleDateString('vi-VN')} –{' '}
                        {new Date(availableCallRounds[0].registrationEndDate).toLocaleDateString('vi-VN')}
                        {availableCallRounds[0].template && (
                            <span className="block mt-1 text-xs">
                                Template tiến độ: {availableCallRounds[0].template.name}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="border-border/50 shadow-sm sticky top-6">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PlusCircle className="h-5 w-5 text-primary" />
                                Đăng ký đề tài mới
                            </CardTitle>
                            <CardDescription>Điền thông tin cơ bản để đề xuất thuyết minh.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            {activeCallRound && hasRegistrationInSelectedCallRound && (
                                <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 text-amber-900">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800">Đã có đăng ký</AlertTitle>
                                    <AlertDescription className="text-amber-700">
                                        Bạn đã có đề tài đang chờ duyệt hoặc đã được duyệt. Mỗi sinh viên chỉ được đăng
                                        ký 1 đề tài trong mỗi đợt.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {activeCallRound && hasAcceptedInvitationInSelectedCallRound && (
                                <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 text-amber-900">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800">Đã tham gia nhóm đề tài</AlertTitle>
                                    <AlertDescription className="text-amber-700">
                                        Bạn đã xác nhận tham gia một đề tài trong đợt đăng ký này, nên không thể đăng ký
                                        thêm đề tài mới.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {availableCallRounds.length > 1 && (
                                <div className="space-y-2 flex flex-col">
                                    <Label className="text-muted-foreground">
                                        Chọn đợt đăng ký <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="-- Chọn đợt đăng ký --" />
                                        </SelectTrigger>
                                        <SelectContent className="w-full">
                                            {availableCallRounds.map((round) => (
                                                <SelectItem key={round.id} value={round.id}>
                                                    <div className="flex flex-col px-6">
                                                        <span>{round.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(round.registrationStartDate).toLocaleDateString(
                                                                'vi-VN',
                                                            )}{' '}
                                                            –{' '}
                                                            {new Date(round.registrationEndDate).toLocaleDateString(
                                                                'vi-VN',
                                                            )}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!activeCallRound && selectedCallRoundId === '' && (
                                        <p className="text-xs text-muted-foreground">
                                            Vui lòng chọn đợt đăng ký để tiếp tục.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">
                                    Tên đề tài <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={projectTitle}
                                    onChange={(e) => setProjectTitle(e.target.value)}
                                    placeholder="Nhập tên đề tài nghiên cứu..."
                                    className="bg-background"
                                    disabled={isFormDisabled}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">
                                    Mục tiêu <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    placeholder="Mục tiêu chính của nghiên cứu là gì?"
                                    className="min-h-24 bg-background"
                                    disabled={isFormDisabled}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Sản phẩm dự kiến</Label>
                                <Textarea
                                    value={expectedOutput}
                                    onChange={(e) => setExpectedOutput(e.target.value)}
                                    placeholder="Ví dụ: 01 bài báo ISI, 01 phần mềm..."
                                    className="min-h-20 bg-background"
                                    disabled={isFormDisabled}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-muted-foreground">Thành viên nhóm (tối đa 5)</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openMemberPicker('create')}
                                        disabled={isFormDisabled || teamMembers.length >= 5}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Thêm thành viên
                                    </Button>
                                </div>
                                {teamMembers.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Bấm "Thêm thành viên" để chọn sinh viên cùng khoa.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {teamMembers.map((member, index) => (
                                            <div
                                                key={`${index}-${member.name}`}
                                                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
                                            >
                                                <Input
                                                    value={member.name}
                                                    onChange={(e) =>
                                                        setTeamMembers((prev) =>
                                                            prev.map((item, i) =>
                                                                i === index ? { ...item, name: e.target.value } : item,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Tên thành viên"
                                                    disabled={isFormDisabled}
                                                />
                                                <Input
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        setTeamMembers((prev) =>
                                                            prev.map((item, i) =>
                                                                i === index ? { ...item, role: e.target.value } : item,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Role (nhập tay)"
                                                    disabled={isFormDisabled}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setTeamMembers((prev) => prev.filter((_, i) => i !== index))
                                                    }
                                                    disabled={isFormDisabled}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-muted-foreground">
                                    Người hướng dẫn <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={instructorId}
                                    onValueChange={setInstructorId}
                                    disabled={isFormDisabled || acceptedInstructorsInActiveCallRound.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn người hướng dẫn" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {acceptedInstructorsInActiveCallRound.length > 0
                                            ? acceptedInstructorsInActiveCallRound.map((item) => (
                                                  <SelectItem key={item.instructor.id} value={item.instructor.id}>
                                                      {item.instructor.name} - {item.instructor.email}
                                                  </SelectItem>
                                              ))
                                            : (
                                                  <SelectItem value="__no-accepted-instructor__" disabled>
                                                      Chưa có giảng viên chấp nhận lời mời
                                                  </SelectItem>
                                              )}
                                    </SelectContent>
                                </Select>
                                {activeCallRound && acceptedInstructorsInActiveCallRound.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Chỉ hiển thị {acceptedInstructorsInActiveCallRound.length} giảng viên đã
                                            chấp nhận lời mời trong đợt này
                                        </p>
                                    )}
                                {activeCallRound && acceptedInstructorsInActiveCallRound.length === 0 && (
                                    <p className="text-xs text-amber-600">
                                        Chưa có giảng viên nào chấp nhận lời mời hướng dẫn cho đợt này.
                                    </p>
                                )}
                            </div>

                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || isFormDisabled}
                                className="w-full"
                            >
                                {hasRegistrationInSelectedCallRound
                                    ? 'Đã đăng ký đề tài'
                                    : hasAcceptedInvitationInSelectedCallRound
                                      ? 'Đã tham gia đề tài trong đợt này'
                                      : !activeCallRound
                                        ? 'Chưa mở đợt đăng ký'
                                        : createMutation.isPending
                                          ? 'Đang xử lý...'
                                          : 'Gửi đăng ký'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Lịch sử đề xuất
                            </CardTitle>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
                                <Input
                                    value={historySearchKeyword}
                                    onChange={(event) => setHistorySearchKeyword(event.target.value)}
                                    placeholder="Tìm theo tên đề tài, mục tiêu, giảng viên..."
                                />
                                <Select value={historyCallRoundFilter} onValueChange={setHistoryCallRoundFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Lọc theo đợt" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả đợt</SelectItem>
                                        {historyCallRoundOptions.map((callRound) => (
                                            <SelectItem key={callRound.id} value={callRound.id}>
                                                {callRound.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={historyStatusFilter}
                                    onValueChange={(value) =>
                                        setHistoryStatusFilter(value as 'all' | DisplayRegistrationStatus)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Lọc theo trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                        <SelectItem value="PENDING_INSTRUCTOR">Chờ giảng viên duyệt</SelectItem>
                                        <SelectItem value="PENDING_FACULTY">Chờ khoa duyệt</SelectItem>
                                        <SelectItem value="APPROVED">Đã phê duyệt</SelectItem>
                                        <SelectItem value="CANCELED">Đã hủy</SelectItem>
                                        <SelectItem value="REJECTED">Bị từ chối</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-8 text-center text-muted-foreground animate-pulse">
                                    Đang tải danh sách...
                                </div>
                            ) : registrations.length === 0 ? (
                                <div className="p-16 flex flex-col items-center justify-center text-center">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <MonitorX className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">
                                        Chưa có đề tài nào được đăng ký.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[40%] pl-6">Nội dung đề xuất</TableHead>
                                                <TableHead>Người HD</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead>Thao tác</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredHistoryRegistrations.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={4}
                                                        className="text-center text-muted-foreground py-8"
                                                    >
                                                        Không tìm thấy đề xuất phù hợp bộ lọc.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredHistoryRegistrations.map((item) => {
                                                    const displayStatus = getDisplayStatus(item);
                                                    const roundEnded = isCallRoundEnded(item);

                                                    return (
                                                        <TableRow key={item.id} className="group">
                                                            <TableCell className="pl-6 py-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <p className="font-semibold text-primary leading-tight hover:underline cursor-pointer">
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <span>{item.title}</span>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                                                                <DialogHeader>
                                                                                    <DialogTitle>
                                                                                        Chi tiết đề xuất nghiên cứu
                                                                                    </DialogTitle>
                                                                                </DialogHeader>
                                                                                <div className="space-y-5 py-4">
                                                                                    {/* Thông tin cơ bản */}
                                                                                    <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-950/20 p-4">
                                                                                        <div className="flex items-center gap-2 mb-3">
                                                                                            <FileText className="h-4 w-4 text-blue-600" />
                                                                                            <h3 className="font-semibold text-sm">
                                                                                                Thông tin đăng ký
                                                                                            </h3>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                            <div>
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Mã đăng ký
                                                                                                </h4>
                                                                                                <p className="text-sm font-mono font-medium">
                                                                                                    {item.id}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Đợt đăng ký
                                                                                                </h4>
                                                                                                <p className="text-sm font-medium">
                                                                                                    {item.callRound
                                                                                                        ?.name ||
                                                                                                        'Chưa gắn đợt đề tài'}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Ngày tạo
                                                                                                </h4>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                                    <p className="text-sm">
                                                                                                        {new Date(
                                                                                                            item.createdAt,
                                                                                                        ).toLocaleString(
                                                                                                            'vi-VN',
                                                                                                        )}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Cập nhật gần nhất
                                                                                                </h4>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                                    <p className="text-sm">
                                                                                                        {new Date(
                                                                                                            item.updatedAt,
                                                                                                        ).toLocaleString(
                                                                                                            'vi-VN',
                                                                                                        )}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Mốc thời gian quan trọng */}
                                                                                    <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
                                                                                        <div className="flex items-center gap-2 mb-3">
                                                                                            <CalendarClock className="h-4 w-4 text-amber-600" />
                                                                                            <h3 className="font-semibold text-sm">
                                                                                                Mốc thời gian đề tài
                                                                                            </h3>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                            <div className="rounded-lg bg-white/70 dark:bg-slate-900/30 p-3">
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Bắt đầu đăng ký
                                                                                                </h4>
                                                                                                <p className="text-sm font-medium">
                                                                                                    {item.callRound
                                                                                                        ?.registrationStartDate
                                                                                                        ? new Date(
                                                                                                              item
                                                                                                                  .callRound
                                                                                                                  .registrationStartDate,
                                                                                                          ).toLocaleDateString(
                                                                                                              'vi-VN',
                                                                                                              {
                                                                                                                  day: '2-digit',
                                                                                                                  month: '2-digit',
                                                                                                                  year: 'numeric',
                                                                                                              },
                                                                                                          )
                                                                                                        : '—'}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="rounded-lg bg-white/70 dark:bg-slate-900/30 p-3">
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Kết thúc đăng ký
                                                                                                </h4>
                                                                                                <p className="text-sm font-medium">
                                                                                                    {item.callRound
                                                                                                        ?.registrationEndDate
                                                                                                        ? new Date(
                                                                                                              item
                                                                                                                  .callRound
                                                                                                                  .registrationEndDate,
                                                                                                          ).toLocaleDateString(
                                                                                                              'vi-VN',
                                                                                                              {
                                                                                                                  day: '2-digit',
                                                                                                                  month: '2-digit',
                                                                                                                  year: 'numeric',
                                                                                                              },
                                                                                                          )
                                                                                                        : '—'}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="rounded-lg bg-white/70 dark:bg-slate-900/30 p-3">
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Ngày bắt đầu đề tài
                                                                                                </h4>
                                                                                                <p className="text-sm font-medium">
                                                                                                    {item.callRound
                                                                                                        ?.projectStartDate
                                                                                                        ? new Date(
                                                                                                              item
                                                                                                                  .callRound
                                                                                                                  .projectStartDate,
                                                                                                          ).toLocaleDateString(
                                                                                                              'vi-VN',
                                                                                                              {
                                                                                                                  day: '2-digit',
                                                                                                                  month: '2-digit',
                                                                                                                  year: 'numeric',
                                                                                                              },
                                                                                                          )
                                                                                                        : '—'}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="rounded-lg bg-white/70 dark:bg-slate-900/30 p-3">
                                                                                                <h4 className="font-medium text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                                                                                                    Ngày kết thúc đề tài
                                                                                                </h4>
                                                                                                <p className="text-sm font-medium">
                                                                                                    {item.callRound
                                                                                                        ?.projectEndDate
                                                                                                        ? new Date(
                                                                                                              item
                                                                                                                  .callRound
                                                                                                                  .projectEndDate,
                                                                                                          ).toLocaleDateString(
                                                                                                              'vi-VN',
                                                                                                              {
                                                                                                                  day: '2-digit',
                                                                                                                  month: '2-digit',
                                                                                                                  year: 'numeric',
                                                                                                              },
                                                                                                          )
                                                                                                        : '—'}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Tên đề tài
                                                                                        </h4>
                                                                                        <p className="text-sm font-medium">
                                                                                            {item.title}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Mục tiêu
                                                                                        </h4>
                                                                                        <p
                                                                                            className="text-sm whitespace-pre-wrap"
                                                                                            style={{
                                                                                                whiteSpace:
                                                                                                    'pre-wrap !important',
                                                                                            }}
                                                                                        >
                                                                                            {item.objective ||
                                                                                                'Chưa có thông tin'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Sản phẩm dự kiến
                                                                                        </h4>
                                                                                        <p className="text-sm whitespace-pre-wrap">
                                                                                            {item.expectedOutput ||
                                                                                                'Chưa có thông tin'}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Người hướng dẫn
                                                                                        </h4>
                                                                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                                                                            <span>
                                                                                                {item.instructor
                                                                                                    ? item.instructor
                                                                                                          .name
                                                                                                    : 'Chưa phân công'}
                                                                                            </span>
                                                                                            <Badge variant="outline">
                                                                                                {item.instructorStatus ===
                                                                                                'ACCEPTED'
                                                                                                    ? 'Đã đồng ý'
                                                                                                    : item.instructorStatus ===
                                                                                                        'REJECTED'
                                                                                                      ? 'Từ chối'
                                                                                                      : 'Chờ xác nhận'}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Thành viên nhóm
                                                                                        </h4>
                                                                                        {(
                                                                                            item.teamMembers as
                                                                                                | TeamMemberInput[]
                                                                                                | null
                                                                                                | undefined
                                                                                        )?.length ? (
                                                                                            <div className="space-y-2">
                                                                                                {(
                                                                                                    item.teamMembers as TeamMemberInput[]
                                                                                                ).map(
                                                                                                    (member, index) => (
                                                                                                        <div
                                                                                                            key={`${member.name}-${index}`}
                                                                                                            className="text-sm flex flex-wrap items-center gap-2"
                                                                                                        >
                                                                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                                                                            <span className="font-medium">
                                                                                                                {
                                                                                                                    member.name
                                                                                                                }
                                                                                                            </span>
                                                                                                            <Badge variant="outline">
                                                                                                                {
                                                                                                                    member.role
                                                                                                                }
                                                                                                            </Badge>
                                                                                                            {member.invitationStatus && (
                                                                                                                <Badge
                                                                                                                    variant={
                                                                                                                        invitationStatusVariant[
                                                                                                                            member
                                                                                                                                .invitationStatus
                                                                                                                        ]
                                                                                                                    }
                                                                                                                >
                                                                                                                    {
                                                                                                                        invitationStatusLabel[
                                                                                                                            member
                                                                                                                                .invitationStatus
                                                                                                                        ]
                                                                                                                    }
                                                                                                                </Badge>
                                                                                                            )}
                                                                                                            {member.invitedAt && (
                                                                                                                <span className="text-xs text-muted-foreground">
                                                                                                                    Mời:{' '}
                                                                                                                    {new Date(
                                                                                                                        member.invitedAt,
                                                                                                                    ).toLocaleString(
                                                                                                                        'vi-VN',
                                                                                                                    )}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ),
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <p className="text-sm text-muted-foreground">
                                                                                                Chưa có thành viên nhóm
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                            Trạng thái xử lý tổng quan
                                                                                        </h4>
                                                                                        <Badge
                                                                                            variant={
                                                                                                displayStatusVariant[
                                                                                                    displayStatus
                                                                                                ]
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                displayStatusLabel[
                                                                                                    displayStatus
                                                                                                ]
                                                                                            }
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                        <div>
                                                                                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                                Trạng thái đăng ký
                                                                                            </h4>
                                                                                            <Badge
                                                                                                variant={
                                                                                                    statusVariant[
                                                                                                        item.status
                                                                                                    ] || 'default'
                                                                                                }
                                                                                            >
                                                                                                {statusLabel[
                                                                                                    item.status
                                                                                                ] || item.status}
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <div>
                                                                                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                                Trạng thái giảng viên
                                                                                            </h4>
                                                                                            <Badge variant="outline">
                                                                                                {item.instructorStatus ===
                                                                                                'ACCEPTED'
                                                                                                    ? 'Đã đồng ý'
                                                                                                    : item.instructorStatus ===
                                                                                                        'REJECTED'
                                                                                                      ? 'Từ chối'
                                                                                                      : 'Chờ xác nhận'}
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <div>
                                                                                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                                Trạng thái cấp khoa
                                                                                            </h4>
                                                                                            <Badge variant="outline">
                                                                                                {item.facultyStatus ===
                                                                                                'APPROVED'
                                                                                                    ? 'Đã duyệt'
                                                                                                    : item.facultyStatus ===
                                                                                                        'REJECTED'
                                                                                                      ? 'Từ chối'
                                                                                                      : 'Đang chờ'}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    </div>
                                                                                    {item.cancelReason && (
                                                                                        <div>
                                                                                            <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                                                                Lý do hủy/từ chối
                                                                                            </h4>
                                                                                            <p className="text-sm text-destructive">
                                                                                                {item.cancelReason}
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    </p>
                                                                    <p
                                                                        className="text-sm text-muted-foreground truncate max-w-60"
                                                                        title={item.objective}
                                                                    >
                                                                        {item.objective}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.instructor ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-medium text-sm">
                                                                            {item.instructor.name}
                                                                        </span>
                                                                        <Badge
                                                                            variant={
                                                                                item.instructorStatus === 'ACCEPTED'
                                                                                    ? 'default'
                                                                                    : item.instructorStatus ===
                                                                                        'REJECTED'
                                                                                      ? 'destructive'
                                                                                      : 'secondary'
                                                                            }
                                                                            className="w-fit text-xs"
                                                                        >
                                                                            {item.instructorStatus === 'ACCEPTED'
                                                                                ? 'Đã đồng ý'
                                                                                : item.instructorStatus === 'REJECTED'
                                                                                  ? 'Từ chối'
                                                                                  : 'Chờ xác nhận'}
                                                                        </Badge>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-sm">
                                                                        Chưa chọn
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={displayStatusVariant[displayStatus]}>
                                                                    {displayStatusLabel[displayStatus]}
                                                                </Badge>
                                                                {displayStatus !== 'PENDING_INSTRUCTOR' &&
                                                                    displayStatus !== 'PENDING_FACULTY' &&
                                                                    item.cancelReason && (
                                                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                                                                            Lý do: {item.cancelReason}
                                                                        </p>
                                                                    )}
                                                            </TableCell>
                                                            <TableCell className="pr-6 align-top">
                                                                {canEditRegistration(item) && !roundEnded ? (
                                                                    <Button
                                                                        variant="secondary"
                                                                        className="h-8 mb-2"
                                                                        size="sm"
                                                                        onClick={() => openEditDialog(item)}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                                                        Sửa
                                                                    </Button>
                                                                ) : null}

                                                                {item.status === 'PENDING' &&
                                                                item.instructorStatus !== 'ACCEPTED' &&
                                                                item.instructorStatus !== 'REJECTED' &&
                                                                !roundEnded ? (
                                                                    <div className="flex flex-col gap-2 w-max">
                                                                        <Input
                                                                            size={1}
                                                                            className="h-8 text-xs bg-background"
                                                                            value={cancelReasonById[item.id] ?? ''}
                                                                            onChange={(e) =>
                                                                                setCancelReasonById((prev) => ({
                                                                                    ...prev,
                                                                                    [item.id]: e.target.value,
                                                                                }))
                                                                            }
                                                                            placeholder="Lý do hủy..."
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 self-end"
                                                                            size="sm"
                                                                            onClick={() => handleCancel(item.id)}
                                                                            disabled={cancelMutation.isPending}
                                                                        >
                                                                            Hủy đăng ký
                                                                        </Button>
                                                                    </div>
                                                                ) : null}
                                                                {roundEnded ? (
                                                                    <p className="text-xs text-muted-foreground italic">
                                                                        Đợt đăng ký đã kết thúc, chỉ có thể xem chi
                                                                        tiết.
                                                                    </p>
                                                                ) : null}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chọn thành viên cùng khoa</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        <Input
                            value={memberKeyword}
                            onChange={(event) => setMemberKeyword(event.target.value)}
                            placeholder="Tìm theo tên, email hoặc mã sinh viên..."
                            className="h-10"
                        />
                        <div className="flex gap-2">
                            <Select value={selectedMajorId} onValueChange={handleMajorFilterChange}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Lọc theo ngành" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả ngành</SelectItem>
                                    {majors.map((major) => (
                                        <SelectItem key={major.id} value={major.id}>
                                            {major.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={classes.length === 0 && selectedMajorId !== 'all'}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Lọc theo lớp" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả lớp</SelectItem>
                                    {classes.map((classItem) => (
                                        <SelectItem key={classItem.id} value={classItem.id}>
                                            {classItem.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Hiển thị tối đa {MEMBER_PICKER_LIMIT} sinh viên mỗi lần tải.
                        </p>

                        {!myDepartmentId ? (
                            <p className="text-sm text-destructive">
                                Không tìm thấy thông tin khoa của tài khoản hiện tại.
                            </p>
                        ) : isLoadingDepartmentStudents ? (
                            <ScrollArea className="h-90 rounded-md border">
                                <div className="p-2 space-y-2">
                                    {Array.from({ length: MEMBER_PICKER_LIMIT }).map((_, index) => (
                                        <div
                                            key={`member-picker-skeleton-${index}`}
                                            className="h-14 rounded-md border px-3 py-2"
                                        >
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="mt-2 h-3 w-56" />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <ScrollArea className="h-90 rounded-md border">
                                <div className="p-2 space-y-1">
                                    {filteredDepartmentStudents.length === 0 ? (
                                        <div className="h-14 rounded-md border px-3 py-2 text-sm text-muted-foreground text-center flex items-center justify-center">
                                            Không có sinh viên phù hợp để thêm.
                                        </div>
                                    ) : (
                                        filteredDepartmentStudents.map((student) => (
                                            <div
                                                key={student.id}
                                                className="h-14 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{student.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {student.code ? `${student.code} • ` : ''}
                                                        {student.email}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="w-20 shrink-0"
                                                    onClick={() => addStudentToTeam(student)}
                                                >
                                                    Thêm
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editingRegistration)} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa thông tin đề tài</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-md border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">Đợt đăng ký</p>
                            <p className="font-medium">
                                {editingRegistration?.callRound?.name || 'Chưa gắn đợt đăng ký'}
                            </p>
                            {editingRegistration?.callRound?.registrationStartDate &&
                            editingRegistration?.callRound?.registrationEndDate ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(editingRegistration.callRound.registrationStartDate).toLocaleDateString(
                                        'vi-VN',
                                    )}{' '}
                                    -{' '}
                                    {new Date(editingRegistration.callRound.registrationEndDate).toLocaleDateString(
                                        'vi-VN',
                                    )}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Tên đề tài <span className="text-destructive">*</span>
                            </Label>
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Mục tiêu <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                value={editObjective}
                                onChange={(e) => setEditObjective(e.target.value)}
                                className="min-h-24"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sản phẩm dự kiến</Label>
                            <Textarea
                                value={editExpectedOutput}
                                onChange={(e) => setEditExpectedOutput(e.target.value)}
                                className="min-h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Thành viên nhóm (tối đa 5)</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openMemberPicker('edit')}
                                    disabled={editTeamMembers.length >= 5}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Thêm thành viên
                                </Button>
                            </div>
                            {editTeamMembers.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa có thành viên nhóm.</p>
                            ) : (
                                <div className="space-y-2">
                                    {editTeamMembers.map((member, index) => (
                                        <div
                                            key={`${index}-${member.name}`}
                                            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
                                        >
                                            <Input
                                                value={member.name}
                                                onChange={(e) =>
                                                    setEditTeamMembers((prev) =>
                                                        prev.map((item, i) =>
                                                            i === index ? { ...item, name: e.target.value } : item,
                                                        ),
                                                    )
                                                }
                                                placeholder="Tên thành viên"
                                            />
                                            <Input
                                                value={member.role}
                                                onChange={(e) =>
                                                    setEditTeamMembers((prev) =>
                                                        prev.map((item, i) =>
                                                            i === index ? { ...item, role: e.target.value } : item,
                                                        ),
                                                    )
                                                }
                                                placeholder="Role (nhập tay)"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setEditTeamMembers((prev) => prev.filter((_, i) => i !== index))
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={closeEditDialog}>
                                Hủy
                            </Button>
                            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
