'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ExternalLink, FileText, Search, X } from 'lucide-react';
import { useDeanApprovals, useUpdateDeanApprovalStatus, type DeanApprovalsFilters } from '@/hooks/useDeanApprovals';
import { useCallRounds } from '@/hooks/useCallRounds';
import { useDebounce } from '@/hooks/useDebounce';
import type { RegistrationProposalFile } from '@/types/project-registration.schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { AutoApprovalDialog } from '@/components/projects/auto-approval-dialog';

interface Registration {
    id: string;
    title: string;
    objective?: string | null;
    expectedOutput?: string | null;
    proposalFiles?: RegistrationProposalFile[] | null;
    createdAt: string;
    user: {
        name: string;
        email: string;
        code?: string | null;
        department: string | null;
        class?: {
            name: string;
            code: string;
        } | null;
        major?: {
            name: string;
            code: string;
        } | null;
    };
    instructor: {
        name: string;
        email?: string;
        code?: string | null;
        department?: string | null;
        departmentRef?: {
            name: string;
            code: string;
        } | null;
    } | null;
    callRound?: {
        name: string;
        projectLockDate?: string | null;
    } | null;
    instructorStatus: string;
    facultyStatus: string;
}

const stripTime = (value: Date) => {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const isPastLockDate = (projectLockDate?: string | null) => {
    if (!projectLockDate) {
        return false;
    }

    const parsedDate = new Date(projectLockDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return false;
    }

    return stripTime(new Date()) > stripTime(parsedDate);
};

const PAGE_SIZE = 10;

const FACULTY_STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả trạng thái Khoa' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Đã từ chối' },
];

const isWordFile = (fileName?: string, fileUrl?: string) => {
    const value = `${fileName || ''} ${fileUrl || ''}`.toLowerCase();
    return value.includes('.docx') || value.includes('.doc');
};

const isPdfFile = (fileName?: string, fileUrl?: string) => {
    const value = `${fileName || ''} ${fileUrl || ''}`.toLowerCase();
    return value.includes('.pdf');
};

