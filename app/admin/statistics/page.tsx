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
          <ExportButtons data={data} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thống kê khác</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-sm mb-3">Đánh giá hội đồng</h3>
              {Object.entries(data.councils.evaluationsByDecision).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(data.councils.evaluationsByDecision).map(([decision, count]) => (
                    <div key={decision} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {decision === 'PASS' ? 'Đạt' : decision === 'NEED_REVISION' ? 'Cần sửa' : 'Không đạt'}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Đơn gia hạn</h3>
              {Object.entries(data.extensions.byStatus).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(data.extensions.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {status === 'PENDING' ? 'Chờ xử lý' : status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-3">Người dùng theo giới tính</h3>
              {Object.entries(data.users.byGender).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(data.users.byGender).map(([gender, count]) => (
                    <div key={gender} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
