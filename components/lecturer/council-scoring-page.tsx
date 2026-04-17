'use client';

import { useMemo, useState } from 'react';
import { useLecturerCouncils } from '@/hooks/useLecturerCouncils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CouncilEvaluationForm } from './council-evaluation-form';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function CouncilScoringPage() {
    const { data = [], isLoading, refetch } = useLecturerCouncils();
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [evaluationForm, setEvaluationForm] = useState<{
        open: boolean;
        projectId: string;
        projectTitle: string;
        advisorName?: string;
        studentName?: string;
    }>({
        open: false,
        projectId: '',
        projectTitle: '',
    });

    const selectedItem = useMemo(
        () => data.find((item) => item.assignmentId === selectedAssignmentId) ?? null,
        [data, selectedAssignmentId],
    );

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

    const handleEvaluateProject = (project: (typeof data)[number]['council']['projects'][number]) => {
        const targetProjectId = project.projectId ?? project.id;

        if (!targetProjectId) {
            toast.error('Không tìm thấy mã đề tài để chấm điểm. Vui lòng tải lại trang.');
            return;
        }

        setEvaluationForm({
            open: true,
            projectId: targetProjectId,
            projectTitle: project.title,
            advisorName: project.advisor?.name,
            studentName: project.students[0]?.name,
        });
    };

    const handleEvaluationSuccess = () => {
        refetch();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-3">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Đang tải danh sách hội đồng...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5" />
                            Chấm điểm đề tài
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Hiện tại bạn chưa thuộc hội đồng nào.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
                        Hội đồng của tôi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>STT</TableHead>
                                    <TableHead>Tên hội đồng</TableHead>
                                    <TableHead>Đợt đề tài</TableHead>
                                    <TableHead>Vai trò</TableHead>
                                    <TableHead>Số đề tài</TableHead>
                                    <TableHead>Đã chấm</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => {
                                    const evaluatedCount = item.council.projects.filter((p) => p.myEvaluation).length;
                                    const totalCount = item.council.projects.length;

                                    return (
                                        <TableRow key={item.assignmentId}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-medium">{item.council.name}</p>
                                                    {item.council.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            {item.council.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.council.callRoundName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{item.role || 'Thành viên'}</Badge>
                                            </TableCell>
                                            <TableCell>{totalCount}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={
                                                        evaluatedCount === totalCount
                                                            ? 'text-emerald-600 font-medium'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {evaluatedCount}/{totalCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedAssignmentId(item.assignmentId)}
                                                >
                                                    Hiển thị chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedAssignmentId(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    {selectedItem && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedItem.council.name}</DialogTitle>
                                <DialogDescription>{selectedItem.council.callRoundName}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Vai trò</p>
                                        <p className="font-medium mt-1">{selectedItem.role || 'Thành viên'}</p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Ngày bảo vệ</p>
                                        <p className="font-medium mt-1">
                                            {selectedItem.council.defenseDate
                                                ? new Date(selectedItem.council.defenseDate).toLocaleDateString('vi-VN')
                                                : 'Chưa cập nhật'}
                                        </p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Số đề tài</p>
                                        <p className="font-medium mt-1">{selectedItem.council.projectCount}</p>
                                    </div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <p className="text-muted-foreground">Nơi bảo vệ</p>
                                    <p className="font-medium mt-1">
                                        {selectedItem.council.defenseLocation || 'Chưa cập nhật'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold">
                                        Danh sách đề tài ({selectedItem.council.projects.length})
                                    </h3>
                                    {selectedItem.council.projects.length === 0 ? (
                                        <p className="text-muted-foreground">Hội đồng này chưa được gán đề tài.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedItem.council.projects.map((project, projectIndex) => (
                                                <div key={project.id} className="rounded-md border p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <p className="font-medium">
                                                                {projectIndex + 1}. {project.title}
                                                            </p>
                                                        </div>
                                                        {project.myEvaluation ? (
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                <Badge variant="outline" className="bg-emerald-50">
                                                                    Đã chấm
                                                                </Badge>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                disabled={!project.projectId && !project.id}
                                                                onClick={() => handleEvaluateProject(project)}
                                                            >
                                                                Chấm điểm
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="rounded-md bg-muted/30 p-3 text-sm space-y-2">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">
                                                                Giảng viên hướng dẫn:
                                                            </p>
                                                            {project.advisor ? (
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-medium">
                                                                        {project.advisor.name}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        {project.advisor.code || '-'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <p className="text-muted-foreground">Chưa cập nhật</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-muted-foreground mb-1">
                                                                Sinh viên:
                                                            </p>
                                                            {project.students.length === 0 ? (
                                                                <p className="text-muted-foreground">
                                                                    Chưa có dữ liệu sinh viên.
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    {project.students.map((student) => (
                                                                        <div
                                                                            key={student.id}
                                                                            className="flex flex-wrap items-center gap-2"
                                                                        >
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="text-xs"
                                                                            >
                                                                                {student.roleLabel}
                                                                            </Badge>
                                                                            <span className="font-medium">
                                                                                {student.name}
                                                                            </span>
                                                                            <span className="text-muted-foreground">
                                                                                {student.code || '-'}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {project.myEvaluation && (
                                                        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 space-y-2">
                                                            <p className="text-xs font-medium text-emerald-900">
                                                                Đánh giá của bạn:
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                                <div>
                                                                    <span className="text-muted-foreground">
                                                                        Điểm:{' '}
                                                                    </span>
                                                                    <span className="font-semibold text-emerald-700">
                                                                        {project.myEvaluation.score}/10
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-muted-foreground">
                                                                        Quyết định:{' '}
                                                                    </span>
                                                                    {getDecisionBadge(project.myEvaluation.decision)}
                                                                </div>
                                                            </div>
                                                            {project.myEvaluation.comment && (
                                                                <div className="pt-2 border-t border-emerald-200">
                                                                    <p className="text-xs text-muted-foreground mb-1">
                                                                        Nhận xét:
                                                                    </p>
                                                                    <p className="text-sm text-emerald-900 whitespace-pre-wrap">
                                                                        {project.myEvaluation.comment}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-muted-foreground pt-1">
                                                                Đã chấm lúc:{' '}
                                                                {new Date(
                                                                    project.myEvaluation.evaluatedAt,
                                                                ).toLocaleString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <CouncilEvaluationForm
                open={evaluationForm.open}
                onOpenChange={(open) => setEvaluationForm((prev) => ({ ...prev, open }))}
                projectId={evaluationForm.projectId}
                projectTitle={evaluationForm.projectTitle}
                advisorName={evaluationForm.advisorName}
                studentName={evaluationForm.studentName}
                onSuccess={handleEvaluationSuccess}
            />
        </div>
    );
}
