import { AppShell } from "@/components/layout/app-shell";
import { GuidancePageClient } from "@/components/projects/guidance-page-client";

export default function LecturerGuidancePage() {
  return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Xác nhận hướng dẫn</h1>
        <GuidancePageClient />
      </div>
  );
}
