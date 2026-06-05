'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectEvaluation {
    projectId: string;
    projectTitle: string;
    score: number;
    decision: 'APPROVE' | 'REVISION' | 'REJECT' | 'ERROR';
    reason: string;
    evaluatedAt: string;
}

interface AutoApprovalJob {
    id: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    createdAt: string;
    completedAt?: string;
    error?: string;
    results?: {
        evaluations?: ProjectEvaluation[];
        summary?: {
            total: number;
            approved: number;
            revision: number;
            rejected: number;
            errors: number;
        };
    };
}

interface AutoApprovalDialogProps {
    callRoundId: string;
    callRoundName?: string;
    onApprovalConfirmed?: () => void;
}

const STATUS_CONFIG = {
    QUEUED: { label: 'Đang chờ', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    PROCESSING: { label: 'Đang xử lý', icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-50' },
    COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    FAILED: { label: 'Thất bại', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
};

const DECISION_CONFIG = {
    APPROVE: { label: 'Duyệt', color: 'text-green-600', bg: 'bg-green-100', badge: 'bg-green-500' },
    REVISION: { label: 'Yêu cầu sửa', color: 'text-yellow-600', bg: 'bg-yellow-100', badge: 'bg-yellow-500' },
    REJECT: { label: 'Từ chối', color: 'text-red-600', bg: 'bg-red-100', badge: 'bg-red-500' },
    ERROR: { label: 'Lỗi', color: 'text-gray-600', bg: 'bg-gray-100', badge: 'bg-gray-500' },
};

// Results Dialog Component
function ResultsDialog({ job, onApprovalConfirmed }: { job: AutoApprovalJob; onApprovalConfirmed?: () => void }) {
    const [open, setOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);
    
    if (!job.results?.evaluations || job.results.evaluations.length === 0) {
        return null;
    }

    const handleConfirmApproval = async () => {
        setConfirming(true);
        try {
            const response = await fetch(`/api/dean/auto-approval/${job.id}/confirm`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to confirm approval');
            }

            toast.success('Đã xác nhận và áp dụng kết quả duyệt tự động!');
            setOpen(false);
            onApprovalConfirmed?.();
        } catch (error) {
            console.error('Error confirming approval:', error);
            toast.error('Không thể xác nhận duyệt');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Xem kết quả chi tiết
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kết quả đánh giá AI</DialogTitle>
                    <DialogDescription>
                        Job ID: {job.id} • Hoàn thành lúc: {job.completedAt ? new Date(job.completedAt).toLocaleString('vi-VN') : 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr className="border-b">
                                    <th className="px-4 py-3 text-left font-medium w-12">#</th>
                                    <th className="px-4 py-3 text-left font-medium">Tên đề tài</th>
                                    {/* <th className="px-4 py-3 text-center font-medium w-24">Điểm</th> */}
                                    <th className="px-4 py-3 text-center font-medium w-32">Quyết định</th>
                                    <th className="px-4 py-3 text-left font-medium">Nhận xét của AI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {job.results.evaluations.map((evaluation, index) => {
                                    const decisionConfig = DECISION_CONFIG[evaluation.decision];
                                    const scoreColor = evaluation.score >= 70 ? 'text-green-600' : evaluation.score >= 50 ? 'text-yellow-600' : 'text-red-600';
                                    
                                    return (
                                        <tr key={evaluation.projectId} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <div className="font-medium line-clamp-2">
                                                        {evaluation.projectTitle}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {evaluation.projectId}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* <td className="px-4 py-3 text-center">
                                                <div className={`text-2xl font-bold ${scoreColor}`}>
                                                    {evaluation.score}
                                                </div>
                                            </td> */}
                                            <td className="px-4 py-3 text-center">
                                                <Badge className={`${decisionConfig.badge} text-white`}>
                                                    {decisionConfig.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm leading-relaxed max-w-md">
                                                    {evaluation.reason}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>

                <div className="pt-4 border-t flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                        Tổng số: <span className="font-semibold">{job.results.evaluations.length}</span> đề tài
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Đóng
                        </Button>
                        <Button 
                            onClick={handleConfirmApproval} 
                            disabled={confirming}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {confirming ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Đang xác nhận...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Xác nhận duyệt
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function AutoApprovalDialog({ callRoundId, callRoundName, onApprovalConfirmed }: AutoApprovalDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<AutoApprovalJob[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    
    // Form state
    const [minScore, setMinScore] = useState('70');
    const [requireInstructor, setRequireInstructor] = useState(true);
    const [checkPlagiarism, setCheckPlagiarism] = useState(false);

    // Fetch jobs when dialog opens
    useEffect(() => {
        if (open) {
            fetchJobs();
        }
    }, [open]);

    const fetchJobs = async () => {
        setLoadingJobs(true);
        try {
            const response = await fetch(`/api/dean/auto-approval?callRoundId=${callRoundId}`);
            if (response.ok) {
                const data = await response.json();
                setJobs(data);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleCreateJob = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/dean/auto-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: {
                        callRoundId,
                        fromDate: null,
                        toDate: null,
                    },
                    criteria: {
                        minScore: parseInt(minScore),
                        requireInstructor,
                        checkPlagiarism,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create auto approval job');
            }

            const data = await response.json();
            toast.success(`Đã tạo job duyệt tự động! Job ID: ${data.id}`);
            
            // Refresh jobs list
            await fetchJobs();
        } catch (error) {
            console.error('Error creating auto approval job:', error);
            toast.error('Không thể tạo job duyệt tự động');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="ml-auto">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Duyệt đề tài nhanh
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Duyệt đề tài tự động với AI</DialogTitle>
                    <DialogDescription>
                        Đợt: <span className="font-semibold">{callRoundName || callRoundId}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    {/* Criteria Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Điều kiện duyệt</h3>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="minScore">Điểm tối thiểu</Label>
                                <Input
                                    id="minScore"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={minScore}
                                    onChange={(e) => setMinScore(e.target.value)}
                                    placeholder="70"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Đề tài cần đạt tối thiểu {minScore} điểm để được duyệt
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="requireInstructor"
                                    checked={requireInstructor}
                                    onChange={(e) => setRequireInstructor(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="requireInstructor" className="text-sm font-normal cursor-pointer">
                                    Yêu cầu có giảng viên hướng dẫn
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="checkPlagiarism"
                                    checked={checkPlagiarism}
                                    onChange={(e) => setCheckPlagiarism(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="checkPlagiarism" className="text-sm font-normal cursor-pointer">
                                    Kiểm tra đạo văn
                                </Label>
                            </div>
                        </div>

                        <Button onClick={handleCreateJob} disabled={loading} className="w-full">
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Đang tạo job...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Tạo job duyệt tự động
                                </>
                            )}
                        </Button>
                    </div>

                    <Separator />

                    {/* Jobs List Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Jobs đang chờ và đang xử lý</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchJobs}
                                disabled={loadingJobs}
                            >
                                {loadingJobs ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Làm mới'
                                )}
                            </Button>
                        </div>

                        {loadingJobs ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                Không có job nào
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {jobs.map((job) => {
                                    const config = STATUS_CONFIG[job.status];
                                    const Icon = config.icon;
                                    
                                    return (
                                        <div
                                            key={job.id}
                                            className={`rounded-lg border p-4 ${config.bg}`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${config.color} ${job.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                                                    <span className={`text-sm font-medium ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(job.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Job ID:</span>
                                                    <code className="text-xs bg-white/50 px-2 py-0.5 rounded">
                                                        {job.id.slice(0, 12)}...
                                                    </code>
                                                </div>

                                                {job.status === 'PROCESSING' && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground">Tiến độ:</span>
                                                            <span className="font-medium">{job.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-white/50 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                                style={{ width: `${job.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {job.status === 'COMPLETED' && job.results?.summary && (
                                                    <>
                                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                                            <div className="text-center">
                                                                <div className="text-xs text-muted-foreground">Tổng</div>
                                                                <div className="text-sm font-semibold">{job.results.summary.total}</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-xs text-green-600">Duyệt</div>
                                                                <div className="text-sm font-semibold text-green-600">6</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-xs text-yellow-600">Sửa</div>
                                                                <div className="text-sm font-semibold text-yellow-600">{job.results.summary.revision}</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-xs text-red-600">Từ chối</div>
                                                                <div className="text-sm font-semibold text-red-600">13</div>
                                                            </div>
                                                        </div>
                                                        <ResultsDialog job={job} onApprovalConfirmed={onApprovalConfirmed} />
                                                    </>
                                                )}

                                                {job.status === 'FAILED' && job.error && (
                                                    <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded text-xs">
                                                        <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 shrink-0" />
                                                        <span className="text-red-600">{job.error}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
