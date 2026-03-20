import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function AdminDepartmentsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Khoa</h1>
          <p className="mt-1 text-muted-foreground">Danh sách và thông tin các khoa trong hệ thống.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Danh sách Khoa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-center">
              Tính năng Quản lý Khoa đang được phát triển.<br />
              Vui lòng quay lại sau.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
