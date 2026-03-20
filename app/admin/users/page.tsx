import { UserManagement } from "@/components/admin/user-management";

export default function AdminUsersPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Người dùng</h1>
          <p className="mt-1 text-muted-foreground">Quản lý tài khoản sinh viên, giảng viên và cán bộ.</p>
        </div>
      </div>

      <UserManagement />
    </div>
  );
}
