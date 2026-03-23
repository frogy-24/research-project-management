'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';
import { useDeanApprovals, useUpdateDeanApprovalStatus, type DeanApprovalsFilters } from '@/hooks/useDeanApprovals';
import { useDebounce } from '@/hooks/useDebounce';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

interface Registration {
    id: string;
    title: string;
    user: {
        name: string;
        department: string | null;
    };
    instructor: {
        name: string;
    } | null;
    instructorStatus: string;
    facultyStatus: string;
}

const PAGE_SIZE = 10;

const FACULTY_STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả trạng thái Khoa' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Đã từ chối' },
];

const INSTRUCTOR_STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả trạng thái GVHD' },
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'ACCEPTED', label: 'Đã chấp nhận' },
    { value: 'REJECTED', label: 'Đã từ chối' },
];

export function DeanApprovalClient() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [facultyStatus, setFacultyStatus] = useState('');
    const [instructorStatus, setInstructorStatus] = useState('');

    // Debounce search input for better performance
    const debouncedSearch = useDebounce(searchInput, 300);

    // Memoize filters object to prevent unnecessary re-renders
    // Convert "ALL" to undefined for API call
    const filters: DeanApprovalsFilters = useMemo(() => ({
        search: debouncedSearch || undefined,
        facultyStatus: facultyStatus && facultyStatus !== 'ALL' ? facultyStatus : undefined,
        instructorStatus: instructorStatus && instructorStatus !== 'ALL' ? instructorStatus : undefined,
    }), [debouncedSearch, facultyStatus, instructorStatus]);

    const { data, isLoading } = useDeanApprovals(currentPage, PAGE_SIZE, filters);
    const mutation = useUpdateDeanApprovalStatus();

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
        setInstructorStatus('');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchInput || (facultyStatus && facultyStatus !== 'ALL') || (instructorStatus && instructorStatus !== 'ALL');

    return (
        <div className="space-y-4">
            {/* Filter Section */}
            <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[250px]">
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
                        <SelectTrigger className="w-[200px]">
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

                    {/* Instructor Status Filter */}
                    <Select
                        value={instructorStatus}
                        onValueChange={(value) => handleFilterChange(setInstructorStatus, value)}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Trạng thái GVHD" />
                        </SelectTrigger>
                        <SelectContent>
                            {INSTRUCTOR_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                        {instructorStatus && instructorStatus !== 'ALL' && (
                            <Badge variant="secondary" className="gap-1">
                                GVHD: {INSTRUCTOR_STATUS_OPTIONS.find(o => o.value === instructorStatus)?.label}
                                <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={() => handleFilterChange(setInstructorStatus, '')}
                                />
                            </Badge>
                        )}
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
                                    <TableRow key={req.id}>
                                        <TableCell className="text-muted-foreground">
                                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[300px] truncate">{req.title}</TableCell>
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
                                            {req.facultyStatus === 'PENDING' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            mutation.mutate(
                                                                { id: req.id, status: 'APPROVED' },
                                                                {
                                                                    onSuccess: () => toast.success('Cập nhật trạng thái thành công'),
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
                                                                    onSuccess: () => toast.success('Cập nhật trạng thái thành công'),
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
