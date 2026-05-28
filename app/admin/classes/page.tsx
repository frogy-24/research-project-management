import { ClassManagement } from '@/components/admin/class-management';

export default function AdminClassesPage() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Lớp</h1>
                    <p className="mt-1 text-muted-foreground">
                        Danh sách và thông tin các lớp sinh viên trong toàn hệ thống.
                    </p>
                </div>
            </div>

            <ClassManagement />
        </div>
    );
}
