'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { StatisticsData } from '@/api/admin-statistics';

const roleLabelMap: Record<string, string> = {
  STUDENT: 'Sinh viên',
  LECTURER: 'Giảng viên',
  DEAN: 'Trưởng khoa',
  ADMIN: 'QLKH',
  COUNCIL: 'Hội đồng',
  LEADER: 'Ban giám hiệu',
};

const statusLabelMap: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  DEAN_APPROVED: 'Khoa duyệt',
  DEAN_REVISION: 'Cần sửa',
  ADMIN_REVIEW: 'Admin xem',
  COUNCIL_EVALUATING: 'Hội đồng đánh giá',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Đình chỉ',
  PENDING: 'Chờ xử lý',
  CANCELED: 'Đã hủy',
};

export function ExportButtons({ data }: { data: StatisticsData }) {
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const overviewSheet = XLSX.utils.aoa_to_sheet([
      ['Chỉ số', 'Giá trị'],
      ['Tổng người dùng', data.overview.totalUsers],
      ['Tổng đề tài', data.overview.totalProjects],
      ['Tổng đăng ký', data.overview.totalRegistrations],
      ['Báo cáo tiến độ', data.overview.totalProgressReports],
      ['Khoa', data.overview.totalDepartments],
      ['Ngành', data.overview.totalMajors],
      ['Lớp học', data.overview.totalClasses],
      ['Đợt đăng ký', data.overview.totalCallRounds],
      ['Đợt đang hoạt động', data.overview.activeCallRounds],
      ['Hội đồng', data.overview.totalCouncils],
    ]);
    XLSX.utils.book_append_sheet(wb, overviewSheet, 'Tổng quan');

    const userRoleSheet = XLSX.utils.aoa_to_sheet(
      [['Vai trò', 'Số lượng'], ...Object.entries(data.users.byRole).map(([k, v]) => [roleLabelMap[k] ?? k, v])]
    );
    XLSX.utils.book_append_sheet(wb, userRoleSheet, 'Người dùng theo vai trò');

    const projectStatusSheet = XLSX.utils.aoa_to_sheet(
      [['Trạng thái', 'Số lượng'], ...Object.entries(data.projects.byStatus).map(([k, v]) => [statusLabelMap[k] ?? k, v])]
    );
    XLSX.utils.book_append_sheet(wb, projectStatusSheet, 'Đề tài theo trạng thái');

    const budgetSheet = XLSX.utils.aoa_to_sheet([
      ['Chỉ số', 'Giá trị (VNĐ)'],
      ['Tổng đề xuất', data.projects.budget.totalRequested],
      ['Tổng duyệt', data.projects.budget.totalApproved],
      ['TB đề xuất', data.projects.budget.avgRequested],
      ['TB duyệt', data.projects.budget.avgApproved],
    ]);
    XLSX.utils.book_append_sheet(wb, budgetSheet, 'Ngân sách');

    const regStatusSheet = XLSX.utils.aoa_to_sheet(
      [['Trạng thái', 'Số lượng'], ...Object.entries(data.registrations.byStatus).map(([k, v]) => [statusLabelMap[k] ?? k, v])]
    );
    XLSX.utils.book_append_sheet(wb, regStatusSheet, 'Đăng ký theo trạng thái');

    const fundingSheet = XLSX.utils.aoa_to_sheet(
      [['Tháng', 'Số tiền (VNĐ)', 'Số giao dịch'], ...data.funding.byMonth.map((m) => [m.month, m.amount, m.count])]
    );
    XLSX.utils.book_append_sheet(wb, fundingSheet, 'Giải ngân');

    const progressSheet = XLSX.utils.aoa_to_sheet([
      ['Chỉ số', 'Giá trị'],
      ['Tổng báo cáo', data.progressReports.total],
      ['Điểm trung bình', data.progressReports.avgScore || 0],
      ['Báo cáo quá hạn', data.progressReports.overdueTotal],
    ]);
    XLSX.utils.book_append_sheet(wb, progressSheet, 'Báo cáo tiến độ');

    XLSX.writeFile(wb, `BaoCaoThongKe_URMS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <Button onClick={exportToExcel} size="sm" className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        Xuất Excel
      </Button>
      <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
        <Printer className="h-4 w-4" />
        In báo cáo
      </Button>
    </div>
  );
}
