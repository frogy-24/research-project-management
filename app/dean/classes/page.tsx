import { ClassManagement } from "@/components/dean/class-management";

export default function DeanClassesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Lớp học</h1>
          <p className="mt-1 text-muted-foreground">Quản lý danh sách lớp học trong khoa.</p>
        </div>
      </div>

      <ClassManagement />
    </div>
  );
}
