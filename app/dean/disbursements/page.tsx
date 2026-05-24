// app/dean/disbursements/page.tsx
import { Metadata } from 'next';
import { DeanDisbursementManagement } from '@/components/disbursements/dean-disbursement-management';

export const metadata: Metadata = {
  title: 'Quản lý Giải ngân | Dean',
  description: 'Quản lý giải ngân đề tài',
};

export default function DeanDisbursementsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Giải ngân</h1>
        <p className="text-muted-foreground mt-2">
          Tạo và quản lý yêu cầu giải ngân cho các đề tài thuộc đợt đăng ký do bạn tạo
        </p>
      </div>

      <DeanDisbursementManagement />
    </div>
  );
}
