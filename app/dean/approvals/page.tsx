import { AppShell } from "@/components/layout/app-shell";
import { DeanApprovalClient } from "@/components/projects/dean-approval-client";

export default function DeanApprovalsPage() {
  return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Duyệt đề tài cấp Khoa</h1>
          <p className="text-muted-foreground mt-2">
            Xem và đánh giá các thuyết minh đề tài từ sinh viên, giảng viên thuộc Khoa.
          </p>
        </div>
        <DeanApprovalClient />
      </div>
  );
}
