'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useGuidanceRequests, useUpdateInstructorStatus } from '@/hooks/useGuidanceRequests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useCallRounds } from '@/hooks/useCallRounds';
import {
    CalendarDays,
    Download,
    ExternalLink,
    FileText,
    Filter,
    Mail,
    Search,
    ShieldCheck,
    UserCheck,
    UserSquare2,
    UserX,
    Users,
    ChevronDown,
} from 'lucide-react';

const SEARCH_FIELD_OPTIONS = [
    { value: 'all', label: 'Tất cả trường' },
    { value: 'title', label: 'Tên đề tài' },
    { value: 'studentName', label: 'Tên sinh viên' },
    { value: 'studentEmail', label: 'Email sinh viên' },
    { value: 'studentCode', label: 'MSSV' },
] as const;

const teamInvitationStatusLabel: Record<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED', string> = {
    PENDING: 'Chờ xác nhận',
    ACCEPTED: 'Đã đồng ý',
    REJECTED: 'Đã từ chối',
    CANCELED: 'Đã hủy',
};

const teamInvitationStatusVariant: Record<
    'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED',
    'secondary' | 'default' | 'destructive' | 'outline'
> = {
    PENDING: 'secondary',
    ACCEPTED: 'default',
    REJECTED: 'destructive',
    CANCELED: 'outline',
};

