// app/admin/disbursements/page.tsx
import { Metadata } from 'next';

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

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Trang quản lý giải ngân đang được phát triển...
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Chức năng: Xem tất cả giải ngân, tạo giải ngân mới, thống kê
        </p>
      </div>
    </div>
  );
}
