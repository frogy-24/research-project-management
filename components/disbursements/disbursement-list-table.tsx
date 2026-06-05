'use client';

import { Eye, FileDown, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DisbursementStatusBadge } from './disbursement-status-badge';
import type { FundingDisbursementWithRelations } from '@/types/disbursement.schema';
import type { DisbursementFilters } from '@/types/disbursement.schema';
import { toast } from 'sonner';

type Props = {
  data: FundingDisbursementWithRelations[];
  isLoading?: boolean;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
  exportFilters?: DisbursementFilters;
  showActions?: boolean;
  role?: string;
  quickApproveEnabled?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (item: FundingDisbursementWithRelations, checked: boolean) => void;
  onViewDetails?: (item: FundingDisbursementWithRelations) => void;
  onApprove?: (item: FundingDisbursementWithRelations) => void;
};

export function DisbursementListTable({ data, isLoading, pagination, onPageChange, exportFilters, showActions, role, quickApproveEnabled, selectedIds = [], onToggleSelect, onViewDetails, onApprove }: Props) {
  const mapStatusLabel = (status: FundingDisbursementWithRelations['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      case 'PAID':
        return 'Đã thanh toán';
      default:
        return status;
    }
  };

  const formatDateTime = (value?: Date | string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatCurrency = (value: number) => Number(value).toLocaleString('vi-VN');

  const toRows = (items: FundingDisbursementWithRelations[]) => items.map((d) => ({
    stt: 0,
    maGiaiNgan: d.id,
    maDeTai: d.project?.code ?? 'N/A',
    tenDeTai: d.project?.title ?? 'N/A',
    dotDangKy: d.project?.callRound?.name ?? '',
    nganSachDuocDuyet: d.project?.budgetApproved ? formatCurrency(Number(d.project.budgetApproved)) : '',
    soTienGiaiNgan: formatCurrency(Number(d.amount)),
    ngayGiaiNgan: new Date(d.disbursedAt).toLocaleDateString('vi-VN'),
    soChungTu: d.voucherNo ?? '',
    trangThai: mapStatusLabel(d.status),
    lyDoGiaiNgan: d.reason ?? '',
    nguoiTao: d.createdBy?.name ?? 'N/A',
    emailNguoiTao: d.createdBy?.email ?? '',
    nguoiDuyet: d.approvedBy?.name ?? '',
    emailNguoiDuyet: d.approvedBy?.email ?? '',
    thoiGianDuyet: formatDateTime(d.approvedAt),
    ghiChuTuChoi: d.rejectionNote ?? '',
    ngayTao: formatDateTime(d.createdAt),
    ngayCapNhat: formatDateTime(d.updatedAt),
    tepChungTu: d.voucherFileUrl ?? '',
    chungTuThanhToan: d.paymentVoucherUrl ?? '',
  }));

  const exportCSV = () => {
    const rows = toRows(data);
    rows.forEach((r, i) => {
      r.stt = i + 1;
    });
    const header = ['STT', 'Mã giải ngân', 'Mã đề tài', 'Tên đề tài', 'Đợt đăng ký', 'Ngân sách được duyệt (VNĐ)', 'Số tiền giải ngân (VNĐ)', 'Ngày giải ngân', 'Số chứng từ', 'Trạng thái', 'Lý do giải ngân', 'Người tạo', 'Email người tạo', 'Người duyệt', 'Email người duyệt', 'Thời gian duyệt', 'Ghi chú từ chối', 'Ngày tạo', 'Ngày cập nhật', 'Tệp chứng từ', 'Chứng từ thanh toán'];
    const csvRows = [
      header,
      ...rows.map((r) => [r.stt, r.maGiaiNgan, r.maDeTai, r.tenDeTai, r.dotDangKy, r.nganSachDuocDuyet, r.soTienGiaiNgan, r.ngayGiaiNgan, r.soChungTu, r.trangThai, r.lyDoGiaiNgan, r.nguoiTao, r.emailNguoiTao, r.nguoiDuyet, r.emailNguoiDuyet, r.thoiGianDuyet, r.ghiChuTuChoi, r.ngayTao, r.ngayCapNhat, r.tepChungTu, r.chungTuThanhToan]),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giai-ngan-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã xuất CSV');
  };

  const exportStyledXLSX = () => {
    const params = new URLSearchParams();
    if (exportFilters) {
      if (exportFilters.status) params.set('status', exportFilters.status);
      if (exportFilters.callRoundId) params.set('callRoundId', exportFilters.callRoundId);
      if (exportFilters.projectId) params.set('projectId', exportFilters.projectId);
      if (exportFilters.fromDate) params.set('fromDate', new Date(exportFilters.fromDate).toISOString());
      if (exportFilters.toDate) params.set('toDate', new Date(exportFilters.toDate).toISOString());
    }
    const queryString = params.toString();
    const url = `/api/dean/disbursements/export-styled${queryString ? `?${queryString}` : ''}`;
    window.open(url, '_blank');
    toast.success('Đang xuất file Excel với định dạng đẹp...');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={exportCSV}
        >
          <FileDown className="h-4 w-4" /> Xuất CSV
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
          onClick={exportStyledXLSX}
        >
          <FileSpreadsheet className="h-4 w-4" /> Xuất Excel
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Đề tài</TableHead>
              {quickApproveEnabled && role === 'ADMIN' ? <TableHead className="w-[48px]">Chọn</TableHead> : null}
              <TableHead>Số tiền</TableHead>
              <TableHead>Ngày giải ngân</TableHead>
              <TableHead>Chứng từ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Lý do</TableHead>
              {showActions ? <TableHead className="text-right">Thao tác</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Chưa có dữ liệu giải ngân
                </TableCell>
              </TableRow>
            ) : (
              data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{(d.project?.code ?? 'N/A') + ' - ' + (d.project?.title ?? '')}</TableCell>
                  {quickApproveEnabled && role === 'ADMIN' ? (
                    <TableCell>
                      {d.status === 'PENDING' ? (
                        <Checkbox
                          checked={selectedIds.includes(d.id)}
                          onCheckedChange={(checked) => onToggleSelect?.(d, !!checked)}
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell>{Number(d.amount).toLocaleString('vi-VN')} VNĐ</TableCell>
                  <TableCell>{new Date(d.disbursedAt).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell>{d.voucherNo ?? '—'}</TableCell>
                  <TableCell><DisbursementStatusBadge status={d.status} /></TableCell>
                  <TableCell>
                    {d.status === 'PAID' ? (
                      <span className="text-emerald-600 font-medium">Đã thanh toán</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Chưa thanh toán</span>
                    )}
                  </TableCell>
                  <TableCell>{d.createdBy?.name ?? 'N/A'}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{d.reason ?? '—'}</TableCell>
                  {showActions ? (
                    <TableCell className="text-right">
                      {role === 'ADMIN' && d.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mr-2"
                          onClick={() => onApprove?.(d)}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Phê duyệt
                        </Button>
                      ) : null}
                      <Button size="icon-sm" variant="ghost" onClick={() => onViewDetails?.(d)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && onPageChange ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (pagination.page > 1) onPageChange(pagination.page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Trang {pagination.page}/{pagination.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (pagination.page < pagination.totalPages) onPageChange(pagination.page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
