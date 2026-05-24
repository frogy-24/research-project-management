'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { BarChart3, Download, RefreshCw, FileSpreadsheet, FileDown } from 'lucide-react';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { useProjects } from '@/hooks/useProjects';
import { OverviewCards } from '@/components/admin/stats/overview-cards';
import { ProjectStatusChart } from '@/components/admin/stats/project-status-chart';
import { UserRoleChart } from '@/components/admin/stats/user-role-chart';
import { ProjectTimelineChart } from '@/components/admin/stats/project-timeline-chart';
import { BudgetChart } from '@/components/admin/stats/budget-chart';
import { DepartmentChart } from '@/components/admin/stats/department-chart';
import { RegistrationStatusChart } from '@/components/admin/stats/registration-status-chart';
import { ProgressReportChart } from '@/components/admin/stats/progress-report-chart';
import { FundingChart } from '@/components/admin/stats/funding-chart';
import { ProjectDataTable } from '@/components/admin/stats/data-tables';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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

export function DeanOverviewDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminStatistics();
  const { data: projects = [] } = useProjects();

  const projectRows = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        code: p.code ?? '',
        title: p.title,
        status: p.status,
        budgetRequested: p.budgetRequested ?? null,
        budgetApproved: p.budgetApproved ?? null,
        leaderName: p.leader?.name ?? '—',
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      })),
    [projects]
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Nhóm', 'Chỉ số', 'Giá trị'],
      ...Object.entries(data.overview).map(([k, v]) => ['Tổng quan', k, String(v)]),
      ...Object.entries(data.projects.byStatus).map(([k, v]) => ['Đề tài theo trạng thái', k, String(v)]),
      ...Object.entries(data.users.byRole).map(([k, v]) => ['Người dùng theo vai trò', k, String(v)]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadBlob(csv, `dean-overview-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Đã xuất CSV');
  };

  const exportXLSX = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const overviewSheet = XLSX.utils.json_to_sheet(
      Object.entries(data.overview).map(([metric, value]) => ({ metric, value }))
    );
    XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');

    const projectStatusSheet = XLSX.utils.json_to_sheet(
      Object.entries(data.projects.byStatus).map(([status, count]) => ({ status, count }))
    );
    XLSX.utils.book_append_sheet(wb, projectStatusSheet, 'ProjectStatus');

    const usersRoleSheet = XLSX.utils.json_to_sheet(
      Object.entries(data.users.byRole).map(([role, count]) => ({ role, count }))
    );
    XLSX.utils.book_append_sheet(wb, usersRoleSheet, 'UserRoles');

    const projectListSheet = XLSX.utils.json_to_sheet(
      projectRows.map((row) => ({
        code: row.code,
        title: row.title,
        status: row.status,
        leaderName: row.leaderName,
        budgetRequested: row.budgetRequested,
        budgetApproved: row.budgetApproved,
        createdAt: row.createdAt,
      }))
    );
    XLSX.utils.book_append_sheet(wb, projectListSheet, 'Projects');

    XLSX.writeFile(wb, `dean-overview-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất XLSX');
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Không thể tải dữ liệu thống kê. Vui lòng thử lại.</p>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 print:p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Hệ thống tổng quan khoa
          </h1>
          <p className="mt-1 text-muted-foreground">Thống kê toàn cục: đề tài, người dùng, đăng ký, giải ngân, tiến độ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <FileDown className="h-4 w-4" />
            Xuất CSV
          </Button>
          <Button onClick={exportXLSX} size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Xuất XLSX
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            In báo cáo
          </Button>
        </div>
      </div>

      <OverviewCards data={data.overview} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProjectStatusChart data={data.projects.byStatus} />
        <UserRoleChart data={data.users.byRole} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProjectTimelineChart data={data.projects.byMonth} />
        <BudgetChart data={data.projects.budget} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DepartmentChart data={data.projects.byDepartment} />
        <RegistrationStatusChart data={data.registrations.byStatus} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressReportChart data={data.progressReports} />
        <FundingChart data={data.funding} />
      </div>

      <ProjectDataTable projects={projectRows} />
    </div>
  );
}
