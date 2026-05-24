// app/admin/disbursements/approvals/page.tsx
import { Metadata } from 'next';
import { DeanDisbursementManagement } from '@/components/disbursements/dean-disbursement-management';

export const metadata: Metadata = {
  title: 'Phê duyệt Giải ngân | Admin',
  description: 'Phê duyệt yêu cầu giải ngân từ Dean',
};

export default function AdminDisbursementApprovalsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Phê duyệt Giải ngân</h1>
        <p className="text-muted-foreground mt-2">
          Xem xét và phê duyệt các yêu cầu giải ngân từ Trưởng khoa
        </p>
      </div>

      <DeanDisbursementManagement approvalOnly actorRole="ADMIN" />
    </div>
  );
}
