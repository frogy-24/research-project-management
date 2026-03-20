import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";

export default function DeanLecturersPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Giảng viên</h1>
          <p className="mt-1 text-muted-foreground">Quản lý danh sách giảng viên trong khoa.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Danh sách Giảng viên thuộc Khoa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[400px] items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-center">
              Tính năng Quản lý Giảng viên đang được phát triển.<br />
              Vui lòng quay lại sau.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
