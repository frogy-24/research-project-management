'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Download, Link2, Search, Trash2 } from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import {
    useAssignProjectsToCouncil,
    useCouncilProjectAssignments,
    useFinalizeCouncilProjectAssignments,
    useUnassignProjectsFromCouncil,
    useUpdateCouncilDefenseLocation,
} from '@/hooks/useCouncilProjectAssignments';
import { useDeanCouncilEvaluations } from '@/hooks/useDeanCouncilEvaluations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const toDateTimeLocalValue = (value: Date | string | null | undefined): string => {
    if (!value) {
        return '';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hour = String(parsedDate.getHours()).padStart(2, '0');
    const minute = String(parsedDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
};

type CouncilProjectAssignmentManagementProps = {
    mode?: 'full' | 'evaluations-only';
    deferEvaluationFetchUntilFilter?: boolean;
};

type ProjectEvaluationDetail = {
    projectId: string;
    projectTitle: string;
    councils: string;
    averageScore: number;
    totalEvaluations: number;
    passCount: number;
    revisionCount: number;
    failCount: number;
    studentName: string;
    studentCode: string | null;
    studentEmail: string;
    studentClassName: string | null;
    advisorName: string | null;
    advisorCode: string | null;
    advisorEmail: string | null;
    defenseDate: Date | null;
    defenseLocation: string | null;
};

type EvaluationSortField = 'evaluatedAt' | 'score' | 'projectTitle' | 'councilName' | 'evaluatorName';
type EvaluationSortOrder = 'asc' | 'desc';

export function CouncilProjectAssignmentManagement({
    mode = 'full',
    deferEvaluationFetchUntilFilter = false,
}: CouncilProjectAssignmentManagementProps) {
    const isEvaluationsOnly = mode === 'evaluations-only';
    const [selectedCallRoundId, setSelectedCallRoundId] = useState('');
    const [selectedEvaluationCallRoundId, setSelectedEvaluationCallRoundId] = useState(() =>
        deferEvaluationFetchUntilFilter ? '' : 'all',
    );
    const [selectedCouncilId, setSelectedCouncilId] = useState('');
    const [search, setSearch] = useState('');
    const [evaluationSearch, setEvaluationSearch] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedAssignedProjectIds, setSelectedAssignedProjectIds] = useState<string[]>([]);
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
    const [isEvaluationDetailDialogOpen, setIsEvaluationDetailDialogOpen] = useState(false);
    const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState<ProjectEvaluationDetail | null>(null);
    const [evaluationSortField, setEvaluationSortField] = useState<EvaluationSortField>('evaluatedAt');
    const [evaluationSortOrder, setEvaluationSortOrder] = useState<EvaluationSortOrder>('desc');
    const [evaluationCurrentPage, setEvaluationCurrentPage] = useState(1);
    const evaluationPageSize = 10;
    const [defenseLocationInput, setDefenseLocationInput] = useState('');
    const [reportDateInput, setReportDateInput] = useState('');

    const { data: callRounds = [], isLoading: loadingCallRounds } = useCallRounds();
    const approvedCallRounds = useMemo(
        () => callRounds.filter((callRound) => callRound.approvalStatus === 'APPROVED'),
        [callRounds],
    );
    const shouldFetchEvaluations = !deferEvaluationFetchUntilFilter || selectedEvaluationCallRoundId !== '';
    const evaluationCallRoundIdForQuery =
        selectedEvaluationCallRoundId && selectedEvaluationCallRoundId !== 'all'
            ? selectedEvaluationCallRoundId
            : undefined;
    const { data: evaluationData, isLoading: loadingEvaluations } = useDeanCouncilEvaluations(
        evaluationCallRoundIdForQuery,
        { enabled: shouldFetchEvaluations },
    );
    const { data, isLoading } = useCouncilProjectAssignments(selectedCallRoundId);
    const assignMutation = useAssignProjectsToCouncil();
    const unassignMutation = useUnassignProjectsFromCouncil();
    const finalizeMutation = useFinalizeCouncilProjectAssignments();
    const updateDefenseLocationMutation = useUpdateCouncilDefenseLocation();

    const councils = data?.councils ?? [];
    const approvedProjects = data?.approvedProjects ?? [];
    const isFinalized = data?.isFinalized ?? false;
    const callRoundDefenseDate = data?.callRound?.defenseDate;
    const callRoundDefenseLocation = data?.callRound?.defenseLocation ?? '';

    useEffect(() => {
        console.log('Evaluation data updated:', evaluationData);
    }, [ evaluationData]);
    const unassignedProjects = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return approvedProjects
            .filter((project) => !project.councilAssignment)
            .filter((project) => {
                if (!keyword) return true;
                return (
                    project.title.toLowerCase().includes(keyword) ||
                    project.user.name.toLowerCase().includes(keyword) ||
                    (project.user.code || '').toLowerCase().includes(keyword)
                );
            });
    }, [approvedProjects, search]);

    const evaluationItems = evaluationData?.items ?? [];
    const evaluationSummary = evaluationData?.summary;
    const isWaitingForEvaluationFilter = deferEvaluationFetchUntilFilter && selectedEvaluationCallRoundId === '';

    const filteredEvaluationItems = useMemo(() => {
        const keyword = evaluationSearch.trim().toLowerCase();
        if (!keyword) {
            return evaluationItems;
        }

        return evaluationItems.filter((item) => {
            return (
                item.projectTitle.toLowerCase().includes(keyword) ||
                item.councilName.toLowerCase().includes(keyword) ||
                item.evaluator.name.toLowerCase().includes(keyword)
            );
        });
    }, [evaluationItems, evaluationSearch]);

    const projectEvaluationDetails = useMemo<Map<string, ProjectEvaluationDetail>>(() => {
        type DetailAccumulator = {
            projectId: string;
            projectTitle: string;
            councils: Set<string>;
            totalScore: number;
            totalEvaluations: number;
            passCount: number;
            revisionCount: number;
            failCount: number;
            studentName: string;
            studentCode: string | null;
            studentEmail: string;
            studentClassName: string | null;
            advisorName: string | null;
            advisorCode: string | null;
            advisorEmail: string | null;
            defenseDate: Date | null;
            defenseLocation: string | null;
        };

        const grouped = new Map<string, DetailAccumulator>();

        filteredEvaluationItems.forEach((item) => {
            const existing = grouped.get(item.projectId);
            if (!existing) {
                grouped.set(item.projectId, {
                    projectId: item.projectId,
                    projectTitle: item.projectTitle,
                    councils: new Set([item.councilName]),
                    totalScore: item.score,
                    totalEvaluations: 1,
                    passCount: item.decision === 'PASS' ? 1 : 0,
                    revisionCount: item.decision === 'NEED_REVISION' ? 1 : 0,
                    failCount: item.decision === 'FAIL' ? 1 : 0,
                    studentName: item.student.name,
                    studentCode: item.student.code,
                    studentEmail: item.student.email,
                    studentClassName: item.student.className,
                    advisorName: item.advisor.name,
                    advisorCode: item.advisor.code,
                    advisorEmail: item.advisor.email,
                    defenseDate: item.defenseDate,
                    defenseLocation: item.defenseLocation,
                });
                return;
            }

            existing.councils.add(item.councilName);
            existing.totalScore += item.score;
            existing.totalEvaluations += 1;

            if (item.decision === 'PASS') {
                existing.passCount += 1;
            } else if (item.decision === 'NEED_REVISION') {
                existing.revisionCount += 1;
            } else if (item.decision === 'FAIL') {
                existing.failCount += 1;
            }
        });

        const details = Array.from(grouped.values()).map<ProjectEvaluationDetail>((item) => ({
            projectId: item.projectId,
            projectTitle: item.projectTitle,
            councils: Array.from(item.councils).join(', '),
            averageScore: Number((item.totalScore / item.totalEvaluations).toFixed(2)),
            totalEvaluations: item.totalEvaluations,
            passCount: item.passCount,
            revisionCount: item.revisionCount,
            failCount: item.failCount,
            studentName: item.studentName,
            studentCode: item.studentCode,
            studentEmail: item.studentEmail,
            studentClassName: item.studentClassName,
            advisorName: item.advisorName,
            advisorCode: item.advisorCode,
            advisorEmail: item.advisorEmail,
            defenseDate: item.defenseDate,
            defenseLocation: item.defenseLocation,
        }));

        return new Map(details.map((item) => [item.projectId, item]));
    }, [filteredEvaluationItems]);

    const sortedEvaluationItems = useMemo(() => {
        const sortedItems = [...filteredEvaluationItems];

        sortedItems.sort((a, b) => {
            let comparedValue = 0;

            if (evaluationSortField === 'evaluatedAt') {
                comparedValue = a.evaluatedAt.getTime() - b.evaluatedAt.getTime();
            } else if (evaluationSortField === 'score') {
                comparedValue = a.score - b.score;
            } else if (evaluationSortField === 'projectTitle') {
                comparedValue = a.projectTitle.localeCompare(b.projectTitle, 'vi');
            } else if (evaluationSortField === 'councilName') {
                comparedValue = a.councilName.localeCompare(b.councilName, 'vi');
            } else if (evaluationSortField === 'evaluatorName') {
                comparedValue = a.evaluator.name.localeCompare(b.evaluator.name, 'vi');
            }

            return evaluationSortOrder === 'asc' ? comparedValue : -comparedValue;
        });

        return sortedItems;
    }, [filteredEvaluationItems, evaluationSortField, evaluationSortOrder]);

    const evaluationTotalPages = Math.max(1, Math.ceil(sortedEvaluationItems.length / evaluationPageSize));

    const paginatedEvaluationItems = useMemo(() => {
        const start = (evaluationCurrentPage - 1) * evaluationPageSize;
        return sortedEvaluationItems.slice(start, start + evaluationPageSize);
    }, [evaluationCurrentPage, sortedEvaluationItems]);

    const evaluationStartItem = sortedEvaluationItems.length === 0 ? 0 : (evaluationCurrentPage - 1) * evaluationPageSize + 1;
    const evaluationEndItem = Math.min(evaluationCurrentPage * evaluationPageSize, sortedEvaluationItems.length);

    const selectedEvaluationItemsByProject = useMemo(() => {
        if (!selectedEvaluationDetail) {
            return [];
        }

        return filteredEvaluationItems
            .filter((item) => item.projectId === selectedEvaluationDetail.projectId)
            .sort((a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime());
    }, [filteredEvaluationItems, selectedEvaluationDetail]);

    const groupedEvaluationItems = useMemo(() => {
        const hasCallRoundFilter = selectedEvaluationCallRoundId !== '' && selectedEvaluationCallRoundId !== 'all';

        if (hasCallRoundFilter) {
            const projectMap = new Map<string, { projectTitle: string; items: typeof sortedEvaluationItems }>();

            paginatedEvaluationItems.forEach((item) => {
                const existing = projectMap.get(item.projectId);
                if (!existing) {
                    projectMap.set(item.projectId, { projectTitle: item.projectTitle, items: [item] });
                    return;
                }
                existing.items.push(item);
            });

            return {
                hasCallRoundFilter,
                groups: [
                    {
                        callRoundName: null as string | null,
                        projectGroups: Array.from(projectMap.values()),
                    },
                ],
            };
        }

        const callRoundMap = new Map<
            string,
            {
                callRoundName: string;
                projectMap: Map<string, { projectTitle: string; items: typeof sortedEvaluationItems }>;
            }
        >();

        paginatedEvaluationItems.forEach((item) => {
            const callRoundEntry = callRoundMap.get(item.callRoundId);
            if (!callRoundEntry) {
                const projectMap = new Map<string, { projectTitle: string; items: typeof sortedEvaluationItems }>();
                projectMap.set(item.projectId, { projectTitle: item.projectTitle, items: [item] });
                callRoundMap.set(item.callRoundId, { callRoundName: item.callRoundName, projectMap });
                return;
            }

            const projectEntry = callRoundEntry.projectMap.get(item.projectId);
            if (!projectEntry) {
                callRoundEntry.projectMap.set(item.projectId, { projectTitle: item.projectTitle, items: [item] });
                return;
            }
            projectEntry.items.push(item);
        });

        return {
            hasCallRoundFilter,
            groups: Array.from(callRoundMap.values()).map((entry) => ({
                callRoundName: entry.callRoundName,
                projectGroups: Array.from(entry.projectMap.values()),
            })),
        };
    }, [paginatedEvaluationItems, selectedEvaluationCallRoundId]);

    useEffect(() => {
        setEvaluationCurrentPage(1);
    }, [selectedEvaluationCallRoundId, evaluationSearch, evaluationSortField, evaluationSortOrder]);

    useEffect(() => {
        setEvaluationCurrentPage((prev) => Math.min(prev, evaluationTotalPages));
    }, [evaluationTotalPages]);

    const assignedProjects = useMemo(() => {
        if (!selectedCouncilId) return [];
        return approvedProjects.filter((project) => project.councilAssignment?.councilId === selectedCouncilId);
    }, [approvedProjects, selectedCouncilId]);

    const selectedCouncil = councils.find((council) => council.id === selectedCouncilId);

    useEffect(() => {
        if (!selectedCallRoundId) {
            return;
        }

        const isSelectedRoundApproved = approvedCallRounds.some((callRound) => callRound.id === selectedCallRoundId);
        if (!isSelectedRoundApproved) {
            setSelectedCallRoundId('');
            setSelectedCouncilId('');
            setSelectedProjectIds([]);
            setSelectedAssignedProjectIds([]);
        }
    }, [approvedCallRounds, selectedCallRoundId]);

    useEffect(() => {
        setDefenseLocationInput(selectedCouncil?.defenseLocation ?? callRoundDefenseLocation);
        setReportDateInput(toDateTimeLocalValue(selectedCouncil?.defenseDate ?? callRoundDefenseDate));
    }, [
        selectedCouncil?.id,
        selectedCouncil?.defenseDate,
        selectedCouncil?.defenseLocation,
        callRoundDefenseDate,
        callRoundDefenseLocation,
    ]);

    const handleToggleProject = (projectId: string) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    };

    const handleToggleAssignedProject = (projectId: string) => {
        setSelectedAssignedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    };

    const handleAssign = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (!selectedCouncilId) {
            toast.error('Vui lòng chọn hội đồng');
            return;
        }
        if (selectedProjectIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 đề tài');
            return;
        }

        if (isFinalized) {
            toast.error('Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.');
            return;
        }

        assignMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                councilId: selectedCouncilId,
                projectRegistrationIds: selectedProjectIds,
            },
            {
                onSuccess: () => {
                    toast.success('Gán đề tài vào hội đồng thành công');
                    setSelectedProjectIds([]);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể gán đề tài';
                    toast.error(message);
                },
            },
        );
    };

    const handleUnassign = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (selectedAssignedProjectIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 đề tài đã gán để bỏ gán');
            return;
        }

        if (isFinalized) {
            toast.error('Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.');
            return;
        }

        const confirmed = window.confirm('Bạn có chắc chắn muốn bỏ gán các đề tài đã chọn?');
        if (!confirmed) {
            return;
        }

        unassignMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                projectRegistrationIds: selectedAssignedProjectIds,
            },
            {
                onSuccess: () => {
                    toast.success('Đã bỏ gán đề tài khỏi hội đồng');
                    setSelectedAssignedProjectIds([]);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể bỏ gán đề tài';
                    toast.error(message);
                },
            },
        );
    };

    const handleFinalizeAll = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (isFinalized) {
            toast.success('Đợt này đã hoàn tất phân công.');
            return;
        }

        finalizeMutation.mutate(
            { callRoundId: selectedCallRoundId },
            {
                onSuccess: () => {
                    toast.success('Đã hoàn tất phân công toàn bộ đợt đăng ký');
                    setIsFinalizeDialogOpen(false);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể hoàn tất phân công';
                    toast.error(message);
                },
            },
        );
    };

    const handleSaveDefenseLocation = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (isFinalized) {
            toast.error('Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.');
            return;
        }

        updateDefenseLocationMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                councilId: selectedCouncilId,
                defenseLocation: defenseLocationInput,
                defenseDate: reportDateInput ? new Date(reportDateInput) : null,
            },
            {
                onSuccess: () => {
                    toast.success('Đã lưu ngày báo cáo và nơi bảo vệ');
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể lưu nơi bảo vệ';
                    toast.error(message);
                },
            },
        );
    };

    const handleExportEvaluations = () => {
        if (isWaitingForEvaluationFilter) {
            toast.error('Vui lòng chọn đợt đề tài trước khi xuất dữ liệu.');
            return;
        }

        const params = new URLSearchParams();

        if (selectedEvaluationCallRoundId !== 'all') {
            params.set('callRoundId', selectedEvaluationCallRoundId);
        }

        const keyword = evaluationSearch.trim();
        if (keyword) {
            params.set('search', keyword);
        }

        const query = params.toString();
        const url = query ? `/api/dean/council-evaluations/export?${query}` : '/api/dean/council-evaluations/export';

        const link = document.createElement('a');
        link.href = url;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Đang xuất file Excel...');
    };

    const handleExportRanking = () => {
        if (isWaitingForEvaluationFilter) {
            toast.error('Vui lòng chọn đợt đề tài trước khi xuất dữ liệu.');
            return;
        }

        const params = new URLSearchParams();

        if (selectedEvaluationCallRoundId !== 'all') {
            params.set('callRoundId', selectedEvaluationCallRoundId);
        }

        const keyword = evaluationSearch.trim();
        if (keyword) {
            params.set('search', keyword);
        }

        params.set('mode', 'ranking');

        const query = params.toString();
        const url = query ? `/api/dean/council-evaluations/export?${query}` : '/api/dean/council-evaluations/export?mode=ranking';

        const link = document.createElement('a');
        link.href = url;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Đang xuất file xếp hạng...');
    };

    const handleOpenDetail = (item: ProjectEvaluationDetail) => {
        setSelectedEvaluationDetail(item);
        setIsEvaluationDetailDialogOpen(true);
    };

    const handleOpenDetailFromEvaluationRow = (projectId: string) => {
        const detail = projectEvaluationDetails.get(projectId);
        if (!detail) {
            toast.error('Không tìm thấy dữ liệu chi tiết cho đề tài này.');
            return;
        }

        handleOpenDetail(detail);
    };

    const formatDetailDateTime = (value: Date | null): string => {
        if (!value) {
            return 'Chưa cập nhật';
        }

        return value.toLocaleString('vi-VN');
    };

    const getDecisionBadge = (decision: string) => {
        const variants: Record<string, { label: string; className: string }> = {
            PASS: { label: 'Đạt', className: 'bg-emerald-500 hover:bg-emerald-600' },
            NEED_REVISION: { label: 'Cần sửa đổi', className: 'bg-amber-500 hover:bg-amber-600' },
            FAIL: { label: 'Không đạt', className: 'bg-rose-500 hover:bg-rose-600' },
        };

        const config = variants[decision] || { label: decision, className: '' };
        return (
            <Badge className={config.className} variant="default">
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-6 p-4">
            {!isEvaluationsOnly && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" />
                            Gán Đề Tài Vào Hội Đồng
                        </CardTitle>
                        <CardDescription>
                            Chọn đợt đăng ký, chọn hội đồng và gán các đề tài đã được duyệt vào hội đồng đó.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingCallRounds ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select
                                value={selectedCallRoundId}
                                onValueChange={(value) => {
                                    setSelectedCallRoundId(value);
                                    setSelectedCouncilId('');
                                    setSelectedProjectIds([]);
                                    setSelectedAssignedProjectIds([]);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-100">
                                    <SelectValue placeholder="Chọn đợt đăng ký" />
                                </SelectTrigger>
                                <SelectContent>
                                    {approvedCallRounds.map((round) => (
                                        <SelectItem key={round.id} value={round.id}>
                                            {round.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {!loadingCallRounds && approvedCallRounds.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Chưa có đợt đề tài nào ở trạng thái APPROVED để gán đề tài vào hội đồng.
                            </p>
                        )}

                        {selectedCallRoundId && (
                            <Select
                                value={selectedCouncilId}
                                onValueChange={(value) => {
                                    setSelectedCouncilId(value);
                                    setSelectedProjectIds([]);
                                    setSelectedAssignedProjectIds([]);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-100">
                                    <SelectValue placeholder="Chọn hội đồng" />
                                </SelectTrigger>
                                <SelectContent>
                                    {councils.map((council) => (
                                        <SelectItem key={council.id} value={council.id}>
                                            {council.name} ({council._count.projects} đề tài)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {selectedCallRoundId && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={isFinalized ? 'default' : 'secondary'}>
                                    {isFinalized ? 'Đã hoàn tất phân công' : 'Đang xếp ảo (chưa công bố)'}
                                </Badge>
                                <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            disabled={finalizeMutation.isPending || isLoading || isFinalized}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            {finalizeMutation.isPending
                                                ? 'Đang xác nhận...'
                                                : 'Hoàn tất xác nhận tất cả'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Hoàn tất xác nhận tất cả?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Sau khi xác nhận, hội đồng, giảng viên và thành viên mới nhìn thấy dữ
                                                liệu. Bạn sẽ không thể chỉnh sửa phân công của đợt này.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={finalizeMutation.isPending}>
                                                Hủy
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleFinalizeAll}
                                                disabled={finalizeMutation.isPending}
                                            >
                                                {finalizeMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        {selectedCouncilId && selectedCouncil && (
                            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                                <p className="text-xs text-muted-foreground">Ngày báo cáo và nơi bảo vệ</p>
                                <div className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
                                    <Input
                                        type="datetime-local"
                                        value={reportDateInput}
                                        onChange={(event) => setReportDateInput(event.target.value)}
                                        disabled={updateDefenseLocationMutation.isPending || isFinalized}
                                    />
                                    <Input
                                        value={defenseLocationInput}
                                        onChange={(event) => setDefenseLocationInput(event.target.value)}
                                        placeholder="Nhập nơi bảo vệ..."
                                        disabled={updateDefenseLocationMutation.isPending || isFinalized}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleSaveDefenseLocation}
                                        disabled={
                                            updateDefenseLocationMutation.isPending || isFinalized || !selectedCouncilId
                                        }
                                    >
                                        {updateDefenseLocationMutation.isPending ? 'Đang lưu...' : 'Lưu lịch báo cáo'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Lịch này áp dụng cho hội đồng đang chọn. Nếu chưa nhập, hệ thống dùng mặc định từ
                                    đợt đăng ký.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {isEvaluationsOnly && (
                <Card id="council-evaluations" className="scroll-mt-20">
                <CardHeader>
                    <CardTitle>Kết quả chấm điểm theo đợt đề tài</CardTitle>
                    <CardDescription>
                        Xem điểm đã chấm của hội đồng theo từng đợt đề tài, có thể lọc theo đợt và từ khóa.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Select
                            value={selectedEvaluationCallRoundId}
                            onValueChange={(value) => {
                                setSelectedEvaluationCallRoundId(value);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Lọc theo đợt đề tài" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả đợt đề tài</SelectItem>
                                {approvedCallRounds.map((round) => (
                                    <SelectItem key={round.id} value={round.id}>
                                        {round.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={evaluationSearch}
                                onChange={(event) => setEvaluationSearch(event.target.value)}
                                placeholder="Tìm theo đề tài, hội đồng, người chấm..."
                                className="pl-10"
                                disabled={isWaitingForEvaluationFilter}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsSortDialogOpen(true)}
                            disabled={isWaitingForEvaluationFilter || filteredEvaluationItems.length === 0}
                        >
                            Sắp xếp
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportEvaluations}
                            disabled={isWaitingForEvaluationFilter}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Xuất file chi tiết (Excel)
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportRanking}
                            disabled={isWaitingForEvaluationFilter}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Xuất xếp hạng theo hội đồng
                        </Button>
                    </div>

                    <Dialog open={isSortDialogOpen} onOpenChange={setIsSortDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Sắp xếp kết quả chấm điểm</DialogTitle>
                                <DialogDescription>
                                    Chọn tiêu chí và thứ tự hiển thị cho bảng kết quả.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-sm text-muted-foreground">Tiêu chí</p>
                                    <Select
                                        value={evaluationSortField}
                                        onValueChange={(value) => setEvaluationSortField(value as EvaluationSortField)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn tiêu chí" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="evaluatedAt">Thời gian chấm</SelectItem>
                                            <SelectItem value="score">Điểm</SelectItem>
                                            <SelectItem value="projectTitle">Tên đề tài</SelectItem>
                                            <SelectItem value="councilName">Hội đồng</SelectItem>
                                            <SelectItem value="evaluatorName">Người chấm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-sm text-muted-foreground">Thứ tự</p>
                                    <Select
                                        value={evaluationSortOrder}
                                        onValueChange={(value) => setEvaluationSortOrder(value as EvaluationSortOrder)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn thứ tự" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="desc">Giảm dần</SelectItem>
                                            <SelectItem value="asc">Tăng dần</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isEvaluationDetailDialogOpen} onOpenChange={setIsEvaluationDetailDialogOpen}>
                        <DialogContent className="w-[min(95vw,760px)] max-h-[85vh] overflow-y-auto sm:max-w-1/2">
                            <DialogHeader>
                                <DialogTitle>Chi tiết đề tài</DialogTitle>
                                <DialogDescription>
                                    Thông tin chi tiết của đề tài được chọn trong danh sách kết quả chấm điểm.
                                </DialogDescription>
                            </DialogHeader>

                            {!selectedEvaluationDetail ? (
                                <p className="text-sm text-muted-foreground">Chưa có đề tài được chọn.</p>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="rounded-md border p-3">
                                        <p className="text-xs text-muted-foreground">Đề tài</p>
                                        <p className="mt-1 font-medium">{selectedEvaluationDetail.projectTitle}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Điểm TB {selectedEvaluationDetail.averageScore}/10 | Lượt chấm{' '}
                                            {selectedEvaluationDetail.totalEvaluations}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-md border p-3">
                                            <p className="text-xs text-muted-foreground">Sinh viên</p>
                                            <p className="mt-1 font-medium">{selectedEvaluationDetail.studentName}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                MSSV: {selectedEvaluationDetail.studentCode || 'N/A'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Email: {selectedEvaluationDetail.studentEmail}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Lớp: {selectedEvaluationDetail.studentClassName || 'N/A'}
                                            </p>
                                        </div>

                                        <div className="rounded-md border p-3">
                                            <p className="text-xs text-muted-foreground">Giảng viên hướng dẫn</p>
                                            <p className="mt-1 font-medium">
                                                {selectedEvaluationDetail.advisorName || 'Chưa cập nhật'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Mã GV: {selectedEvaluationDetail.advisorCode || 'N/A'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Email: {selectedEvaluationDetail.advisorEmail || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-md border p-3">
                                            <p className="text-xs text-muted-foreground">Hội đồng</p>
                                            <p className="mt-1 font-medium">{selectedEvaluationDetail.councils}</p>
                                        </div>

                                        <div className="rounded-md border p-3">
                                            <p className="text-xs text-muted-foreground">Ngày báo cáo</p>
                                            <p className="mt-1 font-medium">
                                                {formatDetailDateTime(selectedEvaluationDetail.defenseDate)}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Nơi bảo vệ:{' '}
                                                {selectedEvaluationDetail.defenseLocation || 'Chưa cập nhật'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Hội đồng</TableHead>
                                                    <TableHead>Người chấm</TableHead>
                                                    <TableHead>Điểm</TableHead>
                                                    <TableHead>Quyết định</TableHead>
                                                    <TableHead>Thời gian chấm</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedEvaluationItemsByProject.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={5}
                                                            className="text-center text-muted-foreground"
                                                        >
                                                            Chưa có dữ liệu chấm điểm chi tiết.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    selectedEvaluationItemsByProject.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>{item.councilName}</TableCell>
                                                            <TableCell>{item.evaluator.name}</TableCell>
                                                            <TableCell>
                                                                <span className="font-semibold text-emerald-700">
                                                                    {item.score}/10
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{getDecisionBadge(item.decision)}</TableCell>
                                                            <TableCell>
                                                                {item.evaluatedAt.toLocaleString('vi-VN')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">Tổng lượt chấm</p>
                            <p className="mt-1 text-lg font-semibold">{evaluationSummary?.totalEvaluations ?? 0}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">Số đề tài đã được chấm</p>
                            <p className="mt-1 text-lg font-semibold">{evaluationSummary?.totalProjects ?? 0}</p>
                        </div>
                        <div className="rounded-md border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">Điểm trung bình</p>
                            <p className="mt-1 text-lg font-semibold">
                                {evaluationSummary?.averageScore !== null &&
                                evaluationSummary?.averageScore !== undefined
                                    ? `${evaluationSummary.averageScore}/10`
                                    : 'Chưa có'}
                            </p>
                        </div>
                    </div>

                    {isWaitingForEvaluationFilter ? (
                        <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                            Vui lòng chọn đợt đề tài để tải dữ liệu chấm điểm.
                        </p>
                    ) : loadingEvaluations ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((item) => (
                                <Skeleton key={item} className="h-11 w-full" />
                            ))}
                        </div>
                    ) : filteredEvaluationItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                            Chưa có dữ liệu điểm chấm cho bộ lọc hiện tại.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Hiển thị {evaluationStartItem}-{evaluationEndItem} / {sortedEvaluationItems.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEvaluationCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={evaluationCurrentPage === 1}
                                    >
                                        Trước
                                    </Button>
                                    <span className="text-sm">
                                        Trang {evaluationCurrentPage}/{evaluationTotalPages}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setEvaluationCurrentPage((prev) => Math.min(evaluationTotalPages, prev + 1))
                                        }
                                        disabled={evaluationCurrentPage >= evaluationTotalPages}
                                    >
                                        Sau
                                    </Button>
                                </div>
                            </div>

                            {groupedEvaluationItems.groups.map((callRoundGroup, callRoundIndex) => (
                                <div
                                    key={`${callRoundGroup.callRoundName || 'filtered'}-${callRoundIndex}`}
                                    className="rounded-md border overflow-hidden"
                                >
                                    {!groupedEvaluationItems.hasCallRoundFilter && (
                                        <div className="px-4 py-2 border-b bg-muted/30 font-semibold">
                                            Đợt đề tài: {callRoundGroup.callRoundName}
                                        </div>
                                    )}

                                    {callRoundGroup.projectGroups.map((projectGroup, projectIndex) => (
                                        <div key={`${projectGroup.projectTitle}-${projectIndex}`}>
                                            <div className="px-4 py-2 border-b bg-muted/10 font-medium">
                                                Đề tài: {projectGroup.projectTitle}
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>STT</TableHead>
                                                        {!groupedEvaluationItems.hasCallRoundFilter && (
                                                            <TableHead>Đợt đề tài</TableHead>
                                                        )}
                                                        <TableHead>Hội đồng</TableHead>
                                                        <TableHead>Người chấm</TableHead>
                                                        <TableHead>Điểm</TableHead>
                                                        <TableHead>Quyết định</TableHead>
                                                        <TableHead>Thời gian chấm</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {projectGroup.items.map((item, index) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="cursor-pointer hover:bg-muted/40"
                                                            onClick={() =>
                                                                handleOpenDetailFromEvaluationRow(item.projectId)
                                                            }
                                                        >
                                                            <TableCell>{index + 1}</TableCell>
                                                            {!groupedEvaluationItems.hasCallRoundFilter && (
                                                                <TableCell>{item.callRoundName}</TableCell>
                                                            )}
                                                            <TableCell>{item.councilName}</TableCell>
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <p className="font-medium">{item.evaluator.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {item.evaluator.code ||
                                                                            item.evaluator.email ||
                                                                            'N/A'}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-semibold text-emerald-700">
                                                                    {item.score}/10
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{getDecisionBadge(item.decision)}</TableCell>
                                                            <TableCell>
                                                                {new Date(item.evaluatedAt).toLocaleString('vi-VN')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-muted/20 font-medium">
                                                        <TableCell colSpan={groupedEvaluationItems.hasCallRoundFilter ? 4 : 5}>
                                                            Điểm trung bình đề tài
                                                        </TableCell>
                                                        <TableCell>
                                                            {(
                                                                projectGroup.items.reduce(
                                                                    (sum, evaluationItem) => sum + evaluationItem.score,
                                                                    0,
                                                                ) / projectGroup.items.length
                                                            ).toFixed(2)}
                                                            /10
                                                        </TableCell>
                                                        <TableCell colSpan={2}></TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                </Card>
            )}

            {!isEvaluationsOnly && selectedCallRoundId && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Đề tài chưa gán hội đồng</CardTitle>
                            <CardDescription>Chọn các đề tài để gán vào hội đồng đã chọn.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm theo tên đề tài, sinh viên..."
                                    className="pl-10"
                                />
                            </div>

                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : unassignedProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6 border rounded-md border-dashed">
                                    Không còn đề tài chưa gán.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-100 overflow-y-auto pr-1">
                                    {unassignedProjects.map((project) => (
                                        <label
                                            key={project.id}
                                            className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                                        >
                                            <Checkbox
                                                checked={selectedProjectIds.includes(project.id)}
                                                onCheckedChange={() => handleToggleProject(project.id)}
                                                disabled={isFinalized}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="font-medium text-sm">{project.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    SV: {project.user.name} ({project.user.code || 'N/A'})
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Đã chọn {selectedProjectIds.length} đề tài
                                </p>
                                <Button
                                    onClick={handleAssign}
                                    disabled={
                                        assignMutation.isPending ||
                                        !selectedCouncilId ||
                                        selectedProjectIds.length === 0 ||
                                        isFinalized
                                    }
                                >
                                    {assignMutation.isPending ? 'Đang gán...' : 'Gán vào hội đồng'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Đề tài của hội đồng đã chọn</CardTitle>
                            <CardDescription>
                                {selectedCouncil
                                    ? `${selectedCouncil.name} hiện có ${selectedCouncil._count.projects} đề tài`
                                    : 'Chọn hội đồng để xem danh sách đề tài đã gán'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!selectedCouncilId ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                                    Chưa chọn hội đồng.
                                </p>
                            ) : assignedProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                                    Hội đồng này chưa có đề tài nào.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Tên đề tài</TableHead>
                                            <TableHead>Sinh viên</TableHead>
                                            <TableHead className="text-right">Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedProjects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedAssignedProjectIds.includes(project.id)}
                                                        onCheckedChange={() => handleToggleAssignedProject(project.id)}
                                                        disabled={isFinalized}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{project.title}</TableCell>
                                                <TableCell>{project.user.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="default">Đã gán</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {!!selectedCouncilId && assignedProjects.length > 0 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Đã chọn {selectedAssignedProjectIds.length} đề tài để bỏ gán
                                    </p>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleUnassign}
                                        disabled={
                                            unassignMutation.isPending ||
                                            selectedAssignedProjectIds.length === 0 ||
                                            isFinalized
                                        }
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {unassignMutation.isPending ? 'Đang bỏ gán...' : 'Bỏ gán đề tài đã chọn'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
