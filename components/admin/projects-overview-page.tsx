'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileDown, FileSpreadsheet, FolderOpen, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useProjects } from '@/hooks/useProjects';
import { useDepartments } from '@/hooks/useDepartments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type FilterStatus = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'OTHER';

const STATUS_LABEL_MAP: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  DEAN_APPROVED: 'Khoa duyệt',
  DEAN_REVISION: 'Khoa yêu cầu sửa',
  ADMIN_REVIEW: 'Admin đang duyệt',
  COUNCIL_EVALUATING: 'Hội đồng đánh giá',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Đã thực hiện',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Đình chỉ',
};

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  DEAN_APPROVED: 'default',
  DEAN_REVISION: 'outline',
  ADMIN_REVIEW: 'secondary',
  COUNCIL_EVALUATING: 'secondary',
  APPROVED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'default',
  REJECTED: 'destructive',
  SUSPENDED: 'destructive',
};

function normalizeDepartmentName(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function downloadBlob(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminProjectsOverviewPage() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading, error } = useProjects();
  const { data: departments = [] } = useDepartments();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  const departmentOptions = useMemo(() => {
    const fromApi = (departments ?? []).map((d: any) => d.name).filter(Boolean);
    const fromProjects = projects.map((p) => p.leader?.department).filter(Boolean) as string[];
    return Array.from(new Set([...fromApi, ...fromProjects])).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [departments, projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const statusMatched =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'OTHER'
            ? project.status !== 'IN_PROGRESS' && project.status !== 'COMPLETED'
            : project.status === statusFilter;

      const projectDepartment = normalizeDepartmentName(project.leader?.department);
      const filterDepartment = normalizeDepartmentName(departmentFilter === 'ALL' ? '' : departmentFilter);
      const departmentMatched = filterDepartment ? projectDepartment === filterDepartment : true;

      return statusMatched && departmentMatched;
    });
  }, [projects, statusFilter, departmentFilter]);

  const exportRows = filteredProjects.map((project, idx) => ({
    stt: idx + 1,
    maDeTai: project.code ?? '—',
    tenDeTai: project.title,
    trangThai: STATUS_LABEL_MAP[project.status] ?? project.status,
    khoa: project.leader?.department ?? '—',
    chuNhiem: project.leader?.name ?? '—',
    kinhPhiDeXuat: project.budgetRequested ? Number(project.budgetRequested).toLocaleString('vi-VN') : '—',
    kinhPhiDuyet: project.budgetApproved ? Number(project.budgetApproved).toLocaleString('vi-VN') : '—',
    ngayTao: new Date(project.createdAt).toLocaleDateString('vi-VN'),
  }));

  const exportCSV = () => {
    const header = ['STT', 'Mã đề tài', 'Tên đề tài', 'Trạng thái', 'Khoa', 'Chủ nhiệm', 'Kinh phí đề xuất', 'Kinh phí duyệt', 'Ngày tạo'];
    const csvRows = [
      header,
      ...exportRows.map((r) => [r.stt, r.maDeTai, r.tenDeTai, r.trangThai, r.khoa, r.chuNhiem, r.kinhPhiDeXuat, r.kinhPhiDuyet, r.ngayTao]),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadBlob(csv, `de-tai-nckh-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Đã xuất CSV theo bộ lọc');
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const title = ['BÁO CÁO ĐỀ TÀI NCKH TOÀN KHOA'];
    const header = ['STT', 'Mã đề tài', 'Tên đề tài', 'Trạng thái', 'Khoa', 'Chủ nhiệm', 'Kinh phí đề xuất', 'Kinh phí duyệt', 'Ngày tạo'];
    const wsData = [
      title,
      [],
      header,
      ...exportRows.map((r) => [r.stt, r.maDeTai, r.tenDeTai, r.trangThai, r.khoa, r.chuNhiem, r.kinhPhiDeXuat, r.kinhPhiDuyet, r.ngayTao]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 42 },
      { wch: 20 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'De tai NCKH');
    XLSX.writeFile(wb, `de-tai-nckh-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất XLSX theo bộ lọc');
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Không tải được danh sách đề tài.</p>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" /> Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <FolderOpen className="h-8 w-8" /> Đề tài NCKH toàn khoa
          </h1>
          <p className="mt-1 text-muted-foreground">Theo dõi đề tài đã thực hiện, đang thực hiện và trạng thái khác của toàn khoa.</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bộ lọc và xuất file</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="text-sm border rounded-md px-3 py-2 bg-background"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Đã thực hiện</option>
            <option value="OTHER">Trạng thái khác</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-sm border rounded-md px-3 py-2 bg-background"
          >
            <option value="ALL">Tất cả khoa</option>
            {departmentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" /> Xuất CSV
          </Button>
          <Button onClick={exportXLSX} size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Xuất XLSX
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách đề tài ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đề tài</TableHead>
                  <TableHead>Tên đề tài</TableHead>
                  <TableHead>Khoa</TableHead>
                  <TableHead>Chủ nhiệm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Kinh phí duyệt</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Không có đề tài theo bộ lọc
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-mono text-xs">{project.code ?? '—'}</TableCell>
                      <TableCell className="max-w-[380px] truncate">{project.title}</TableCell>
                      <TableCell>{project.leader?.department ?? '—'}</TableCell>
                      <TableCell>{project.leader?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT_MAP[project.status] ?? 'outline'}>
                          {STATUS_LABEL_MAP[project.status] ?? project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {project.budgetApproved ? `${Number(project.budgetApproved).toLocaleString('vi-VN')} VNĐ` : '—'}
                      </TableCell>
                      <TableCell>{new Date(project.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