export function GuidancePageClient() {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [selectedCallRoundId, setSelectedCallRoundId] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
    const [searchField, setSearchField] = useState<'all' | 'title' | 'studentName' | 'studentEmail' | 'studentCode'>(
        'all',
    );
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 400);

    const { data: callRoundsData } = useCallRounds();
    const callRounds = callRoundsData ?? [];

    const { data, isLoading, isFetching } = useGuidanceRequests({
        page,
        limit,
        callRoundId: selectedCallRoundId === 'ALL' ? undefined : selectedCallRoundId,
        instructorStatus: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: debouncedSearch || undefined,
        searchField,
    });

    const registrations = data?.data ?? [];
    const pagination = data?.pagination;
    const mutation = useUpdateInstructorStatus();

    const rangeStart = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
    const rangeEnd =
        pagination && pagination.total > 0 ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

    const statusSummary = useMemo(() => {
        return registrations.reduce(
            (acc, item) => {
                if (item.instructorStatus === 'PENDING') acc.pending += 1;
                if (item.instructorStatus === 'ACCEPTED') acc.accepted += 1;
                if (item.instructorStatus === 'REJECTED') acc.rejected += 1;
                return acc;
            },
            { pending: 0, accepted: 0, rejected: 0 },
        );
    }, [registrations]);

    const visiblePages = useMemo(() => {
        if (!pagination) return [];
        const totalPages = pagination.totalPages;
        const current = pagination.page;

        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
        if (current <= 3) {
            pages.add(2);
            pages.add(3);
            pages.add(4);
        }
        if (current >= totalPages - 2) {
            pages.add(totalPages - 1);
            pages.add(totalPages - 2);
            pages.add(totalPages - 3);
        }

        return Array.from(pages)
            .filter((p) => p >= 1 && p <= totalPages)
            .sort((a, b) => a - b);
    }, [pagination]);

    const handleCallRoundChange = (value: string) => {
        setSelectedCallRoundId(value);
        setPage(1);
    };

    const handleStatusChange = (value: 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
        setSelectedStatus(value);
        setPage(1);
    };

    const handleSearchFieldChange = (value: 'all' | 'title' | 'studentName' | 'studentEmail' | 'studentCode') => {
        setSearchField(value);
        setPage(1);
    };

    const handleSearchInputChange = (value: string) => {
        setSearchInput(value);
        setPage(1);
    };

    const resetFilters = () => {
        setSelectedCallRoundId('ALL');
        setSelectedStatus('ALL');
        setSearchField('all');
        setSearchInput('');
        setPage(1);
    };

    return (
        <div className="space-y-4">
            <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" />
                        Bộ lọc yêu cầu hướng dẫn
                    </CardTitle>
                    <CardDescription>Tìm nhanh theo đợt, trạng thái và trường dữ liệu cụ thể</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-col md:flex-row gap-2 md:items-center">
                        <Select value={selectedCallRoundId} onValueChange={handleCallRoundChange}>
                            <SelectTrigger className="md:w-72">
                                <SelectValue placeholder="Lọc theo đợt" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả đợt</SelectItem>
                                {callRounds.map((round) => (
                                    <SelectItem key={round.id} value={round.id}>
                                        {round.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="md:w-56">
                                <SelectValue placeholder="Lọc theo trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                                <SelectItem value="PENDING">Chờ xác nhận</SelectItem>
                                <SelectItem value="ACCEPTED">Đã đồng ý</SelectItem>
                                <SelectItem value="REJECTED">Đã từ chối</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={searchField} onValueChange={handleSearchFieldChange}>
                            <SelectTrigger className="md:w-56">
                                <SelectValue placeholder="Trường tìm kiếm" />
                            </SelectTrigger>
                            <SelectContent>
                                {SEARCH_FIELD_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative flex-1 min-w-55">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Nhập từ khóa tìm kiếm..."
                                value={searchInput}
                                onChange={(e) => handleSearchInputChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            Xóa bộ lọc
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng yêu cầu</p>
                                <p className="text-2xl font-semibold">{pagination?.total ?? 0}</p>
                            </div>
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Chờ xác nhận</p>
                                <p className="text-2xl font-semibold">{statusSummary.pending}</p>
                            </div>
                            <CalendarDays className="h-5 w-5 text-amber-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã đồng ý</p>
                                <p className="text-2xl font-semibold">{statusSummary.accepted}</p>
                            </div>
                            <UserCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Đã từ chối</p>
                                <p className="text-2xl font-semibold">{statusSummary.rejected}</p>
                            </div>
                            <UserX className="h-5 w-5 text-rose-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Danh sách yêu cầu hướng dẫn
                    </CardTitle>
                    <CardDescription>
                        Hiển thị {rangeStart} - {rangeEnd} trên tổng {pagination?.total ?? 0} yêu cầu
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Tên đề tài</TableHead>
                                    <TableHead>Sinh viên đăng ký</TableHead>
                                    <TableHead>Đợt đăng ký</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    Array.from({ length: 6 }, (_, i) => (
                                        <TableRow key={`skeleton-row-${i}`}>
                                            <TableCell>
                                                <Skeleton className="h-4 w-8" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-48" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-40" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-6 w-24" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-20" />
                                                    <Skeleton className="h-8 w-20" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : registrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center p-10 text-muted-foreground">
                                            Không có yêu cầu hướng dẫn nào phù hợp bộ lọc.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    registrations.map((req, index) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="text-muted-foreground">
                                                {((pagination?.page ?? 1) - 1) * (pagination?.limit ?? 10) + index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[320px] whitespace-normal break-words">
                                                {req.title}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{req.user.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {req.user.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{req.callRound?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        req.instructorStatus === 'ACCEPTED'
                                                            ? 'default'
                                                            : req.instructorStatus === 'REJECTED'
                                                              ? 'destructive'
                                                              : 'secondary'
                                                    }
                                                >
                                                    {req.instructorStatus === 'ACCEPTED'
                                                        ? 'Đã đồng ý'
                                                        : req.instructorStatus === 'REJECTED'
                                                          ? 'Đã từ chối'
                                                          : 'Chờ xác nhận'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Chi tiết
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Chi tiết đăng ký hướng dẫn</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-3">
                                                            <div className="rounded-lg border bg-muted/30 p-4">
                                                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                                                    <UserSquare2 className="h-4 w-4 text-primary" />
                                                                    Thông tin sinh viên
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Họ và tên
                                                                        </p>
                                                                        <p className="font-medium">{req.user.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Mã sinh viên
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {req.user.code || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Lớp
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {req.user.class?.name || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Ngành
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {req.user.major?.name || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Khoa
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {req.user.departmentRef?.name || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Email
                                                                        </p>
                                                                        <p className="font-medium flex items-center gap-1.5">
                                                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            {req.user.email}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-lg border p-4 space-y-4">
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                                                                        Tên đề tài
                                                                    </h4>
                                                                    <p className="text-sm font-semibold leading-6">
                                                                        {req.title}
                                                                    </p>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs mb-1">
                                                                            Đợt đăng ký
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {req.callRound?.name || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs mb-1">
                                                                            Trạng thái phản hồi
                                                                        </p>
                                                                        <Badge
                                                                            variant={
                                                                                req.instructorStatus === 'ACCEPTED'
                                                                                    ? 'default'
                                                                                    : req.instructorStatus ===
                                                                                        'REJECTED'
                                                                                      ? 'destructive'
                                                                                      : 'secondary'
                                                                            }
                                                                        >
                                                                            {req.instructorStatus === 'ACCEPTED'
                                                                                ? 'Đã đồng ý'
                                                                                : req.instructorStatus === 'REJECTED'
                                                                                  ? 'Đã từ chối'
                                                                                  : 'Chờ xác nhận'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                                                                        Mục tiêu nghiên cứu
                                                                    </h4>
                                                                    <p className="text-sm whitespace-pre-wrap leading-6">
                                                                        {req.objective || 'Chưa có thông tin'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                                                                        Sản phẩm dự kiến
                                                                    </h4>
                                                                    <p className="text-sm whitespace-pre-wrap leading-6">
                                                                        {req.expectedOutput || 'Chưa có thông tin'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                                        File đính kèm
                                                                    </h4>
                                                                    {req.proposalFiles &&
                                                                    req.proposalFiles.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {req.proposalFiles.map(
                                                                                (file, fileIndex) => (
                                                                                    <div
                                                                                        key={`${file.url}-${fileIndex}`}
                                                                                        className="rounded-md border bg-muted/20 px-3 py-2 flex items-center justify-between gap-2"
                                                                                    >
                                                                                        <div className="min-w-0">
                                                                                            <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                                                                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                                                <span className="truncate">
                                                                                                    {file.name}
                                                                                                </span>
                                                                                            </p>
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                {typeof file.size ===
                                                                                                'number'
                                                                                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                                                                                    : 'Kích thước không xác định'}
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-8 w-8 p-0"
                                                                                                asChild
                                                                                            >
                                                                                                <a
                                                                                                    href={file.url}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    aria-label={`Mở tệp ${file.name}`}
                                                                                                >
                                                                                                    <ExternalLink className="h-4 w-4" />
                                                                                                </a>
                                                                                            </Button>
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-8 w-8 p-0"
                                                                                                asChild
                                                                                            >
                                                                                                <a
                                                                                                    href={file.url}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    download={file.name}
                                                                                                    aria-label={`Tải tệp ${file.name}`}
                                                                                                >
                                                                                                    <Download className="h-4 w-4" />
                                                                                                </a>
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Chưa có file đính kèm.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                                        Thành viên nhóm
                                                                    </h4>
                                                                    {req.teamMembers && req.teamMembers.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {req.teamMembers.map(
                                                                                (member, memberIndex) => {
                                                                                    const invitationStatus =
                                                                                        member.invitationStatus ||
                                                                                        'PENDING';

                                                                                    return (
                                                                                        <details
                                                                                            key={`${member.name}-${memberIndex}`}
                                                                                            className="group rounded-md border bg-muted/20 px-3 py-2"
                                                                                        >
                                                                                            <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none">
                                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                                    <span className="font-medium text-sm">
                                                                                                        {member.name}
                                                                                                    </span>
                                                                                                    <Badge variant="outline">
                                                                                                        {member.role}
                                                                                                    </Badge>
                                                                                                    <Badge
                                                                                                        variant={
                                                                                                            teamInvitationStatusVariant[
                                                                                                                invitationStatus
                                                                                                            ]
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            teamInvitationStatusLabel[
                                                                                                                invitationStatus
                                                                                                            ]
                                                                                                        }
                                                                                                    </Badge>
                                                                                                </div>
                                                                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                                                    Xem thông tin
                                                                                                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                                                                                                </span>
                                                                                            </summary>
                                                                                            <div className="mt-3 rounded-md border bg-background p-3">
                                                                                                <h5 className="text-sm font-semibold mb-2">
                                                                                                    Thông tin sinh viên
                                                                                                </h5>
                                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Họ và tên
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {
                                                                                                                member.name
                                                                                                            }
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Mã sinh viên
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {member.studentCode ||
                                                                                                                req.user
                                                                                                                    .code ||
                                                                                                                'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Lớp
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {req.user
                                                                                                                .class
                                                                                                                ?.name ||
                                                                                                                'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Ngành
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {req.user
                                                                                                                .major
                                                                                                                ?.name ||
                                                                                                                'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Khoa
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {req.user
                                                                                                                .departmentRef
                                                                                                                ?.name ||
                                                                                                                'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                            Email
                                                                                                        </p>
                                                                                                        <p className="font-medium">
                                                                                                            {req.user
                                                                                                                .email ||
                                                                                                                'N/A'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </details>
                                                                                    );
                                                                                },
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Không có thành viên nhóm.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                {req.instructorStatus === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() =>
                                                                mutation.mutate(
                                                                    { id: req.id, status: 'ACCEPTED' },
                                                                    {
                                                                        onSuccess: () =>
                                                                            toast.success(
                                                                                'Cập nhật trạng thái thành công',
                                                                            ),
                                                                        onError: () =>
                                                                            toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                                    },
                                                                )
                                                            }
                                                            disabled={mutation.isPending}
                                                        >
                                                            Đồng ý
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                mutation.mutate(
                                                                    { id: req.id, status: 'REJECTED' },
                                                                    {
                                                                        onSuccess: () =>
                                                                            toast.success(
                                                                                'Cập nhật trạng thái thành công',
                                                                            ),
                                                                        onError: () =>
                                                                            toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                                    },
                                                                )
                                                            }
                                                            disabled={mutation.isPending}
                                                        >
                                                            Từ chối
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} trên tổng {pagination.total}
                    </p>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    className={
                                        pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                                    }
                                />
                            </PaginationItem>

                            {visiblePages.map((p, idx) => (
                                <div key={`page-group-${p}`} className="contents">
                                    {idx > 0 && p - visiblePages[idx - 1] > 1 ? (
                                        <PaginationItem key={`ellipsis-${p}`}>
                                            <span className="px-2 text-sm text-muted-foreground">...</span>
                                        </PaginationItem>
                                    ) : null}
                                    <PaginationItem key={p}>
                                        <PaginationLink
                                            onClick={() => setPage(p)}
                                            isActive={p === pagination.page}
                                            className="cursor-pointer"
                                        >
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                </div>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                                    className={
                                        pagination.page === pagination.totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : 'cursor-pointer'
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            ) : null}
        </div>
    );
}
