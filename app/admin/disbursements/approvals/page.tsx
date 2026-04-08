// app/admin/disbursements/approvals/page.tsx
import { Metadata } from 'next';

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

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Trang phê duyệt giải ngân đang được phát triển...
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Chức năng: Danh sách yêu cầu chờ duyệt, phê duyệt/từ chối giải ngân
        </p>
      </div>
    </div>
  );
}
