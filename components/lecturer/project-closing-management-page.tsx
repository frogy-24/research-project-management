'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Search, Trash2, UploadCloud } from 'lucide-react';
import { useLecturerProjectClosings, useSubmitLecturerProjectClosing } from '@/hooks/useLecturerProjectClosings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type {
    LecturerProjectClosingItem,
    SubmitProjectClosingInput,
    UploadedEvidenceFile,
} from '@/types/project-closing.schema';

type ClosingFormState = Omit<SubmitProjectClosingInput, 'projectId'>;
type ClosingFileCategoryKey = Exclude<keyof ClosingFormState, 'note'>;

type FileCategoryConfig = {
    key: ClosingFileCategoryKey;
    label: string;
    description: string;
    optional?: boolean;
};

const FILE_CATEGORIES: FileCategoryConfig[] = [
    {
        key: 'reportFiles',
        label: 'Báo cáo',
        description: 'Báo cáo tổng kết đề tài nghiên cứu khoa học.',
    },
    {
        key: 'researchSourceCodeFiles',
        label: 'Sản phẩm nghiên cứu - Source Code',
        description: 'Mã nguồn của sản phẩm nghiên cứu.',
    },
    {
        key: 'researchGuideFiles',
        label: 'Sản phẩm nghiên cứu - Tài liệu hướng dẫn',
        description: 'Tài liệu hướng dẫn cài đặt và sử dụng sản phẩm.',
    },
    {
        key: 'administrativeDefenseApplicationFiles',
        label: 'Giấy tờ - Đơn xin bảo vệ/nghiệm thu đề tài NCKH',
        description: 'Mẫu đơn hành chính phục vụ bảo vệ hoặc nghiệm thu.',
    },
    {
        key: 'administrativeAchievementEvidenceFiles',
        label: 'Giấy tờ - Minh chứng thành tích',
        description: 'Minh chứng kết quả, thành tích liên quan đến đề tài.',
    },
    {
        key: 'administrativeAdvisorReviewFiles',
        label: 'Giấy tờ - Bản nhận xét của Giảng viên hướng dẫn',
        description: 'Phiếu nhận xét hoặc đánh giá từ giảng viên hướng dẫn.',
    },
    {
        key: 'presentationSlideFiles',
        label: 'Slide thuyết trình',
        description: 'Slide dùng để báo cáo đề tài trước hội đồng.',
    },
    {
        key: 'presentationVideoFiles',
        label: 'Video (nếu cần)',
        description: 'Video demo hoặc clip trình bày sản phẩm.',
        optional: true,
    },
];

const REQUIRED_FILE_KEYS = FILE_CATEGORIES.filter((item) => !item.optional).map((item) => item.key);

const createInitialFormState = (): ClosingFormState => ({
    note: '',
    reportFiles: [],
    researchSourceCodeFiles: [],
    researchGuideFiles: [],
    administrativeDefenseApplicationFiles: [],
    administrativeAchievementEvidenceFiles: [],
    administrativeAdvisorReviewFiles: [],
    presentationSlideFiles: [],
    presentationVideoFiles: [],
});

