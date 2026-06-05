'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { useDeanProjectClosings, useDeanReviewProjectClosing } from '@/hooks/useDeanProjectClosings';
import { deanProjectClosingsApi } from '@/api/dean-project-closings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type {
    DeanProjectClosingItem,
    DeanReviewProjectClosingStatus,
    UploadedEvidenceFile,
} from '@/types/project-closing.schema';

type ClosingFileCategoryKey =
    | 'reportFiles'
    | 'researchSourceCodeFiles'
    | 'researchGuideFiles'
    | 'administrativeDefenseApplicationFiles'
    | 'administrativeAchievementEvidenceFiles'
    | 'administrativeAdvisorReviewFiles'
    | 'presentationSlideFiles'
    | 'presentationVideoFiles';

type FileCategoryConfig = {
    key: ClosingFileCategoryKey;
    label: string;
};

const FILE_CATEGORIES: FileCategoryConfig[] = [
    { key: 'reportFiles', label: 'Báo cáo' },
    { key: 'researchSourceCodeFiles', label: 'Sản phẩm nghiên cứu - Source Code' },
    { key: 'researchGuideFiles', label: 'Sản phẩm nghiên cứu - Tài liệu hướng dẫn' },
    { key: 'administrativeDefenseApplicationFiles', label: 'Giấy tờ - Đơn xin bảo vệ/nghiệm thu đề tài NCKH' },
    { key: 'administrativeAchievementEvidenceFiles', label: 'Giấy tờ - Minh chứng thành tích' },
    { key: 'administrativeAdvisorReviewFiles', label: 'Giấy tờ - Bản nhận xét của Giảng viên hướng dẫn' },
    { key: 'presentationSlideFiles', label: 'Slide thuyết trình' },
    { key: 'presentationVideoFiles', label: 'Video (nếu cần)' },
];

const closingStatusLabel: Record<string, string> = {
    SUBMITTED: 'Đã nộp',
    REVISION_REQUESTED: 'Từ chối / Yêu cầu bổ sung',
    APPROVED: 'Đã chấp nhận',
};

const closingStatusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    SUBMITTED: 'secondary',
    REVISION_REQUESTED: 'destructive',
    APPROVED: 'default',
};

const projectStatusLabel: Record<string, string> = {
    DRAFT: 'Nháp',
    SUBMITTED: 'Đã nộp',
    DEAN_APPROVED: 'Khoa duyệt',
    DEAN_REVISION: 'Khoa yêu cầu sửa',
    ADMIN_REVIEW: 'Admin đang duyệt',
    COUNCIL_EVALUATING: 'Hội đồng chấm',
    APPROVED: 'Đã duyệt',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Đã hoàn thành',
    REJECTED: 'Bị từ chối',
    SUSPENDED: 'Tạm dừng',
};

const formatDateTime = (value: Date | string): string => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString('vi-VN');
};