export function DeanApprovalClient() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [facultyStatus, setFacultyStatus] = useState('');
    const [callRoundId, setCallRoundId] = useState('');

    // Debounce search input for better performance
    const debouncedSearch = useDebounce(searchInput, 300);

    // Memoize filters object to prevent unnecessary re-renders
    // Convert "ALL" to undefined for API call
    const filters: DeanApprovalsFilters = useMemo(() => ({
        search: debouncedSearch || undefined,
        facultyStatus: facultyStatus && facultyStatus !== 'ALL' ? facultyStatus : undefined,
        callRoundId: callRoundId && callRoundId !== 'ALL' ? callRoundId : undefined,
    }), [debouncedSearch, facultyStatus, callRoundId]);

    const { data, isLoading } = useDeanApprovals(currentPage, PAGE_SIZE, filters);
    const { data: callRounds = [] } = useCallRounds();
    const mutation = useUpdateDeanApprovalStatus();
    const queryClient = useQueryClient();

    const registrations = data?.data ?? [];
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages ?? 1;

    // Reset to page 1 when filters change
    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchInput('');
        setFacultyStatus('');
        setCallRoundId('');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        Boolean(searchInput) ||
        Boolean(facultyStatus && facultyStatus !== 'ALL') ||
        Boolean(callRoundId && callRoundId !== 'ALL');

    const handleAutoApprovalConfirmed = () => {
        queryClient.invalidateQueries({ queryKey: ['dean-approvals'] });
    };

    return (
        <div className="space-y-4">
            {/* Filter Section */}
            <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-62.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm theo tên đề tài hoặc chủ nhiệm..."
                            value={searchInput}
                            onChange={(e) => handleFilterChange(setSearchInput, e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Faculty Status Filter */}
                    <Select
                        value={facultyStatus}
                        onValueChange={(value) => handleFilterChange(setFacultyStatus, value)}
                    >
                        <SelectTrigger className="w-50">
                            <SelectValue placeholder="Trạng thái Khoa" />
                        </SelectTrigger>
                        <SelectContent>
                            {FACULTY_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Call Round Filter */}
                    <Select
                        value={callRoundId}
                        onValueChange={(value) => handleFilterChange(setCallRoundId, value)}
                    >
                        <SelectTrigger className="w-60">
                            <SelectValue placeholder="Đợt đăng ký" />
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

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Xóa bộ lọc
                        </Button>
                    )}

                    {/* Auto Approval Dialog - Only show when call round is selected */}
                    {callRoundId && callRoundId !== 'ALL' && (
                        <AutoApprovalDialog
                            callRoundId={callRoundId}
                            callRoundName={callRounds.find((round) => round.id === callRoundId)?.name}
                            onApprovalConfirmed={handleAutoApprovalConfirmed}
                        />
                    )}
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Đang lọc:</span>
                        {searchInput && (
                            <Badge variant="secondary" className="gap-1">
                                Tìm kiếm: "{searchInput}"
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => handleFilterChange(setSearchInput, '')}
                                />
                            </Badge>
                        )}
                        {facultyStatus && facultyStatus !== 'ALL' && (
                            <Badge variant="secondary" className="gap-1">
                                Khoa: {FACULTY_STATUS_OPTIONS.find(o => o.value === facultyStatus)?.label}
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => handleFilterChange(setFacultyStatus, '')}
                                />
                            </Badge>
                        )}
                        {callRoundId && callRoundId !== 'ALL' && (
                            <Badge variant="secondary" className="gap-1">
                                Đợt: {callRounds.find((round) => round.id === callRoundId)?.name || 'Không xác định'}
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => handleFilterChange(setCallRoundId, '')}
                                />
                            </Badge>
                        )}
                        <Badge variant="outline">GVHD: Đã chấp nhận</Badge>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : registrations.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">
                        {hasActiveFilters
                            ? 'Không tìm thấy hồ sơ phù hợp với bộ lọc.'
                            : 'Không có hồ sơ nào cần duyệt.'}
                    </p>
                    {hasActiveFilters && (
                        <Button variant="link" onClick={clearFilters} className="mt-2">
                            Xóa bộ lọc
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* Summary */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Hiển thị {registrations.length} / {pagination?.total ?? 0} hồ sơ
                        </span>
                        <span>
                            Trang {currentPage} / {totalPages}
                        </span>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Tên đề tài</TableHead>
                                    <TableHead>Chủ nhiệm</TableHead>
                                    <TableHead>GV Hướng dẫn</TableHead>
                                    <TableHead>Trạng thái Khoa</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.map((req, index) => (
                                    // Hide dean approval actions after project lock date passes.
                                    // Details are still available in read-only mode.
                                    
                                    <TableRow key={req.id}>
                                        <TableCell className="text-muted-foreground">
                                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium max-w-75 truncate">{req.title}</TableCell>
                                        <TableCell>{req.user.name}</TableCell>
                                        <TableCell>
                                            {req.instructor ? (
                                                <div className="flex flex-col gap-1">
                                                    <span>{req.instructor.name}</span>
                                                    <Badge
                                                        variant={req.instructorStatus === 'ACCEPTED' ? 'default' : 'secondary'}
                                                        className="w-fit text-[10px]"
                                                    >
                                                        {req.instructorStatus === 'ACCEPTED'
                                                            ? 'Đã chấp nhận'
                                                            : req.instructorStatus === 'REJECTED'
                                                              ? 'Đã từ chối'
                                                              : 'Chờ xác nhận'}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Không có</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    req.facultyStatus === 'APPROVED'
                                                        ? 'default'
                                                        : req.facultyStatus === 'REJECTED'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {req.facultyStatus === 'APPROVED'
                                                    ? 'Đã duyệt'
                                                    : req.facultyStatus === 'REJECTED'
                                                      ? 'Đã từ chối'
                                                      : 'Chờ duyệt'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">Chi tiết</Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
                                                    <DialogHeader>
                                                        <DialogTitle>Chi tiết đề tài đăng ký</DialogTitle>
                                                    </DialogHeader>

                                                    <div className="space-y-4 py-2 max-h-[calc(85vh-5rem)] overflow-y-auto pr-2">
                                                        <div className="rounded-lg border bg-muted/30 p-4">
                                                            <h4 className="text-sm font-medium mb-3">Thông tin sinh viên</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Họ và tên</p>
                                                                    <p className="font-medium">{req.user.name}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Mã sinh viên</p>
                                                                    <p className="font-medium">{req.user.code || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Email</p>
                                                                    <p className="font-medium">{req.user.email}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Khoa</p>
                                                                    <p className="font-medium">{req.user.department || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Lớp</p>
                                                                    <p className="font-medium">{req.user.class?.name || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Ngành</p>
                                                                    <p className="font-medium">{req.user.major?.name || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-lg border bg-muted/30 p-4">
                                                            <h4 className="text-sm font-medium mb-3">Thông tin giảng viên hướng dẫn</h4>
                                                            {req.instructor ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">Họ và tên</p>
                                                                        <p className="font-medium">{req.instructor.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">Mã giảng viên</p>
                                                                        <p className="font-medium">{req.instructor.code || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">Email</p>
                                                                        <p className="font-medium">{req.instructor.email || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground text-xs">Khoa/Đơn vị</p>
                                                                        <p className="font-medium">
                                                                            {req.instructor.departmentRef?.name || req.instructor.department || 'N/A'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">Chưa có giảng viên hướng dẫn.</p>
                                                            )}
                                                        </div>

                                                        <div className="rounded-lg border p-4 space-y-4">
                                                            <div>
                                                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tên đề tài</h4>
                                                                <p className="text-sm font-semibold leading-6">{req.title}</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs mb-1">Đợt đăng ký</p>
                                                                    <p className="font-medium">{req.callRound?.name || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs mb-1">Trạng thái phản hồi GVHD</p>
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
                                                                            ? 'Đã chấp nhận'
                                                                            : req.instructorStatus === 'REJECTED'
                                                                              ? 'Đã từ chối'
                                                                              : 'Chờ xác nhận'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Mục tiêu nghiên cứu</h4>
                                                                <p className="text-sm whitespace-pre-wrap leading-6">
                                                                    {req.objective || 'Chưa có thông tin'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-muted-foreground mb-1">Sản phẩm dự kiến</h4>
                                                                <p className="text-sm whitespace-pre-wrap leading-6">
                                                                    {req.expectedOutput || 'Chưa có thông tin'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">File đính kèm</h4>
                                                                {req.proposalFiles && req.proposalFiles.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {req.proposalFiles.map((file, fileIndex) => (
                                                                            <div
                                                                                key={`${file.url}-${fileIndex}`}
                                                                                className="rounded-md border bg-muted/20 px-3 py-2 flex items-center justify-between gap-2"
                                                                            >
                                                                                <div className="min-w-0">
                                                                                    <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                                                                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                                        <span className="truncate">{file.name}</span>
                                                                                    </p>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {typeof file.size === 'number'
                                                                                            ? `${(file.size / 1024).toFixed(1)} KB`
                                                                                            : 'Kích thước không xác định'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    {isPdfFile(file.name, file.url) && (
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
                                                                                                aria-label={`Xem tệp PDF ${file.name}`}
                                                                                            >
                                                                                                <ExternalLink className="h-4 w-4" />
                                                                                            </a>
                                                                                        </Button>
                                                                                    )}
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-8 w-8 p-0"
                                                                                        asChild
                                                                                    >
                                                                                        <a
                                                                                            href={file.url}
                                                                                            target={isWordFile(file.name, file.url) ? undefined : '_blank'}
                                                                                            rel={isWordFile(file.name, file.url) ? undefined : 'noopener noreferrer'}
                                                                                            download={file.name}
                                                                                            aria-label={`Tải tệp ${file.name}`}
                                                                                        >
                                                                                            <Download className="h-4 w-4" />
                                                                                        </a>
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-muted-foreground">Chưa có file đính kèm.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {req.facultyStatus === 'PENDING' && !isPastLockDate(req.callRound?.projectLockDate) && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            mutation.mutate(
                                                                { id: req.id, status: 'APPROVED' },
                                                                {
                                                                    onSuccess: () => toast.success('Phê duyệt hồ sơ thành công'),
                                                                    onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                                }
                                                            )
                                                        }
                                                        disabled={
                                                            mutation.isPending ||
                                                            Boolean(req.instructor && req.instructorStatus === 'PENDING')
                                                        }
                                                    >
                                                        Duyệt
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() =>
                                                            mutation.mutate(
                                                                { id: req.id, status: 'REJECTED' },
                                                                {
                                                                    onSuccess: () => toast.success('Đã từ chối hồ sơ'),
                                                                    onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                                }
                                                            )
                                                        }
                                                        disabled={mutation.isPending}
                                                    >
                                                        Từ chối
                                                    </Button>
                                                </>
                                            )}

                                            {req.facultyStatus === 'APPROVED' && !isPastLockDate(req.callRound?.projectLockDate) && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() =>
                                                        mutation.mutate(
                                                            { id: req.id, status: 'PENDING' },
                                                            {
                                                                onSuccess: () => toast.success('Đã hủy phê duyệt và chuyển về chờ duyệt'),
                                                                onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                            }
                                                        )
                                                    }
                                                    disabled={mutation.isPending}
                                                >
                                                    Hủy phê duyệt
                                                </Button>
                                            )}

                                            {req.facultyStatus === 'REJECTED' && !isPastLockDate(req.callRound?.projectLockDate) && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() =>
                                                        mutation.mutate(
                                                            { id: req.id, status: 'PENDING' },
                                                            {
                                                                onSuccess: () => toast.success('Đã hủy từ chối và chuyển về chờ duyệt'),
                                                                onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                            }
                                                        )
                                                    }
                                                    disabled={mutation.isPending}
                                                >
                                                    Hủy từ chối
                                                </Button>
                                            )}

                                            {isPastLockDate(req.callRound?.projectLockDate) && (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    Đã quá hạn chốt
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                                        }}
                                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                        <PaginationItem key={pageNum}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(pageNum);
                                                }}
                                                isActive={currentPage === pageNum}
                                            >
                                                {pageNum}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}
                                
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                        }}
                                        className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </>
            )}

        </div>
    );
}