const closingStatusLabel: Record<string, string> = {
    SUBMITTED: 'Đã nộp',
    REVISION_REQUESTED: 'Cần bổ sung',
    APPROVED: 'Đã duyệt',
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

export function LecturerProjectClosingManagementPage() {
    const { data: closingItems = [], isLoading } = useLecturerProjectClosings();
    const submitMutation = useSubmitLecturerProjectClosing();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [callRoundFilter, setCallRoundFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LecturerProjectClosingItem | null>(null);
    const [formState, setFormState] = useState<ClosingFormState>(createInitialFormState);
    const [uploadingCategory, setUploadingCategory] = useState<ClosingFileCategoryKey | null>(null);

    const requiredUploadedCount = useMemo(
        () => REQUIRED_FILE_KEYS.filter((key) => formState[key].length > 0).length,
        [formState],
    );
    const requiredCompletionPercent = Math.round((requiredUploadedCount / REQUIRED_FILE_KEYS.length) * 100);
    const totalUploadedFiles = useMemo(
        () => FILE_CATEGORIES.reduce((total, category) => total + formState[category.key].length, 0),
        [formState],
    );

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

            if (!keyword) {
                return true;
            }

            const textPool = [
                item.project.title,
                item.project.student.name,
                item.project.student.code || '',
                item.project.student.email,
                item.project.callRound?.name || '',
            ]
                .join(' ')
                .toLowerCase();

            return textPool.includes(keyword);
        });
    }, [callRoundFilter, closingItems, searchKeyword]);

    const requiredFileCompletionText = (item: LecturerProjectClosingItem) => {
        const submission = item.submission;
        if (!submission) {
            return `0/${REQUIRED_FILE_KEYS.length}`;
        }

        const completedCount = REQUIRED_FILE_KEYS.filter((key) => submission[key].length > 0).length;
        return `${completedCount}/${REQUIRED_FILE_KEYS.length}`;
    };

    const openSubmissionDialog = (item: LecturerProjectClosingItem) => {
        setSelectedItem(item);
        setFormState({
            note: item.submission?.note ?? '',
            reportFiles: item.submission?.reportFiles ?? [],
            researchSourceCodeFiles: item.submission?.researchSourceCodeFiles ?? [],
            researchGuideFiles: item.submission?.researchGuideFiles ?? [],
            administrativeDefenseApplicationFiles: item.submission?.administrativeDefenseApplicationFiles ?? [],
            administrativeAchievementEvidenceFiles: item.submission?.administrativeAchievementEvidenceFiles ?? [],
            administrativeAdvisorReviewFiles: item.submission?.administrativeAdvisorReviewFiles ?? [],
            presentationSlideFiles: item.submission?.presentationSlideFiles ?? [],
            presentationVideoFiles: item.submission?.presentationVideoFiles ?? [],
        });
        setIsDialogOpen(true);
    };

    const handleUploadFiles = async (category: ClosingFileCategoryKey, fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) {
            return;
        }

        setUploadingCategory(category);
        try {
            const uploadedFiles: UploadedEvidenceFile[] = [];

            for (const file of Array.from(fileList)) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const payload = (await response.json()) as { url?: string; error?: string };

                if (!response.ok || !payload.url) {
                    throw new Error(payload.error || 'Không thể tải lên tệp');
                }

                uploadedFiles.push({
                    name: file.name,
                    url: payload.url,
                });
            }

            setFormState((prev) => ({
                ...prev,
                [category]: [...prev[category], ...uploadedFiles],
            }));

            toast.success(`Đã tải lên ${uploadedFiles.length} tệp`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải lên tệp';
            toast.error(message);
        } finally {
            setUploadingCategory(null);
        }
    };

    const removeUploadedFile = (category: ClosingFileCategoryKey, fileIndex: number) => {
        setFormState((prev) => ({
            ...prev,
            [category]: prev[category].filter((_, index) => index !== fileIndex),
        }));
    };

    const handleSubmitClosing = () => {
        if (!selectedItem) {
            return;
        }

        submitMutation.mutate(
            {
                projectId: selectedItem.project.id,
                note: formState.note?.trim() || null,
                reportFiles: formState.reportFiles,
                researchSourceCodeFiles: formState.researchSourceCodeFiles,
                researchGuideFiles: formState.researchGuideFiles,
                administrativeDefenseApplicationFiles: formState.administrativeDefenseApplicationFiles,
                administrativeAchievementEvidenceFiles: formState.administrativeAchievementEvidenceFiles,
                administrativeAdvisorReviewFiles: formState.administrativeAdvisorReviewFiles,
                presentationSlideFiles: formState.presentationSlideFiles,
                presentationVideoFiles: formState.presentationVideoFiles,
            },
            {
                onSuccess: () => {
                    toast.success('Nộp hồ sơ nghiệm thu thành công');
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
                            : 'Không thể nộp hồ sơ nghiệm thu';
                    toast.error(message);
                },
            },
        );
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Nghiệm thu đề tài sinh viên</h1>
                <p className="text-muted-foreground">
                    Giảng viên hướng dẫn nộp hồ sơ nghiệm thu gồm báo cáo, sản phẩm nghiên cứu, giấy tờ hành chính,
                    slide thuyết trình và video (nếu có).
                </p>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Danh sách đề tài hướng dẫn</CardTitle>
                    <CardDescription>Chọn đề tài để nộp hoặc cập nhật hồ sơ nghiệm thu.</CardDescription>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <Select value={callRoundFilter} onValueChange={setCallRoundFilter}>
                            <SelectTrigger className="w-full sm:w-72">
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

                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo đề tài, sinh viên..."
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
                            Không có đề tài phù hợp với bộ lọc hiện tại.
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>STT</TableHead>
                                        <TableHead>Đề tài</TableHead>
                                        <TableHead>Sinh viên</TableHead>
                                        <TableHead>Đợt đề tài</TableHead>
                                        <TableHead>Trạng thái đề tài</TableHead>
                                        <TableHead>Hồ sơ nghiệm thu</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item, index) => (
                                        <TableRow key={item.project.id}>
                                            <TableCell>{index + 1}</TableCell>
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
                                            <TableCell>{item.project.callRound?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {projectStatusLabel[item.project.status] || item.project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.submission ? (
                                                    <div className="space-y-1">
                                                        <Badge
                                                            variant={
                                                                closingStatusVariant[item.submission.status] ||
                                                                'secondary'
                                                            }
                                                        >
                                                            {closingStatusLabel[item.submission.status] ||
                                                                item.submission.status}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground">
                                                            Hồ sơ bắt buộc: {requiredFileCompletionText(item)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary">Chưa nộp</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => openSubmissionDialog(item)}
                                                >
                                                    {item.submission ? 'Cập nhật hồ sơ' : 'Nộp hồ sơ'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[min(96vw,1100px)] max-h-[90vh] overflow-hidden p-0 sm:max-w-1/2">
                    <DialogHeader className="px-6 py-4 border-b bg-muted/20">
                        <DialogTitle>Nộp hồ sơ nghiệm thu đề tài</DialogTitle>
                        <DialogDescription>
                            {selectedItem
                                ? `Đề tài: ${selectedItem.project.title}`
                                : 'Chuẩn bị đầy đủ hồ sơ trước khi nộp nghiệm thu.'}
                        </DialogDescription>
                    </DialogHeader>

                    {!selectedItem ? null : (
                        <>
                            <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-5 space-y-5">
                                <div className="rounded-lg border bg-linear-to-r from-slate-50 to-white p-4 space-y-3">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1 text-sm">
                                            <p className="font-semibold text-base">{selectedItem.project.title}</p>
                                            <p className="text-muted-foreground">
                                                Sinh viên: {selectedItem.project.student.name}
                                            </p>
                                            <p className="text-muted-foreground">Email: {selectedItem.project.student.email}</p>
                                            <p className="text-muted-foreground">
                                                Đợt đề tài: {selectedItem.project.callRound?.name || 'N/A'}
                                            </p>
                                        </div>

                                        <div className="min-w-55 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Hồ sơ bắt buộc</span>
                                                <span>
                                                    {requiredUploadedCount}/{REQUIRED_FILE_KEYS.length} ({requiredCompletionPercent}%)
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${requiredCompletionPercent}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Tổng số tệp đã tải lên: {totalUploadedFiles}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Ghi chú</Label>
                                    <Textarea
                                        value={formState.note || ''}
                                        onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                                        placeholder="Ghi chú thêm về hồ sơ nghiệm thu (nếu có)..."
                                        className="min-h-20"
                                    />
                                </div>

                                <div className="space-y-3">
                                    {FILE_CATEGORIES.map((category) => (
                                        <Card key={category.key} className="border-muted-foreground/20">
                                            <CardHeader className="pb-2">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <CardTitle className="text-base">{category.label}</CardTitle>
                                                        <CardDescription>{category.description}</CardDescription>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">{formState[category.key].length} tệp</Badge>
                                                        <Badge variant={category.optional ? 'secondary' : 'outline'}>
                                                            {category.optional ? 'Tùy chọn' : 'Bắt buộc'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Input
                                                            type="file"
                                                            multiple
                                                            onChange={(event) => {
                                                                handleUploadFiles(category.key, event.target.files);
                                                                event.currentTarget.value = '';
                                                            }}
                                                            disabled={uploadingCategory === category.key || submitMutation.isPending}
                                                        />
                                                        {uploadingCategory === category.key && (
                                                            <p className="text-xs text-muted-foreground">Đang tải tệp lên...</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {formState[category.key].length === 0 ? (
                                                    <p className="text-xs text-muted-foreground border rounded-md border-dashed p-2">
                                                        Chưa có tệp nào trong mục này.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {formState[category.key].map((file, fileIndex) => (
                                                            <div
                                                                key={`${file.url}-${fileIndex}`}
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
                                                                <div className="flex items-center gap-1">
                                                                    <Button type="button" size="icon" variant="ghost" asChild>
                                                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                                            <Download className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => removeUploadedFile(category.key, fileIndex)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
                                <p className="text-xs text-muted-foreground">
                                    Vui lòng hoàn tất hồ sơ bắt buộc trước khi nộp chính thức.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Đóng
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSubmitClosing}
                                        disabled={submitMutation.isPending}
                                    >
                                        <UploadCloud className="h-4 w-4 mr-2" />
                                        {submitMutation.isPending ? 'Đang nộp...' : 'Nộp hồ sơ nghiệm thu'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