export function DeanProjectClosingReviewManagement() {
    const { data: closingItems = [], isLoading } = useDeanProjectClosings();
    const reviewMutation = useDeanReviewProjectClosing();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED'>('all');
    const [callRoundFilter, setCallRoundFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<DeanProjectClosingItem | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingStyled, setIsExportingStyled] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const callRoundOptions = useMemo(() => {
        const map = new Map<string, string>();

        closingItems.forEach((item) => {
            if (!item.project.callRound) {
                return;
            }

            map.set(item.project.callRound.id, item.project.callRound.name);
        });

        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [closingItems]);

    const filteredItems = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        return closingItems.filter((item) => {
            if (callRoundFilter !== 'all' && item.project.callRound?.id !== callRoundFilter) {
                return false;
            }

            if (statusFilter !== 'all' && item.submission.status !== statusFilter) {
                return false;
            }

            if (!keyword) {
                return true;
            }

            const textPool = [
                item.project.title,
                item.project.student.name,
                item.project.student.code || '',
                item.project.instructor?.name || '',
                item.project.callRound?.name || '',
            ]
                .join(' ')
                .toLowerCase();

            return textPool.includes(keyword);
        });
    }, [callRoundFilter, closingItems, searchKeyword, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [currentPage, filteredItems]);

    const startItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, filteredItems.length);

    const openReviewDialog = (item: DeanProjectClosingItem) => {
        setSelectedItem(item);
        setReviewNote('');
        setIsDialogOpen(true);
    };

    const handleReview = (status: DeanReviewProjectClosingStatus) => {
        if (!selectedItem) {
            return;
        }

        reviewMutation.mutate(
            {
                submissionId: selectedItem.submission.id,
                status,
                note: reviewNote.trim() || null,
            },
            {
                onSuccess: () => {
                    toast.success(
                        status === 'APPROVED' ? 'Đã chấp nhận hồ sơ nghiệm thu' : 'Đã từ chối hồ sơ nghiệm thu',
                    );
                    setIsDialogOpen(false);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' &&
                        error !== null &&
                        'response' in error &&
                        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
                            'string'
                            ? (error as { response: { data: { error: string } } }).response.data.error
                            : 'Không thể cập nhật trạng thái nghiệm thu';
                    toast.error(message);
                },
            },
        );
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const blob = await deanProjectClosingsApi.exportExcel({
                search: searchKeyword,
                callRoundId: callRoundFilter !== 'all' ? callRoundFilter : undefined,
                status: statusFilter,
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(
                now.getHours(),
            ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            link.href = url;
            link.download = `dean-project-closings-${stamp}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Đã xuất file Excel nghiệm thu đề tài');
        } catch (error) {
            console.error(error);
            toast.error('Không thể xuất file Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportStyledExcel = async () => {
        try {
            setIsExportingStyled(true);
            const params = new URLSearchParams();
            params.set('search', searchKeyword.trim());
            if (callRoundFilter !== 'all') {
                params.set('callRoundId', callRoundFilter);
            }
            if (statusFilter && statusFilter !== 'all') {
                params.set('status', statusFilter);
            }
            const queryString = params.toString();
            const url = `/api/dean/project-closings/export-styled${queryString ? `?${queryString}` : ''}`;
            window.open(url, '_blank');
            toast.success('Đang xuất file Excel với định dạng đẹp...');
        } catch (error) {
            console.error(error);
            toast.error('Không thể xuất file Excel');
        } finally {
            setIsExportingStyled(false);
        }
    };

    const renderFileList = (files: UploadedEvidenceFile[]) => {
        if (files.length === 0) {
            return <p className="text-xs text-muted-foreground">Không có tệp.</p>;
        }

        return (
            <div className="space-y-2">
                {files.map((file, index) => (
                    <div
                        key={`${file.url}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                        <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline line-clamp-1"
                        >
                            {file.name}
                        </a>
                        <Button type="button" size="icon" variant="ghost" asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Duyệt nghiệm thu đề tài</h1>
                <p className="text-muted-foreground">
                    Trưởng khoa xem toàn bộ hồ sơ nghiệm thu đề tài sinh viên và thực hiện chấp nhận hoặc từ chối.
                </p>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Danh sách hồ sơ nghiệm thu</CardTitle>
                    <CardDescription>
                        Chọn hồ sơ để xem chi tiết tệp đính kèm và cập nhật quyết định duyệt.
                    </CardDescription>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {/* <Button type="button" variant="outline" onClick={handleExportExcel} disabled={isExporting}>
                            <Download className="h-4 w-4 mr-2" />
                            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </Button> */}

                        <Button
                            type="button"
                            size="sm"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                            onClick={handleExportStyledExcel}
                            disabled={isExportingStyled}
                        >
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            {isExportingStyled ? 'Đang xuất...' : 'Xuất Excel'}
                        </Button>

                        <Select value={callRoundFilter} onValueChange={setCallRoundFilter}>
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue placeholder="Lọc theo đợt đề tài" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả đợt đề tài</SelectItem>
                                {callRoundOptions.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                        >
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue placeholder="Lọc theo trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="SUBMITTED">Đã nộp</SelectItem>
                                <SelectItem value="APPROVED">Đã chấp nhận</SelectItem>
                                <SelectItem value="REVISION_REQUESTED">Từ chối / Yêu cầu bổ sung</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo đề tài, sinh viên, giảng viên..."
                                value={searchKeyword}
                                onChange={(event) => setSearchKeyword(event.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((item) => (
                                <Skeleton key={item} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                            Không có hồ sơ nghiệm thu phù hợp với bộ lọc hiện tại.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>STT</TableHead>
                                            <TableHead>Đề tài</TableHead>
                                            <TableHead>Sinh viên</TableHead>
                                            <TableHead>Giảng viên hướng dẫn</TableHead>
                                            <TableHead>Đợt đề tài</TableHead>
                                            <TableHead>Trạng thái đề tài</TableHead>
                                            <TableHead>Trạng thái nghiệm thu</TableHead>
                                            <TableHead>Ngày nộp</TableHead>
                                            <TableHead className="text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((item, index) => (
                                            <TableRow key={item.submission.id}>
                                                <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                                <TableCell className="max-w-xs">
                                                    <p className="line-clamp-2 font-medium">{item.project.title}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <p className="font-medium">{item.project.student.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.project.student.code || item.project.student.email}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm">{item.project.instructor?.name || 'N/A'}</p>
                                                </TableCell>
                                                <TableCell>{item.project.callRound?.name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {projectStatusLabel[item.project.status] || item.project.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            closingStatusVariant[item.submission.status] || 'secondary'
                                                        }
                                                    >
                                                        {closingStatusLabel[item.submission.status] ||
                                                            item.submission.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDateTime(item.submission.submittedAt)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => openReviewDialog(item)}
                                                    >
                                                        Xem & duyệt
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Hiển thị {startItem}-{endItem} / {filteredItems.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Trước
                                    </Button>
                                    <span className="text-sm">
                                        Trang {currentPage}/{totalPages}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        Sau
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[min(95vw,1100px)] max-h-[90vh] overflow-y-auto sm:max-w-1/2">
                    <DialogHeader>
                        <DialogTitle>Xem và duyệt hồ sơ nghiệm thu</DialogTitle>
                        <DialogDescription>
                            {selectedItem ? `Đề tài: ${selectedItem.project.title}` : 'Chi tiết hồ sơ nghiệm thu'}
                        </DialogDescription>
                    </DialogHeader>

                    {!selectedItem ? null : (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-1">
                                <p>
                                    <span className="font-medium">Sinh viên:</span> {selectedItem.project.student.name}
                                </p>
                                <p>
                                    <span className="font-medium">Giảng viên hướng dẫn:</span>{' '}
                                    {selectedItem.project.instructor?.name || 'N/A'}
                                </p>
                                <p>
                                    <span className="font-medium">Đợt đề tài:</span>{' '}
                                    {selectedItem.project.callRound?.name || 'N/A'}
                                </p>
                                <p>
                                    <span className="font-medium">Ngày nộp:</span>{' '}
                                    {formatDateTime(selectedItem.submission.submittedAt)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Ghi chú hiện tại</Label>
                                <p className="text-sm rounded-md border p-3 bg-muted/20">
                                    {selectedItem.submission.note || 'Không có ghi chú'}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {FILE_CATEGORIES.map((category) => (
                                    <Card key={category.key}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{category.label}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {renderFileList(selectedItem.submission[category.key])}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dean-review-note">Ghi chú duyệt (tùy chọn)</Label>
                                <Textarea
                                    id="dean-review-note"
                                    placeholder="Nhập ghi chú khi chấp nhận hoặc từ chối..."
                                    value={reviewNote}
                                    onChange={(event) => setReviewNote(event.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={reviewMutation.isPending}
                                >
                                    Đóng
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => handleReview('REVISION_REQUESTED')}
                                    disabled={reviewMutation.isPending}
                                >
                                    {reviewMutation.isPending ? 'Đang xử lý...' : 'Từ chối'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleReview('APPROVED')}
                                    disabled={reviewMutation.isPending}
                                >
                                    {reviewMutation.isPending ? 'Đang xử lý...' : 'Chấp nhận'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
