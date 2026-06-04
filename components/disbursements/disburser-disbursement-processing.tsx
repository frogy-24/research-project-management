'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
    Banknote,
    Download,
    ExternalLink,
    FileDown,
    FileText,
    FileUp,
    Paperclip,
    PlusCircle,
    Search,
    Trash2,
    Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDisbursements, usePayDisbursement } from '@/hooks/useDisbursements';
import { useCallRounds } from '@/hooks/useCallRounds';
import { DisbursementStatusBadge } from './disbursement-status-badge';
import type { DisbursementFilters, FundingDisbursementWithRelations } from '@/types/disbursement.schema';
import { exportDisbursementsToExcel, downloadExcelFile } from '@/lib/export-disbursement-excel';
import { toast } from 'sonner';

const paymentFileAccept = [
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.txt',
    '.zip',
].join(',');

const formatCurrency = (value: unknown) => `${Number(value ?? 0).toLocaleString('vi-VN')} VNĐ`;

const formatDate = (value?: Date | string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: Date | string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
};

const getPaymentVoucherHref = (id: string) =>
    `/api/disbursements/${encodeURIComponent(id)}/payment-voucher`;

type PendingVoucherRow = {
    id: string;
    displayName: string;
    file: File | null;
};

const createVoucherRow = (): PendingVoucherRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: '',
    file: null,
});

