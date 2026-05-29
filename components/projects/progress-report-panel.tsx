'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuthSession } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import {
    useProgressReports,
    useCreateProgressReport,
    useReviewProgressReport,
    useUpdateProgressReport,
} from '@/hooks/useProjectOperations';
import type { Project } from '@/types/project.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/projects/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from '@/components/projects/document-viewer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Eye, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ProgressReportPanelProps = {
    projectId: string;
};

type ProgressReport = {
    id: string;
    projectId: string;
    periodLabel: string;
    summary?: string | null;
    week?: number | null;
    fromDate?: Date | null;
    toDate?: Date | null;
    tasks?: string | null;
    performedContent?: string | null;
    results?: string | null;
    reportContent?: string | null;
    fileUrl?: string | null;
    mentorScore?: number | null;
    mentorReview?: string | null;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
};

type TemplateItem = {
    id: string;
    weekNumber: number;
    weekLabel: string;
    taskDescription: string;
    contentGuideline?: string | null;
    expectedResult?: string | null;
    orderIndex: number;
};

type TemplateWeekRange = {
    itemId: string;
    fromDate: Date;
    toDate: Date;
    isFutureWeek: boolean;
    exceedsProjectEnd: boolean;
};

const stripTime = (date: Date): Date => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
};

const addDays = (date: Date, days: number): Date => {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
};

const formatDateInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date?: Date | string | null): string => {
    if (!date) {
        return 'Chưa cập nhật';
    }

    const parsedDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Chưa cập nhật';
    }

    return parsedDate.toLocaleDateString('vi-VN');
};

const isDatePassed = (currentDate: Date, targetDate?: Date | string | null): boolean => {
    if (!targetDate) {
        return false;
    }

    const parsedDate = targetDate instanceof Date ? targetDate : new Date(targetDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return false;
    }

    return currentDate > stripTime(parsedDate);
};

const inferWeeksFromLabel = (label: string): number => {
    const weekNumbers = (label.match(/\d+/g) ?? []).map((value) => Number(value));
    if (weekNumbers.length < 2) {
        return 1;
    }

    const first = weekNumbers[0];
    const last = weekNumbers[weekNumbers.length - 1];
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
        return 1;
    }

    return last - first + 1;
};

