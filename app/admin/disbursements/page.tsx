// app/admin/disbursements/page.tsx
import { Metadata } from 'next';
import { DeanDisbursementManagement } from '@/components/disbursements/dean-disbursement-management';

export const metadata: Metadata = {
  title: 'Quản lý Giải ngân | Admin',
  description: 'Quản lý tất cả giải ngân trong hệ thống',
};

export default function AdminDisbursementsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Giải ngân</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý tất cả giải ngân trong hệ thống, tạo giải ngân cho đợt đăng ký do Admin tạo
        </p>
      </div>

      <DeanDisbursementManagement />
    </div>
  );
}
