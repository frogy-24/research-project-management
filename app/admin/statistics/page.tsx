'use client';

import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { OverviewCards } from '@/components/admin/stats/overview-cards';
import { ProjectStatusChart } from '@/components/admin/stats/project-status-chart';
import { UserRoleChart } from '@/components/admin/stats/user-role-chart';
import { ProjectTimelineChart } from '@/components/admin/stats/project-timeline-chart';
import { BudgetChart } from '@/components/admin/stats/budget-chart';
import { DepartmentChart } from '@/components/admin/stats/department-chart';
import { RegistrationStatusChart } from '@/components/admin/stats/registration-status-chart';
import { ProgressReportChart } from '@/components/admin/stats/progress-report-chart';
import { FundingChart } from '@/components/admin/stats/funding-chart';
import { ExportButtons } from '@/components/admin/stats/export-buttons';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

const DECISION_LABEL_MAP: Record<string, string> = {
  PASS: 'Đạt',
  NEED_REVISION: 'Cần sửa',
  FAIL: 'Không đạt',
};

const EXTENSION_LABEL_MAP: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const GENDER_LABEL_MAP: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function StatisticsPage() {
  const { data, isLoading, error } = useAdminStatistics();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-statistics'] });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
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
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Không thể tải dữ liệu thống kê. Vui lòng thử lại.</p>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvalRate =
    data.registrations.byStatus.APPROVED && data.overview.totalRegistrations
      ? (data.registrations.byStatus.APPROVED / data.overview.totalRegistrations) * 100
      : 0;

  const budgetUtilization =
    data.projects.budget.totalRequested > 0
      ? (data.projects.budget.totalApproved / data.projects.budget.totalRequested) * 100
      : 0;

  const overdueRate =
    data.progressReports.total > 0 ? (data.progressReports.overdueTotal / data.progressReports.total) * 100 : 0;

  const decisionChartData = Object.entries(data.councils.evaluationsByDecision)
    .map(([k, v]) => ({ name: DECISION_LABEL_MAP[k] ?? k, value: v }))
    .filter((i) => i.value > 0);

  const extensionChartData = Object.entries(data.extensions.byStatus)
    .map(([k, v]) => ({ name: EXTENSION_LABEL_MAP[k] ?? k, value: v }))
    .filter((i) => i.value > 0);

  const genderChartData = Object.entries(data.users.byGender)
    .map(([k, v]) => ({ name: GENDER_LABEL_MAP[k] ?? k, value: v }))
    .filter((i) => i.value > 0);

  const callRoundRegistrationData = Object.entries(data.registrations.byCallRound)
    .map(([name, count]) => ({ name, count }))
    .filter((i) => i.count > 0)
    .slice(0, 10);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 print:p-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Thống kê & Báo cáo
          </h1>
          <p className="mt-1 text-muted-foreground">Tổng quan hệ thống quản lý nghiên cứu khoa học</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
          <ExportButtons />
        </div>
      </div>

      <OverviewCards data={data.overview} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Tỷ lệ duyệt đăng ký</p>
            <p className="text-2xl font-bold text-emerald-600">{approvalRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Tỷ lệ ngân sách phê duyệt/đề xuất</p>
            <p className="text-2xl font-bold text-blue-600">{budgetUtilization.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Tỷ lệ báo cáo quá hạn</p>
            <p className="text-2xl font-bold text-red-600">{overdueRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đánh giá hội đồng</CardTitle>
          </CardHeader>
          <CardContent>
            {decisionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={decisionChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {decisionChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value)} lượt`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đơn gia hạn</CardTitle>
          </CardHeader>
          <CardContent>
            {extensionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={extensionChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {extensionChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value)} đơn`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Người dùng theo giới tính</CardTitle>
          </CardHeader>
          <CardContent>
            {genderChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={genderChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {genderChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value)} người`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top đợt đăng ký theo số lượng</CardTitle>
          </CardHeader>
          <CardContent>
            {callRoundRegistrationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={callRoundRegistrationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value)} đăng ký`} />
                  <Legend />
                  <Bar dataKey="count" name="Số đăng ký" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tóm tắt nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Đợt đang mở / tổng đợt</p>
              <p className="text-xl font-semibold">
                {data.overview.activeCallRounds}/{data.overview.totalCallRounds}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Hội đồng / đề tài</p>
              <p className="text-xl font-semibold">
                {data.overview.totalCouncils}/{data.overview.totalProjects}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">TB ngân sách đề xuất/đề tài</p>
              <p className="text-xl font-semibold">{data.projects.budget.avgRequested.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">TB ngân sách duyệt/đề tài</p>
              <p className="text-xl font-semibold">{data.projects.budget.avgApproved.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
