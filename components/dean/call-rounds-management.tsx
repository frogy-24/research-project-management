"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCallRounds } from "@/hooks/useCallRounds";
import { useAuthSession } from "@/hooks/useAuth";
import { callRoundsApi } from "@/api/call-rounds";
import type { CallRound } from "@/types/call-round.schema";

type CallRoundFormData = {
  name: string;
  description: string;
  registrationStartDate: string;
  registrationEndDate: string;
  projectStartDate: string;
  projectEndDate: string;
  maxProjects: string;
  requirements: string;
};

const initialFormData: CallRoundFormData = {
  name: "",
  description: "",
  registrationStartDate: "",
  registrationEndDate: "",
  projectStartDate: "",
  projectEndDate: "",
  maxProjects: "",
  requirements: "",
};

export function DeanCallRoundsManagement() {
  const { data: callRounds, isLoading, refetch } = useCallRounds();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [editingCallRound, setEditingCallRound] = React.useState<CallRound | null>(null);
  const [deletingCallRound, setDeletingCallRound] = React.useState<CallRound | null>(null);
  const [formData, setFormData] = React.useState<CallRoundFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // API đã filter sẵn: DEAN chỉ thấy đợt mình tạo, ADMIN thấy tất cả
  const deanCallRounds = callRounds || [];

  const handleOpenDialog = (callRound?: CallRound) => {
    if (callRound) {
      setEditingCallRound(callRound);
      setFormData({
        name: callRound.name,
        description: callRound.description || "",
        registrationStartDate: new Date(callRound.registrationStartDate).toISOString().slice(0, 16),
        registrationEndDate: new Date(callRound.registrationEndDate).toISOString().slice(0, 16),
        projectStartDate: callRound.projectStartDate
          ? new Date(callRound.projectStartDate).toISOString().slice(0, 16)
          : "",
        projectEndDate: callRound.projectEndDate
          ? new Date(callRound.projectEndDate).toISOString().slice(0, 16)
          : "",
        maxProjects: callRound.maxProjects?.toString() || "",
        requirements: callRound.requirements || "",
      });
    } else {
      setEditingCallRound(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCallRound(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        registrationStartDate: new Date(formData.registrationStartDate),
        registrationEndDate: new Date(formData.registrationEndDate),
        startDate: new Date(formData.registrationStartDate),
        endDate: new Date(formData.registrationEndDate),
        projectStartDate: formData.projectStartDate
          ? new Date(formData.projectStartDate)
          : undefined,
        projectEndDate: formData.projectEndDate
          ? new Date(formData.projectEndDate)
          : undefined,
        maxProjects: formData.maxProjects ? parseInt(formData.maxProjects) : undefined,
        requirements: formData.requirements || undefined,
        isActive: true,
        isLocked: false,
      };

      if (editingCallRound) {
        await callRoundsApi.update({ id: editingCallRound.id, ...payload });
        toast.success("Cập nhật đợt đăng ký thành công!");
      } else {
        await callRoundsApi.create(payload);
        toast.success("Tạo đợt đăng ký thành công! Đang chờ Admin phê duyệt.");
      }

      await refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Có lỗi xảy ra!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCallRound) return;
    setIsSubmitting(true);

    try {
      await callRoundsApi.delete(deletingCallRound.id);
      toast.success("Xóa đợt đăng ký thành công!");
      await refetch();
      setIsDeleteDialogOpen(false);
      setDeletingCallRound(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Không thể xóa đợt đăng ký!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (callRound: CallRound) => {
    if (callRound.approvalStatus === "PENDING_APPROVAL") {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Chờ duyệt
        </Badge>
      );
    }
    if (callRound.approvalStatus === "APPROVED") {
      return (
        <Badge variant="default" className="gap-1 bg-emerald-500">
          <CheckCircle className="h-3 w-3" />
          Đã duyệt
        </Badge>
      );
    }
    if (callRound.approvalStatus === "REJECTED") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Bị từ chối
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Đợt Đăng Ký</h1>
          <p className="text-muted-foreground mt-1">
            Tạo và quản lý các đợt đăng ký đề tài của khoa
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo đợt mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đợt đăng ký</CardTitle>
          <CardDescription>
            Các đợt đăng ký do bạn tạo cần được Admin phê duyệt trước khi kích hoạt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đợt</TableHead>
                <TableHead>Thời gian đăng ký</TableHead>
                <TableHead>Thời gian thực hiện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deanCallRounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Chưa có đợt đăng ký nào
                  </TableCell>
                </TableRow>
              ) : (
                deanCallRounds.map((callRound) => (
                  <TableRow key={callRound.id}>
                    <TableCell className="font-medium">{callRound.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {new Date(callRound.registrationStartDate).toLocaleDateString("vi-VN")}
                        </div>
                        <div className="text-muted-foreground">
                          đến {new Date(callRound.registrationEndDate).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {callRound.projectStartDate && callRound.projectEndDate ? (
                        <div className="text-sm">
                          <div>{new Date(callRound.projectStartDate).toLocaleDateString("vi-VN")}</div>
                          <div className="text-muted-foreground">
                            đến {new Date(callRound.projectEndDate).toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Chưa xác định</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(callRound)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(callRound)}
                          disabled={callRound.approvalStatus === "APPROVED"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingCallRound(callRound);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={callRound.approvalStatus === "APPROVED"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCallRound ? "Chỉnh sửa đợt đăng ký" : "Tạo đợt đăng ký mới"}
            </DialogTitle>
            <DialogDescription>
              {editingCallRound
                ? "Cập nhật thông tin đợt đăng ký"
                : "Đợt đăng ký sẽ được gửi đến Admin để phê duyệt"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên đợt đăng ký *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Đợt đăng ký đề tài Khoa CNTT - Học kỳ 1/2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết về đợt đăng ký..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registrationStartDate">Ngày bắt đầu đăng ký *</Label>
                <Input
                  id="registrationStartDate"
                  type="datetime-local"
                  value={formData.registrationStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, registrationStartDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationEndDate">Ngày kết thúc đăng ký *</Label>
                <Input
                  id="registrationEndDate"
                  type="datetime-local"
                  value={formData.registrationEndDate}
                  onChange={(e) =>
                    setFormData({ ...formData, registrationEndDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectStartDate">Ngày bắt đầu thực hiện</Label>
                <Input
                  id="projectStartDate"
                  type="datetime-local"
                  value={formData.projectStartDate}
                  onChange={(e) => setFormData({ ...formData, projectStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectEndDate">Ngày kết thúc thực hiện</Label>
                <Input
                  id="projectEndDate"
                  type="datetime-local"
                  value={formData.projectEndDate}
                  onChange={(e) => setFormData({ ...formData, projectEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxProjects">Số lượng đề tài tối đa</Label>
              <Input
                id="maxProjects"
                type="number"
                min="1"
                value={formData.maxProjects}
                onChange={(e) => setFormData({ ...formData, maxProjects: e.target.value })}
                placeholder="Để trống nếu không giới hạn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Yêu cầu & Điều kiện</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Các yêu cầu, điều kiện đăng ký..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang xử lý..." : editingCallRound ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa đợt đăng ký "{deletingCallRound?.name}"? Hành động này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCallRound(null);
              }}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
