import { InstructorReviewProgressClient } from "@/components/projects/instructor-review-progress-client";

export default function ReviewProgressPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Xem báo cáo sinh viên</h1>
        <p className="text-muted-foreground">
          Chọn đề tài để xem chi tiết báo cáo tiến độ, đánh giá và nhận xét của sinh viên.
        </p>
      </div>
      
      <InstructorReviewProgressClient />
    </div>
  );
}
