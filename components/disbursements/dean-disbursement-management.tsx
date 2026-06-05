// components/disbursements/dean-disbursement-management.tsx
'use client';

import { useState } from 'react';
import { Plus, Search, Filter, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDisbursements } from '@/hooks/useDisbursements';
import { useApproveDisbursement, useRejectDisbursement } from '@/hooks/useDisbursements';
import { useCallRounds } from '@/hooks/useCallRounds';
import { DisbursementListTable } from './disbursement-list-table';
import { DisbursementFormDialog } from './disbursement-form-dialog';
import { DisbursementStatusBadge } from './disbursement-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { DisbursementFilters } from '@/types/disbursement.schema';
import type { FundingDisbursementWithRelations } from '@/types/disbursement.schema';

type DeanDisbursementManagementProps = {
    approvalOnly?: boolean;
    actorRole?: 'DEAN' | 'ADMIN';
};

export function DeanDisbursementManagement({
    approvalOnly = false,
    actorRole = 'DEAN',
}: DeanDisbursementManagementProps) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [filters, setFilters] = useState<DisbursementFilters>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [selectedDisbursement, setSelectedDisbursement] = useState<FundingDisbursementWithRelations | null>(null);
    const [rejectionNote, setRejectionNote] = useState('');
    const [quickApproveEnabled, setQuickApproveEnabled] = useState(false);
    const [selectedApproveIds, setSelectedApproveIds] = useState<string[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmPayload, setConfirmPayload] = useState<{ mode: 'single' | 'bulk'; ids: string[] } | null>(null);
    const openConfirm = (payload: { mode: 'single' | 'bulk'; ids: string[] }) => {
        setConfirmPayload(payload);
        setConfirmOpen(true);
    };

    const handleConfirmApprove = async () => {
        if (!confirmPayload) return;
        await Promise.all(confirmPayload.ids.map((id) => approveMutation.mutateAsync({ id, data: {} })));
        if (confirmPayload.mode === 'bulk') setSelectedApproveIds([]);
        setConfirmOpen(false);
        setConfirmPayload(null);
    };

    const approveMutation = useApproveDisbursement();
    const rejectMutation = useRejectDisbursement();

    const { data, isLoading } = useDisbursements({
        ...filters,
        ...(approvalOnly ? { status: 'PENDING' as const } : {}),
        page,
        limit: 10,
    });
    const { data: callRounds = [] } = useCallRounds();

    const handleFilterChange = (key: keyof DisbursementFilters, value: any) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const stats = {
        total: data?.pagination?.total || 0,
        pending: 0, // TODO: Calculate from data
        approved: 0,
        rejected: 0,
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Tổng giải ngân</CardDescription>
                        <CardTitle className="text-3xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Chờ duyệt</CardDescription>
                        <CardTitle className="text-3xl text-amber-600">{stats.pending}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Đã duyệt</CardDescription>
                        <CardTitle className="text-3xl text-emerald-600">{stats.approved}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Từ chối</CardDescription>
                        <CardTitle className="text-3xl text-rose-600">{stats.rejected}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters and Actions */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Danh sách Giải ngân</CardTitle>
                            <CardDescription>Quản lý yêu cầu giải ngân cho các đề tài</CardDescription>
                        </div>
                        {!approvalOnly ? (
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tạo yêu cầu giải ngân
                            </Button>
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã đề tài, tên đề tài..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {!approvalOnly ? (
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('status', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                                    <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : null}

                        <Select
                            value={filters.callRoundId || 'all'}
                            onValueChange={(value) =>
                                handleFilterChange('callRoundId', value === 'all' ? undefined : value)
                            }
                        >
                            <SelectTrigger className="w-[240px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Đợt đăng ký" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả đợt đăng ký</SelectItem>
                                {callRounds.map((round: any) => (
                                    <SelectItem key={round.id} value={round.id}>
                                        {round.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {actorRole === 'ADMIN' ? (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Checkbox
                                    checked={quickApproveEnabled}
                                    onCheckedChange={(checked) => {
                                        const enabled = !!checked;
                                        setQuickApproveEnabled(enabled);
                                        if (!enabled) setSelectedApproveIds([]);
                                    }}
                                />
                                Phê duyệt nhanh
                            </label>
                        ) : null}

                        {actorRole === 'ADMIN' && quickApproveEnabled && selectedApproveIds.length > 0 ? (
                            <Button
                                onClick={async () => {
                                    openConfirm({ mode: 'bulk', ids: selectedApproveIds });
                                }}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                                Phê duyệt đã chọn ({selectedApproveIds.length})
                            </Button>
                        ) : null}
                    </div>

                    <DisbursementListTable
                        data={data?.data || []}
                        isLoading={isLoading}
                        pagination={data?.pagination}
                        onPageChange={setPage}
                        exportFilters={filters}
                        showActions={true}
                        role={actorRole}
                        quickApproveEnabled={quickApproveEnabled}
                        selectedIds={selectedApproveIds}
                        onToggleSelect={(item, checked) => {
                            setSelectedApproveIds((prev) =>
                                checked
                                    ? prev.includes(item.id)
                                        ? prev
                                        : [...prev, item.id]
                                    : prev.filter((id) => id !== item.id),
                            );
                        }}
                        onViewDetails={setSelectedDisbursement}
                        onApprove={async (item) => {
                            if (actorRole !== 'ADMIN') return;

                            if (!quickApproveEnabled) {
                                setSelectedDisbursement(item);
                                return;
                            }

                            openConfirm({ mode: 'single', ids: [item.id] });
                        }}
                    />
                </CardContent>
            </Card>

            {!approvalOnly ? (
                <DisbursementFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} mode="create" />
            ) : null}

            <Dialog open={!!selectedDisbursement} onOpenChange={(open) => !open && setSelectedDisbursement(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết giải ngân</DialogTitle>
                    </DialogHeader>
                    {selectedDisbursement ? (
                        <div className="space-y-5 text-sm">
                            <div className="rounded-lg border p-4">
                                <div className="mb-2 text-xs text-muted-foreground">Đề tài</div>
                                <div className="font-medium">
                                    {(selectedDisbursement.project?.code ?? 'N/A') +
                                        ' - ' +
                                        (selectedDisbursement.project?.title ?? '')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Số tiền</div>
                                    <div className="mt-1 font-semibold text-base">
                                        {Number(selectedDisbursement.amount).toLocaleString('vi-VN')} VNĐ
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Ngày giải ngân</div>
                                    <div className="mt-1 font-medium">
                                        {new Date(selectedDisbursement.disbursedAt).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Số chứng từ</div>
                                    <div className="mt-1 font-medium">{selectedDisbursement.voucherNo ?? '—'}</div>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <div className="text-xs text-muted-foreground">Trạng thái</div>
                                    <div className="mt-1">
                                        <DisbursementStatusBadge status={selectedDisbursement.status} />
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3 md:col-span-2">
                                    <div className="text-xs text-muted-foreground">Người tạo</div>
                                    <div className="mt-1 font-medium">
                                        {selectedDisbursement.createdBy?.name ?? 'N/A'}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="mb-2 text-xs text-muted-foreground">Lý do giải ngân</div>
                                <div>{selectedDisbursement.reason ?? '—'}</div>
                            </div>

                            <div className="rounded-lg border p-4">
                                <div className="mb-3 text-xs text-muted-foreground">File chứng từ</div>
                                {selectedDisbursement.voucherFileUrl ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild variant="outline" size="sm">
                                            <a
                                                href={selectedDisbursement.voucherFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" /> Xem file
                                            </a>
                                        </Button>
                                        <Button asChild size="sm">
                                            <a href={selectedDisbursement.voucherFileUrl} download>
                                                <Download className="mr-2 h-4 w-4" /> Tải xuống
                                            </a>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">Không có file chứng từ</div>
                                )}
                            </div>

                            {selectedDisbursement.status === 'PENDING' ? (
                                <div className="rounded-lg border p-4 space-y-3">
                                    <div className="text-xs text-muted-foreground">Phê duyệt / từ chối giải ngân</div>
                                    <Textarea
                                        placeholder="Nhập ghi chú từ chối (bắt buộc khi từ chối)"
                                        value={rejectionNote}
                                        onChange={(e) => setRejectionNote(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            disabled={approveMutation.isPending || rejectMutation.isPending}
                                            onClick={async () => {
                                                openConfirm({ mode: 'single', ids: [selectedDisbursement.id] });
                                                setSelectedDisbursement(null);
                                                setRejectionNote('');
                                            }}
                                        >
                                            Phê duyệt
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            disabled={
                                                approveMutation.isPending ||
                                                rejectMutation.isPending ||
                                                !rejectionNote.trim()
                                            }
                                            onClick={async () => {
                                                await rejectMutation.mutateAsync({
                                                    id: selectedDisbursement.id,
                                                    data: { rejectionNote: rejectionNote.trim() },
                                                });
                                                setSelectedDisbursement(null);
                                                setRejectionNote('');
                                            }}
                                        >
                                            Từ chối
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận phê duyệt</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmPayload?.mode === 'bulk'
                                ? `Bạn có chắc chắn muốn phê duyệt ${confirmPayload.ids.length} yêu cầu đã chọn?`
                                : 'Bạn có chắc chắn muốn phê duyệt yêu cầu giải ngân này?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmApprove}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                            Xác nhận
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