export function DisburserDisbursementProcessing() {
    const [filters, setFilters] = useState<DisbursementFilters>({});
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailItem, setDetailItem] = useState<FundingDisbursementWithRelations | null>(null);
    const [paymentItem, setPaymentItem] = useState<FundingDisbursementWithRelations | null>(null);
    const [paymentRows, setPaymentRows] = useState<PendingVoucherRow[]>([createVoucherRow()]);
    const [paymentNote, setPaymentNote] = useState('');
    const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const payMutation = usePayDisbursement();
    const { data: callRoundsData } = useCallRounds();
    const { data, isLoading } = useDisbursements({
        ...filters,
        page,
        limit: 10,
    });
    

    const callRounds = callRoundsData ?? [];
    const selectedCallRound = callRounds.find((cr) => cr.id === filters.callRoundId);

    const visibleDisbursements = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const items = data?.data ?? [];
        if (!keyword) return items;

        return items.filter((item) => {
            const searchable = [
                item.project?.code,
                item.project?.title,
                item.project?.callRound?.name,
                item.voucherNo,
                item.createdBy?.name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(keyword);
        });
    }, [data?.data, searchTerm]);

    const currentPageStats = useMemo(() => {
        const items = data?.data ?? [];
        return {
            approved: items.filter((item) => item.status === 'APPROVED').length,
            paid: items.filter((item) => item.status === 'PAID').length,
            pending: items.filter((item) => item.status === 'PENDING').length,
        };
    }, [data?.data]);

    const openPaymentDialog = (item: FundingDisbursementWithRelations) => {
        setPaymentItem(item);
        setPaymentRows([createVoucherRow()]);
        setPaymentNote('');
        setPaidAt(new Date().toISOString().slice(0, 10));
    };

    const closePaymentDialog = () => {
        setPaymentItem(null);
        setPaymentRows([createVoucherRow()]);
        setPaymentNote('');
    };

    const filledVoucherRows = useMemo(
        () => paymentRows.filter((row) => row.file !== null),
        [paymentRows],
    );

    const handleAddVoucherRow = () => {
        setPaymentRows((prev) => [...prev, createVoucherRow()]);
    };

    const handleRemoveVoucherRow = (rowId: string) => {
        setPaymentRows((prev) => {
            if (prev.length === 1) {
                return [{ ...prev[0], displayName: '', file: null }];
            }
            return prev.filter((row) => row.id !== rowId);
        });
        delete fileInputRefs.current[rowId];
    };

    const handleVoucherRowNameChange = (rowId: string, value: string) => {
        setPaymentRows((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, displayName: value } : row)),
        );
    };

    const handleVoucherRowFileChange = (
        rowId: string,
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const selectedFile = event.target.files?.[0] ?? null;
        setPaymentRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) return row;
                if (!selectedFile) {
                    return { ...row, file: null };
                }
                return {
                    ...row,
                    file: selectedFile,
                    displayName:
                        row.displayName.trim().length > 0 ? row.displayName : selectedFile.name,
                };
            }),
        );
    };

    const handleChooseVoucherRowFile = (rowId: string) => {
        fileInputRefs.current[rowId]?.click();
    };

    const handlePay = async () => {
        if (!paymentItem) return;
        const firstFile = paymentRows.find((row) => row.file !== null)?.file;
        if (!firstFile) return;

        await payMutation.mutateAsync({
            id: paymentItem.id,
            data: {
                file: firstFile,
                paymentNote: paymentNote.trim() || undefined,
                paidAt,
            },
        });

        closePaymentDialog();
    };

    const handleStatusChange = (value: string) => {
        setFilters((previous) => ({
            ...previous,
            status: value === 'all' ? undefined : (value as DisbursementFilters['status']),
        }));
        setPage(1);
    };

    const handleCallRoundChange = (value: string) => {
        setFilters((previous) => ({
            ...previous,
            callRoundId: value === 'all' ? undefined : value,
        }));
        setPage(1);
    };

    const handleExportExcel = async () => {
        if (!data?.data || data.data.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        try {
            setIsExporting(true);
            toast.info('Đang xuất file Excel...');

            const buffer = await exportDisbursementsToExcel(visibleDisbursements, selectedCallRound?.name);

            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = selectedCallRound
                ? `Giai_ngan_${selectedCallRound.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`
                : `Giai_ngan_${timestamp}.xlsx`;

            downloadExcelFile(buffer, filename);
            toast.success('Xuất file Excel thành công!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const pagination = data?.pagination;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Tổng giải ngân</CardDescription>
                        <CardTitle className="text-3xl">{pagination?.total ?? 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Chờ thanh toán</CardDescription>
                        <CardTitle className="text-3xl text-emerald-700">{currentPageStats.approved}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Đã thanh toán</CardDescription>
                        <CardTitle className="text-3xl text-blue-700">{currentPageStats.paid}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Chờ duyệt</CardDescription>
                        <CardTitle className="text-3xl text-amber-700">{currentPageStats.pending}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách giải ngân</CardTitle>
                    <CardDescription>
                        Hiển thị tất cả giải ngân và xử lý thanh toán các khoản đã được phê duyệt.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Tìm theo mã đề tài, tên đề tài, chứng từ..."
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>
                            <Select value={filters.callRoundId ?? 'all'} onValueChange={handleCallRoundChange}>
                                <SelectTrigger className="w-full md:w-[240px]">
                                    <SelectValue placeholder="Đợt đăng ký" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả đợt đăng ký</SelectItem>
                                    {callRounds.map((round) => (
                                        <SelectItem key={round.id} value={round.id}>
                                            {round.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filters.status ?? 'all'} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                                    <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                                    <SelectItem value="PAID">Đã thanh toán</SelectItem>
                                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleExportExcel}
                                disabled={isExporting || !data?.data || data.data.length === 0}
                                variant="default"
                                size="sm"
                            >
                                <FileDown className="mr-2 h-4 w-4" />
                                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Đề tài</TableHead>
                                    <TableHead>Số tiền</TableHead>
                                    <TableHead>Ngày giải ngân</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Chứng từ thanh toán</TableHead>
                                    <TableHead>Người tạo</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            Đang tải...
                                        </TableCell>
                                    </TableRow>
                                ) : visibleDisbursements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                            Không có dữ liệu giải ngân
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleDisbursements.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="min-w-[260px]">
                                                <div className="font-medium">{item.project?.code ?? 'N/A'}</div>
                                                <div className="line-clamp-2 text-sm text-muted-foreground">
                                                    {item.project?.title ?? '—'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell>{formatDate(item.disbursedAt)}</TableCell>
                                            <TableCell>
                                                <DisbursementStatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell>
                                                {item.paymentVoucherUrl ? (
                                                    <Button asChild size="sm" variant="outline">
                                                        <a
                                                            href={getPaymentVoucherHref(item.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Xem file
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Chưa có</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.createdBy?.name ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setDetailItem(item)}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                    {item.status === 'APPROVED' ? (
                                                        <Button size="sm" onClick={() => openPaymentDialog(item)}>
                                                            <Banknote className="mr-2 h-4 w-4" />
                                                            Xác nhận
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {pagination ? (
                        <div className="flex items-center justify-end gap-3 text-sm">
                            <span className="text-muted-foreground">
                                Trang {pagination.page}/{Math.max(pagination.totalPages, 1)}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pagination.page <= 1}
                                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                            >
                                Trước
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Sau
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <Dialog open={!!paymentItem} onOpenChange={(open) => !open && closePaymentDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Xác nhận thanh toán</DialogTitle>
                    </DialogHeader>
                    {paymentItem ? (
                        <div className="space-y-4">
                            <div className="rounded-md border p-3 text-sm">
                                <div className="font-medium">{paymentItem.project?.code ?? 'N/A'}</div>
                                <div className="mt-1 text-muted-foreground">{paymentItem.project?.title ?? '—'}</div>
                                <div className="mt-2 font-semibold">{formatCurrency(paymentItem.amount)}</div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paidAt">Ngày thanh toán</Label>
                                <Input
                                    id="paidAt"
                                    type="date"
                                    value={paidAt}
                                    onChange={(event) => setPaidAt(event.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Tài liệu thanh toán</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleAddVoucherRow}
                                    >
                                        <PlusCircle className="mr-1 h-3 w-3" />
                                        Thêm dòng
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {paymentRows.map((row, index) => (
                                        <div
                                            key={row.id}
                                            className="space-y-1 rounded-md border bg-muted/20 p-2"
                                        >
                                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                                <Input
                                                    value={row.displayName}
                                                    onChange={(event) =>
                                                        handleVoucherRowNameChange(row.id, event.target.value)
                                                    }
                                                    placeholder={`Tên tài liệu #${index + 1}`}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleChooseVoucherRowFile(row.id)}
                                                >
                                                    <Upload className="mr-1 h-4 w-4" />
                                                    Upload file
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => handleRemoveVoucherRow(row.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <input
                                                ref={(element) => {
                                                    fileInputRefs.current[row.id] = element;
                                                }}
                                                type="file"
                                                accept={paymentFileAccept}
                                                className="hidden"
                                                onChange={(event) =>
                                                    handleVoucherRowFileChange(row.id, event)
                                                }
                                            />

                                            {row.file ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Đã chọn: {row.file.name} (
                                                    {(row.file.size / 1024).toFixed(1)} KB)
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Chưa chọn file upload
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Mỗi dòng gồm tên tài liệu và 1 tệp upload tương ứng. Hỗ trợ PDF,
                                    ảnh, Word, Excel, CSV, TXT, ZIP. Tối đa 20MB.
                                </p>

                                {filledVoucherRows.length > 0 ? (
                                    <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            <Paperclip className="h-3.5 w-3.5" />
                                            File thanh toán ({filledVoucherRows.length})
                                        </div>
                                        {filledVoucherRows.map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between rounded-md border bg-background p-2"
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {row.displayName.trim().length > 0
                                                                ? row.displayName
                                                                : row.file?.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.file
                                                                ? `${(row.file.size / 1024).toFixed(1)} KB`
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                                    onClick={() => handleRemoveVoucherRow(row.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paymentNote">Ghi chú</Label>
                                <Textarea
                                    id="paymentNote"
                                    value={paymentNote}
                                    onChange={(event) => setPaymentNote(event.target.value)}
                                    placeholder="Nhập ghi chú thanh toán nếu có"
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={closePaymentDialog} disabled={payMutation.isPending}>
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handlePay}
                                    disabled={filledVoucherRows.length === 0 || payMutation.isPending}
                                >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    {payMutation.isPending ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết giải ngân</DialogTitle>
                    </DialogHeader>
                    {detailItem ? (
                        <div className="space-y-4 text-sm">
                            <div className="rounded-md border p-4">
                                <div className="text-xs text-muted-foreground">Đề tài</div>
                                <div className="mt-1 font-medium">
                                    {(detailItem.project?.code ?? 'N/A') + ' - ' + (detailItem.project?.title ?? '')}
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoBlock label="Số tiền" value={formatCurrency(detailItem.amount)} />
                                <InfoBlock label="Ngày giải ngân" value={formatDate(detailItem.disbursedAt)} />
                                <InfoBlock label="Số chứng từ" value={detailItem.voucherNo ?? '—'} />
                                <InfoBlock
                                    label="Trạng thái"
                                    value={<DisbursementStatusBadge status={detailItem.status} />}
                                />
                                <InfoBlock label="Người duyệt" value={detailItem.approvedBy?.name ?? '—'} />
                                <InfoBlock label="Thời gian duyệt" value={formatDateTime(detailItem.approvedAt)} />
                                <InfoBlock label="Người thanh toán" value={detailItem.paidBy?.name ?? '—'} />
                                <InfoBlock label="Thời gian thanh toán" value={formatDateTime(detailItem.paidAt)} />
                            </div>

                            <InfoBlock label="Lý do giải ngân" value={detailItem.reason ?? '—'} />
                            <InfoBlock label="Ghi chú thanh toán" value={detailItem.paymentNote ?? '—'} />

                            <div className="flex flex-wrap gap-2">
                                {detailItem.voucherFileUrl ? (
                                    <Button asChild variant="outline" size="sm">
                                        <a href={detailItem.voucherFileUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Xem chứng từ giải ngân
                                        </a>
                                    </Button>
                                ) : null}
                                {detailItem.paymentVoucherUrl ? (
                                    <Button asChild size="sm">
                                        <a
                                            href={getPaymentVoucherHref(detailItem.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Xem chứng từ thanh toán
                                        </a>
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 font-medium">{value}</div>
        </div>
    );
}
