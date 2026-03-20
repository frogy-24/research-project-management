"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthSession, useLoginAsRole } from "@/hooks/useAuth";
import { getDashboardRoute } from "@/lib/role-routes";
import { RoleEnum, type Role } from "@/types/user.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roleLabel: Record<Role, string> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  DEAN: "Trưởng khoa",
  ADMIN: "Phòng QLKH",
  COUNCIL: "Hội đồng",
  LEADER: "Ban giám hiệu",
};

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>("LECTURER");
  const router = useRouter();

  const { data: session, isLoading: isSessionLoading } = useAuthSession();
  const loginMutation = useLoginAsRole();

  useEffect(() => {
    if (session?.role) {
      router.replace(getDashboardRoute(session.role));
    }
  }, [router, session?.role]);

  const handleLogin = () => {
    loginMutation.mutate(selectedRole, {
      onSuccess: () => {
        toast.success(`Đăng nhập vai trò ${roleLabel[selectedRole]} thành công`);
        router.replace(getDashboardRoute(selectedRole));
      },
      onError: () => {
        toast.error("Không thể đăng nhập");
      },
    });
  };

  return (
    <main className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập hệ thống URMS</CardTitle>
          <CardDescription>Chọn vai trò để vào đúng phân hệ nghiệp vụ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {RoleEnum.options.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loginMutation.isPending || isSessionLoading}
          >
            {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
