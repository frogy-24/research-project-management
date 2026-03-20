"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMe, useUpdateMe } from "@/hooks/useMe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Gender } from "@/types/user.schema";

type ProfilePageProps = {
  title: string;
};

export function ProfilePage({ title }: ProfilePageProps) {
  const { data: me, isLoading } = useMe();
  const updateMeMutation = useUpdateMe();

  const initialForm = useMemo(
    () => ({
      code: me?.code ?? "",
      name: me?.name ?? "",
      dateOfBirth: me?.dateOfBirth
        ? new Date(me.dateOfBirth).toISOString().slice(0, 10)
        : "",
      gender: (me?.gender ?? "") as Gender | "",
      phone: me?.phone ?? "",
      address: me?.address ?? "",
      department: me?.department ?? "",
    }),
    [me]
  );

  const [draftForm, setDraftForm] = useState<typeof initialForm | null>(null);
  const form = draftForm ?? initialForm;

  const updateDraft = (
    updater: (current: typeof initialForm) => typeof initialForm
  ) => {
    setDraftForm((prev) => updater(prev ?? initialForm));
  };

  const handleSubmit = () => {
    updateMeMutation.mutate(
      {
        code: form.code.trim() ? form.code.trim() : null,
        name: form.name,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : null,
        gender: form.gender || null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        address: form.address.trim() ? form.address.trim() : null,
        department: form.department.trim() ? form.department.trim() : null,
      },
      {
        onSuccess: () => {
          toast.success("Đã lưu thông tin hồ sơ");
          setDraftForm(null);
        },
        onError: () => {
          toast.error("Không thể lưu thông tin");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 bg-primary/20 rounded-full animate-bounce" />
          <p className="text-muted-foreground text-sm">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {title}
        </h1>
        <p className="text-muted-foreground">
          Quản lý thông tin định danh và liên hệ nội bộ.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
          <CardDescription>
            Được dùng để hiển thị trên các văn bản thuyết minh, nghiệm thu.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Mã sinh viên/Giảng viên</Label>
            <Input
              value={form.code}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, code: e.target.value }))
              }
              placeholder="VD: GV001"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Họ và tên</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, name: e.target.value }))
              }
              placeholder="Nguyễn Văn A"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Ngày sinh</Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, dateOfBirth: e.target.value }))
              }
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Giới tính</Label>
            <Select
              value={form.gender}
              onValueChange={(val) =>
                updateDraft((c) => ({ ...c, gender: val as Gender }))
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Chưa xác định" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Nam</SelectItem>
                <SelectItem value="FEMALE">Nữ</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Đơn vị / Khoa</Label>
            <Input
              value={form.department}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, department: e.target.value }))
              }
              placeholder="VD: Khoa CNTT"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Số điện thoại</Label>
            <Input
              value={form.phone}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, phone: e.target.value }))
              }
              placeholder="09xx..."
              className="bg-background"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground">Địa chỉ liên hệ</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                updateDraft((c) => ({ ...c, address: e.target.value }))
              }
              placeholder="Số nhà, đường, phường, xã..."
              className="bg-background"
            />
          </div>
        </CardContent>
        <div className="border-t bg-muted/20 p-4 px-6 flex justify-end">
           <Button
             onClick={handleSubmit}
             disabled={updateMeMutation.isPending}
             className="min-w-32"
           >
             {updateMeMutation.isPending ? "Đang xử lý..." : "Lưu thay đổi"}
           </Button>
        </div>
      </Card>
    </div>
  );
}