export function ProgressReportPanel({ projectId }: ProgressReportPanelProps) {
    const { data: session } = useAuthSession();
    const { data: projects = [] } = useProjects();
    const project = projects.find((p) => p.id === projectId);

    const { data: reports = [], isLoading } = useProgressReports(projectId);
    const createMutation = useCreateProgressReport();
    const reviewMutation = useReviewProgressReport(projectId);
    const updateMutation = useUpdateProgressReport(projectId);

    // Get template items from project's callRound
    const templateItems: TemplateItem[] = useMemo(
        () =>
            (project?.callRound?.template?.items ?? [])
                .map((item) => ({
                    id: item.id,
                    weekNumber: item.weekNumber,
                    weekLabel: item.weekLabel,
                    taskDescription: item.taskDescription,
                    contentGuideline: item.contentGuideline ?? null,
                    expectedResult: item.expectedResult ?? null,
                    orderIndex: item.orderIndex,
                }))
                .sort((a, b) => a.orderIndex - b.orderIndex),
        [project?.callRound?.template?.items],
    );
    const hasTemplate = templateItems.length > 0;
    const projectStartDate = stripTime(
        project?.callRound?.projectStartDate ??
            project?.callRound?.registrationStartDate ??
            project?.createdAt ??
            new Date(),
    );
    const projectEndDate = project?.callRound?.projectEndDate
        ? stripTime(new Date(project.callRound.projectEndDate))
        : null;

    const templateWeekRanges = useMemo<TemplateWeekRange[]>(() => {
        const today = stripTime(new Date());
        let currentFromDate = projectStartDate;

        return templateItems.map((item, index) => {
            const nextItem = templateItems[index + 1];
            const currentWeekSpan = nextItem
                ? Math.max(1, nextItem.weekNumber - item.weekNumber)
                : Math.max(1, inferWeeksFromLabel(item.weekLabel));
            const toDate = addDays(currentFromDate, currentWeekSpan * 7 - 1);

            const range: TemplateWeekRange = {
                itemId: item.id,
                fromDate: currentFromDate,
                toDate,
                isFutureWeek: today < currentFromDate,
                exceedsProjectEnd: projectEndDate ? toDate > projectEndDate : false,
            };

            currentFromDate = addDays(toDate, 1);
            return range;
        });
    }, [projectEndDate, projectStartDate, templateItems]);

    const templateWeekRangeMap = useMemo(
        () => new Map(templateWeekRanges.map((range) => [range.itemId, range])),
        [templateWeekRanges],
    );

    // States for form - Dynamic based on template
    const [selectedTemplateItem, setSelectedTemplateItem] = useState<TemplateItem | null>(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [tasks, setTasks] = useState('');
    const [performedContent, setPerformedContent] = useState('');
    const [results, setResults] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Show/hide template guide
    const [showGuide, setShowGuide] = useState(true);
    const [editingReportId, setEditingReportId] = useState<string | null>(null);

    // Detail view dialog
    const [selectedReport, setSelectedReport] = useState<ProgressReport | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    // Mentor Review States
    const [reviewScore, setReviewScore] = useState('');
    const [reviewNote, setReviewNote] = useState('');

    // Document Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentDocUrl, setCurrentDocUrl] = useState('');
    const [currentDocName, setCurrentDocName] = useState('');

    if (!project) return null;

    const typedProject = project as Project;
    const instructorDisplay =
        typedProject.instructor?.name ||
        typedProject.instructorId ||
        typedProject.deanReviewer?.name ||
        'Chưa phân công';
    const callRoundDisplay = typedProject.callRound?.name || 'Chưa gắn đợt đề tài';
    const templateDisplay = typedProject.callRound?.template?.name || 'Có sẵn';
    const callRoundMilestones = [
        {
            label: 'Ngày bắt đầu đăng ký',
            value: typedProject.callRound?.registrationStartDate,
        },
        {
            label: 'Ngày kết thúc đăng ký',
            value: typedProject.callRound?.registrationEndDate,
        },
        {
            label: 'Ngày bắt đầu đề tài',
            value: typedProject.callRound?.projectStartDate,
        },
        {
            label: 'Ngày kết thúc đề tài',
            value: typedProject.callRound?.projectEndDate,
        },
        {
            label: 'Ngày bắt đầu báo cáo',
            value: typedProject.callRound?.reportingStartDate,
        },
        {
            label: 'Hạn phản biện',
            value: typedProject.callRound?.reviewDeadline,
        },
        {
            label: 'Ngày bảo vệ',
            value: typedProject.callRound?.defenseDate,
        },
        {
            label: 'Ngày khóa đề tài',
            value: typedProject.callRound?.projectLockDate,
        },
    ];

    const isLeader = session?.userId === project.leaderId;
    const isMentor =
        session?.role === 'DEAN' ||
        session?.role === 'ADMIN' ||
        session?.role === 'LEADER' ||
        session?.role === 'LECTURER';
    const today = stripTime(new Date());
    const reportLockDate = typedProject.callRound?.projectLockDate ?? typedProject.callRound?.projectEndDate ?? null;
    const isGlobalSubmissionLocked = isDatePassed(today, reportLockDate);
    const hasSubmittedInNonTemplateMode = !hasTemplate && reports.length > 0;
    const selectedTemplateRange = selectedTemplateItem
        ? (templateWeekRangeMap.get(selectedTemplateItem.id) ?? null)
        : null;
    const isSelectedTemplatePastDeadline =
        selectedTemplateRange !== null ? isDatePassed(today, selectedTemplateRange.toDate) : false;
    const isFormReadOnly = isGlobalSubmissionLocked || hasSubmittedInNonTemplateMode || isSelectedTemplatePastDeadline;
    const isEditing = Boolean(editingReportId);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setFileUrl(data.url);
                toast.success('Tải file thành công');
            } else {
                toast.error(data.error || 'Lỗi tải file');
            }
        } catch {
            toast.error('Lỗi tải file');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectTemplateItem = (item: TemplateItem) => {
        if (isGlobalSubmissionLocked) {
            toast.error('Đã quá hạn nộp báo cáo của đề tài.');
            return;
        }

        if (reports.some((report) => report.week === item.weekNumber)) {
            return;
        }

        const selectedRange = templateWeekRangeMap.get(item.id);
        if (!selectedRange) {
            return;
        }

        if (isDatePassed(today, selectedRange.toDate)) {
            toast.error('Tuần này đã quá hạn nộp báo cáo.');
            return;
        }

        setSelectedTemplateItem(item);
        setTasks(item.taskDescription); // Pre-fill from template
        setPerformedContent('');
        setResults('');
        setReportContent('');
        setFileUrl('');
        setFromDate(formatDateInput(selectedRange.fromDate));
        setToDate(formatDateInput(selectedRange.toDate));
    };

    const handleCreate = () => {
        if (isFormReadOnly) {
            toast.error('Báo cáo đang ở chế độ chỉ xem, không thể chỉnh sửa hoặc nộp mới.');
            return;
        }

        if (!fromDate || !toDate) {
            toast.error('Vui lòng chọn ngày tháng');
            return;
        }

        const weekNumber = hasTemplate && selectedTemplateItem ? selectedTemplateItem.weekNumber : 1;
        const periodLabel = hasTemplate && selectedTemplateItem ? selectedTemplateItem.weekLabel : `Tuần ${weekNumber}`;

        const payload = {
            periodLabel,
            summary: tasks.substring(0, 100),
            week: weekNumber,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            tasks,
            performedContent,
            results,
            reportContent,
            fileUrl: fileUrl || undefined,
        };

        const onSuccess = () => {
            toast.success(isEditing ? 'Cập nhật báo cáo thành công' : 'Nộp báo cáo thành công');
            setSelectedTemplateItem(null);
            setEditingReportId(null);
            setTasks('');
            setPerformedContent('');
            setResults('');
            setReportContent('');
            setFileUrl('');
            setFromDate('');
            setToDate('');
        };

        const onError = (error: unknown) => {
            if (axios.isAxiosError(error)) {
                const serverMessage =
                    (error.response?.data as { error?: string; message?: string; fields?: Record<string, string[]> } | undefined)
                        ?.error ||
                    (error.response?.data as { error?: string; message?: string; fields?: Record<string, string[]> } | undefined)
                        ?.message;

                if (serverMessage) {
                    toast.error(serverMessage);
                    return;
                }
            }

            if (error instanceof Error) {
                toast.error(error.message);
                return;
            }

            toast.error(isEditing ? 'Có lỗi xảy ra khi cập nhật' : 'Có lỗi xảy ra khi nộp');
        };

        if (editingReportId) {
            updateMutation.mutate(
                { reportId: editingReportId, payload },
                { onSuccess, onError },
            );
            return;
        }

        createMutation.mutate(
            { projectId, payload },
            {
                onSuccess,
                onError,
            },
        );
    };

    const canEditReport = (report: ProgressReport) => !isGlobalSubmissionLocked && !isDatePassed(today, report.toDate ?? null);

    const handleEditReport = (report: ProgressReport) => {
        if (!canEditReport(report)) {
            toast.error('Đã quá thời gian tuần báo cáo, không thể sửa.');
            return;
        }

        setEditingReportId(report.id);
        setSelectedTemplateItem(null);
        setFromDate(report.fromDate ? formatDateInput(new Date(report.fromDate)) : '');
        setToDate(report.toDate ? formatDateInput(new Date(report.toDate)) : '');
        setTasks(report.tasks ?? '');
        setPerformedContent(report.performedContent ?? '');
        setResults(report.results ?? '');
        setReportContent(report.reportContent ?? '');
        setFileUrl(report.fileUrl ?? '');
    };

    const handleViewReport = (report: ProgressReport) => {
        setSelectedReport(report);
        setReviewScore(report.mentorScore?.toString() || '');
        setReviewNote(report.mentorReview || '');
        setDetailDialogOpen(true);
    };

    const handleReview = () => {
        if (!selectedReport) return;

        const score = Number(reviewScore);
        if (isNaN(score) || score < 0 || score > 10) {
            toast.error('Điểm không hợp lệ (0-10)');
            return;
        }
        if (!reviewNote.trim()) {
            toast.error('Vui lòng nhập nhận xét');
            return;
        }

        reviewMutation.mutate(
            {
                reportId: selectedReport.id,
                payload: { mentorScore: score, mentorReview: reviewNote },
            },
            {
                onSuccess: () => {
                    toast.success('Đã lưu đánh giá báo cáo');
                    setDetailDialogOpen(false);
                },
                onError: () => toast.error('Lỗi khi lưu đánh giá'),
            },
        );
    };

    return (
        <div className="space-y-8">
            {/* Phần 1: Thông tin */}
            <Card>
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle>Phần 1: Thông tin đề tài</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid gap-4 md:grid-cols-2">
                    <div>
                        <Label className="text-muted-foreground">Tên đề tài:</Label>
                        <p className="font-medium">{project.title}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Giảng viên hướng dẫn:</Label>
                        <p className="font-medium">{instructorDisplay}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Đợt đăng ký:</Label>
                        <p className="font-medium">{callRoundDisplay}</p>
                    </div>
                    {hasTemplate && (
                        <div>
                            <Label className="text-muted-foreground">Mẫu báo cáo tiến độ:</Label>
                            <p className="font-medium text-primary">
                                {templateDisplay} ({templateItems.length} tuần)
                            </p>
                        </div>
                    )}
                    <div className="md:col-span-2 border-t pt-4 mt-1">
                        <Label className="text-muted-foreground">Mốc thời gian:</Label>
                        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {callRoundMilestones.map((milestone) => (
                                <div key={milestone.label}>
                                    <Label className="text-muted-foreground">{milestone.label}:</Label>
                                    <p className="font-medium">{formatDisplayDate(milestone.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Phần 2: Nộp báo cáo tiến độ (Chỉ Leader) */}
            {isLeader && (
                <Card>
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <CardTitle>Phần 2: Báo cáo tiến độ</CardTitle>
                        <CardDescription>
                            {hasTemplate
                                ? 'Chọn tuần báo cáo từ mẫu và điền nội dung thực hiện.'
                                : 'Nhập chi tiết tiến trình công việc thực hiện theo tuần.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {isGlobalSubmissionLocked && (
                            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                Đã quá hạn nộp báo cáo của đề tài, hệ thống chỉ cho phép xem.
                            </div>
                        )}
                        {hasSubmittedInNonTemplateMode && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                Bạn đã nộp báo cáo. Ở trạng thái này chỉ được xem, không được chỉnh sửa.
                            </div>
                        )}

                        {/* Template-based Selection */}
                        {hasTemplate ? (
                            <>
                                <div className="space-y-2">
                                    <Label>
                                        Chọn tuần báo cáo <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {templateItems.map((item) => {
                                            const isSelected = selectedTemplateItem?.id === item.id;
                                            const alreadyReported = reports.some((r) => r.week === item.weekNumber);
                                            const weekRange = templateWeekRangeMap.get(item.id);
                                            const isFutureWeek = weekRange?.isFutureWeek ?? false;
                                            const exceedsProjectEnd = weekRange?.exceedsProjectEnd ?? false;
                                            const isPastWeekDeadline = weekRange
                                                ? isDatePassed(today, weekRange.toDate)
                                                : false;
                                            const isDisabledByDate =
                                                isGlobalSubmissionLocked ||
                                                isFutureWeek ||
                                                exceedsProjectEnd ||
                                                isPastWeekDeadline;
                                            const isDisabled = alreadyReported || isDisabledByDate;

                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleSelectTemplateItem(item)}
                                                    disabled={isDisabled}
                                                    className={`
                                                        relative p-4 border-2 rounded-lg text-left transition-all
                                                        ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                                                        ${isDisabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'cursor-pointer hover:border-primary/50'}
                                                    `}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="font-semibold text-sm">{item.weekLabel}</div>
                                                        <div className="flex flex-wrap items-center justify-end gap-1">
                                                            {alreadyReported && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Đã nộp
                                                                </Badge>
                                                            )}
                                                            {!alreadyReported && isFutureWeek && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Chưa đến tuần
                                                                </Badge>
                                                            )}
                                                            {!alreadyReported && !isFutureWeek && exceedsProjectEnd && (
                                                                <Badge variant="destructive" className="text-xs">
                                                                    Quá hạn đề tài
                                                                </Badge>
                                                            )}
                                                            {!alreadyReported &&
                                                                !isFutureWeek &&
                                                                !exceedsProjectEnd &&
                                                                isPastWeekDeadline && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        Quá hạn nộp
                                                                    </Badge>
                                                                )}
                                                        </div>
                                                    </div>
                                                    {weekRange && (
                                                        <p className="text-[11px] text-muted-foreground mb-2">
                                                            {weekRange.fromDate.toLocaleDateString('vi-VN')} -{' '}
                                                            {weekRange.toDate.toLocaleDateString('vi-VN')}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {item.taskDescription}
                                                    </p>
                                                    {item.expectedResult && (
                                                        <p className="text-xs text-primary mt-1">
                                                            Kết quả: {item.expectedResult}
                                                        </p>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Show template guidelines when an item is selected */}
                                {selectedTemplateItem && (
                                    <Collapsible open={showGuide} onOpenChange={setShowGuide}>
                                        <div className="border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                                            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                                                        Hướng dẫn cho {selectedTemplateItem.weekLabel}
                                                    </span>
                                                </div>
                                                {showGuide ? (
                                                    <ChevronUp className="h-4 w-4 text-blue-600" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-blue-600" />
                                                )}
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="px-4 pb-3">
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <strong className="text-blue-900 dark:text-blue-100">
                                                            Công việc được giao:
                                                        </strong>
                                                        <p className="text-blue-800 dark:text-blue-200 mt-1">
                                                            {selectedTemplateItem.taskDescription}
                                                        </p>
                                                    </div>
                                                    {selectedTemplateItem.contentGuideline && (
                                                        <div>
                                                            <strong className="text-blue-900 dark:text-blue-100">
                                                                Hướng dẫn nội dung:
                                                            </strong>
                                                            <p className="text-blue-800 dark:text-blue-200 mt-1">
                                                                {selectedTemplateItem.contentGuideline}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {selectedTemplateItem.expectedResult && (
                                                        <div>
                                                            <strong className="text-blue-900 dark:text-blue-100">
                                                                Kết quả mong đợi:
                                                            </strong>
                                                            <p className="text-blue-800 dark:text-blue-200 mt-1">
                                                                {selectedTemplateItem.expectedResult}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                )}
                            </>
                        ) : null}

                        {/* Date Range */}
                        {(selectedTemplateItem || !hasTemplate || isEditing) && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>
                                            Từ ngày <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            disabled={isFormReadOnly}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>
                                            Đến ngày <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            disabled={isFormReadOnly}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Công việc được giao</Label>
                                    <Textarea
                                        value={tasks}
                                        onChange={(e) => setTasks(e.target.value)}
                                        placeholder="Nhập các công việc đã được giao..."
                                        rows={3}
                                        disabled={isFormReadOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Nội dung thực hiện</Label>
                                    <div className="border bg-background rounded-md overflow-hidden p-1">
                                        <RichTextEditor
                                            value={performedContent}
                                            onChange={isFormReadOnly ? () => {} : setPerformedContent}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Kết quả đạt được</Label>
                                    <div className="border bg-background rounded-md overflow-hidden p-1">
                                        <RichTextEditor
                                            value={results}
                                            onChange={isFormReadOnly ? () => {} : setResults}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Nội dung báo cáo chi tiết</Label>
                                    <div className="border bg-background rounded-md overflow-hidden p-1">
                                        <RichTextEditor
                                            value={reportContent}
                                            onChange={isFormReadOnly ? () => {} : setReportContent}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>File đính kèm báo cáo</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="file"
                                            onChange={handleFileUpload}
                                            disabled={isUploading || isFormReadOnly}
                                        />
                                        {fileUrl && (
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                className="text-sm text-primary underline shrink-0 truncate max-w-50"
                                            >
                                                Đã đính kèm
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreate}
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending ||
                                        isUploading ||
                                        !fromDate ||
                                        !toDate ||
                                        isFormReadOnly
                                    }
                                    className="w-full"
                                >
                                    {createMutation.isPending
                                        ? 'Đang gửi...'
                                        : updateMutation.isPending
                                          ? 'Đang cập nhật...'
                                        : isFormReadOnly
                                          ? 'Chỉ xem - Không thể chỉnh sửa'
                                          : isEditing
                                            ? 'Lưu chỉnh sửa'
                                            : 'Nộp báo cáo tuần'}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Phần 3: List báo cáo dạng Table */}
            <Card>
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle>Phần 3: Danh sách báo cáo tuần</CardTitle>
                    <CardDescription>Xem chi tiết báo cáo, đánh giá và nhận xét</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">Đang tải...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Chưa có báo cáo nào được nộp.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">STT</TableHead>
                                        <TableHead>Tên báo cáo</TableHead>
                                        <TableHead>Tuần</TableHead>
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>Điểm</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reports.map((report, index) => (
                                        <TableRow key={report.id} className="cursor-pointer hover:bg-muted/30">
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{report.periodLabel}</TableCell>
                                            <TableCell>Tuần {report.week}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {report.fromDate
                                                    ? new Date(report.fromDate).toLocaleDateString('vi-VN')
                                                    : ''}
                                                {' - '}
                                                {report.toDate
                                                    ? new Date(report.toDate).toLocaleDateString('vi-VN')
                                                    : ''}
                                            </TableCell>
                                            <TableCell>
                                                {report.mentorScore !== null && report.mentorScore !== undefined ? (
                                                    <Badge variant="secondary" className="font-mono">
                                                        {report.mentorScore}/10
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Chưa chấm</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {report.mentorReview ? (
                                                    <Badge variant="default" className="bg-green-600">
                                                        Đã đánh giá
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">Chưa đánh giá</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {report.fileUrl && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCurrentDocUrl(report.fileUrl!);
                                                                setCurrentDocName(`Báo cáo ${report.periodLabel}`);
                                                                setViewerOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewReport(report);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Xem
                                                    </Button>
                                                    {isLeader && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            disabled={!canEditReport(report)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditReport(report);
                                                            }}
                                                        >
                                                            Sửa
                                                        </Button>
                                                    )}
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

            {/* Detail Dialog - 2/3 screen width */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-[66vw] max-h-[90vh] sm:max-w-1/2 overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span>Chi tiết {selectedReport?.periodLabel}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Thời gian:{' '}
                            {selectedReport?.fromDate
                                ? new Date(selectedReport.fromDate).toLocaleDateString('vi-VN')
                                : ''}
                            {' - '}
                            {selectedReport?.toDate ? new Date(selectedReport.toDate).toLocaleDateString('vi-VN') : ''}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-2">
                            {/* File Viewer Section - If file exists, show it first */}
                            {selectedReport.fileUrl && (
                                <div className="border rounded-lg overflow-hidden bg-muted/20">
                                    <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                                        <Label className="font-semibold flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            File báo cáo đính kèm
                                        </Label>
                                        <a
                                            href={selectedReport.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Mở trong tab mới →
                                        </a>
                                    </div>
                                    <div className="w-full h-100">
                                        <iframe
                                            src={selectedReport.fileUrl}
                                            className="w-full h-full"
                                            title={`Báo cáo ${selectedReport.periodLabel}`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Content sections */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="font-semibold">Công việc được giao:</Label>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2 p-3 bg-muted/30 rounded-md">
                                        {selectedReport.tasks || 'N/A'}
                                    </p>
                                </div>

                                <div>
                                    <Label className="font-semibold">Nội dung đã thực hiện:</Label>
                                    <div
                                        className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert mt-2 p-3 bg-muted/30 rounded-md"
                                        dangerouslySetInnerHTML={{
                                            __html: selectedReport.performedContent || 'N/A',
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label className="font-semibold">Kết quả đạt được:</Label>
                                    <div
                                        className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert mt-2 p-3 bg-muted/30 rounded-md"
                                        dangerouslySetInnerHTML={{
                                            __html: selectedReport.results || 'N/A',
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label className="font-semibold">Nội dung báo cáo chi tiết:</Label>
                                    <div
                                        className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert mt-2 p-3 bg-muted/30 rounded-md"
                                        dangerouslySetInnerHTML={{
                                            __html: selectedReport.reportContent || 'N/A',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Review Section */}
                            <div className="border-t pt-6">
                                <Label className="font-semibold text-base mb-4 block">
                                    Đánh giá của Người Hướng Dẫn
                                </Label>

                                {selectedReport.mentorReview ? (
                                    <div className="space-y-3 p-4 bg-primary/5 rounded-md border border-primary/20">
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Nhận xét:</Label>
                                            <p className="mt-1">{selectedReport.mentorReview}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm text-muted-foreground">Điểm số:</Label>
                                            <p className="mt-1 font-semibold text-lg">
                                                {selectedReport.mentorScore}/10
                                            </p>
                                        </div>
                                    </div>
                                ) : isMentor ? (
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                                        <div className="space-y-2">
                                            <Label>
                                                Nhận xét <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                placeholder="Nhập nhận xét đánh giá..."
                                                value={reviewNote}
                                                onChange={(e) => setReviewNote(e.target.value)}
                                                rows={4}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>
                                                Điểm số (0-10) <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                type="number"
                                                placeholder="Nhập điểm (0-10)"
                                                min={0}
                                                max={10}
                                                step={0.5}
                                                value={reviewScore}
                                                onChange={(e) => setReviewScore(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleReview}
                                            disabled={reviewMutation.isPending}
                                            className="w-full"
                                        >
                                            {reviewMutation.isPending ? 'Đang lưu...' : 'Lưu đánh giá'}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic p-4 bg-muted/20 rounded-md">
                                        Chưa có đánh giá từ người hướng dẫn.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Document Viewer Dialog */}
            <DocumentViewer
                fileUrl={currentDocUrl}
                fileName={currentDocName}
                open={viewerOpen}
                onOpenChange={setViewerOpen}
            />
        </div>
    );
}
