import { Metadata } from 'next';
import { DisburserDisbursementProcessing } from '@/components/disbursements/disburser-disbursement-processing';

export const metadata: Metadata = {
  title: 'Xử lý giải ngân | Thủ quỹ',
  description: 'Xem danh sách giải ngân và xác nhận thanh toán',
};

export default function DisbursementProcessingPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Xử lý giải ngân</h1>
        <p className="mt-2 text-muted-foreground">
          Hiển thị tất cả giải ngân và xác nhận thanh toán kèm tài liệu liên quan.
        </p>
      </div>

      <DisburserDisbursementProcessing />
    </div>
  );
}
