import { ProgressPageClient } from "@/components/projects/progress-page-client";

export default function StudentProgressPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Báo cáo tiến độ cá nhân</h1>
      <ProgressPageClient filterType="LEADER" />
    </div>
  );
}
