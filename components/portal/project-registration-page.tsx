"use client";

import React, { useState } from "react";
import { toast } from "sonner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useCancelMyProjectRegistration,
  useCreateMyProjectRegistration,
  useMyProjectRegistrations,
} from "@/hooks/useMyProjectRegistrations";
import { FileText, MonitorX, PlusCircle, CalendarClock, AlertCircle } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useAuthSession } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCallRounds } from "@/hooks/useCallRounds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CallRoundWithTemplate } from "@/types/call-round.schema";

type ProjectRegistrationPageProps = {
  title: string;
};

const statusLabel: Record<string, string> = {
  PENDING: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  CANCELED: "Đã hủy",
  REJECTED: "Bị từ chối",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  CANCELED: "outline",
  REJECTED: "destructive",
};

export function ProjectRegistrationPage({ title }: ProjectRegistrationPageProps) {
  const [projectTitle, setProjectTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>("");
  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];
  const { data: session } = useAuthSession();
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  
  const { data: registrations = [], isLoading } = useMyProjectRegistrations();
  const { data: callRounds = [] } = useCallRounds();
  const createMutation = useCreateMyProjectRegistration();
  const cancelMutation = useCancelMyProjectRegistration();

  // Filter call rounds that are currently open for registration
  const availableCallRounds = React.useMemo(() => {
    const now = new Date();
    return (callRounds as CallRoundWithTemplate[]).filter((round) => {
      if (!round.isActive) return false;
      const start = new Date(round.registrationStartDate);
      const end = new Date(round.registrationEndDate);
      return now >= start && now <= end;
    });
  }, [callRounds]);

  // Auto-select if only one available, or find selected
  const activeCallRound = React.useMemo(() => {
    if (availableCallRounds.length === 0) return undefined;
    if (availableCallRounds.length === 1) return availableCallRounds[0];
    return availableCallRounds.find((r) => r.id === selectedCallRoundId) ?? undefined;
  }, [availableCallRounds, selectedCallRoundId]);

  // Auto-select when only one round available
  React.useEffect(() => {
    if (availableCallRounds.length === 1 && selectedCallRoundId !== availableCallRounds[0].id) {
      setSelectedCallRoundId(availableCallRounds[0].id);
    }
  }, [availableCallRounds, selectedCallRoundId]);

  const sortedRegistrations = React.useMemo(() => {
    return [...registrations].sort((a, b) => {
      const aConfirmed = a.status === "APPROVED" || a.instructorStatus === "ACCEPTED";
      const bConfirmed = b.status === "APPROVED" || b.instructorStatus === "ACCEPTED";
      if (aConfirmed && !bConfirmed) return -1;
      if (!aConfirmed && bConfirmed) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [registrations]);

  const handleCreate = () => {
    if (!activeCallRound) {
      toast.error("Vui lòng chọn đợt đăng ký");
      return;
    }
    if (!projectTitle.trim()) {
      toast.error("Vui lòng nhập tên đề tài");
      return;
    }
    if (!objective.trim()) {
      toast.error("Vui lòng nhập mục tiêu nghiên cứu");
      return;
    }

    createMutation.mutate(
      {
        title: projectTitle,
        objective,
        expectedOutput: expectedOutput.trim() ? expectedOutput : null,
        instructorId: instructorId && instructorId !== "none" ? instructorId : undefined,
        callRoundId: activeCallRound.id,
      },
      {
        onSuccess: () => {
          toast.success("Đăng ký đề tài thành công");
          setProjectTitle("");
          setObjective("");
          setExpectedOutput("");
          setInstructorId("");
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : "Không thể đăng ký đề tài";
          toast.error(msg);
        },
      }
    );
  };

  const handleCancel = (id: string) => {
    const cancelReason = cancelReasonById[id]?.trim();

    if (!cancelReason) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }

    cancelMutation.mutate(
      { id, payload: { cancelReason } },
      {
        onSuccess: () => {
          toast.success("Đã hủy đăng ký đề tài");
          setCancelReasonById((prev) => ({ ...prev, [id]: "" }));
        },
        onError: () => {
          toast.error("Không thể hủy đăng ký đề tài");
        },
      }
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {title}
        </h1>
        <p className="text-muted-foreground">
          Quản lý các đề xuất và thuyết minh nghiên cứu khoa học.
        </p>
      </div>

      {/* Call Round Status */}
      {availableCallRounds.length === 0 ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chưa mở đợt đăng ký</AlertTitle>
          <AlertDescription>
            Hiện tại chưa có đợt đăng ký nào đang mở. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.
          </AlertDescription>
        </Alert>
      ) : availableCallRounds.length > 1 ? (
        <Alert className="border-primary/50 bg-primary/5">
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>Có {availableCallRounds.length} đợt đăng ký đang mở</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {availableCallRounds.map((round) => (
                <div key={round.id} className="text-xs">
                  <strong>{round.name}</strong>: {new Date(round.registrationStartDate).toLocaleDateString("vi-VN")} – {new Date(round.registrationEndDate).toLocaleDateString("vi-VN")}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-primary/50 bg-primary/5">
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>Đợt đăng ký hiện tại: {availableCallRounds[0].name}</AlertTitle>
          <AlertDescription>
            Thời gian đăng ký: {new Date(availableCallRounds[0].registrationStartDate).toLocaleDateString("vi-VN")} –{" "}
            {new Date(availableCallRounds[0].registrationEndDate).toLocaleDateString("vi-VN")}
            {availableCallRounds[0].template && (
              <span className="block mt-1 text-xs">
                Template tiến độ: {availableCallRounds[0].template.name}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
           <Card className="border-border/50 shadow-sm sticky top-6">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Đăng ký đề tài mới
              </CardTitle>
              <CardDescription>
                Điền thông tin cơ bản để đề xuất thuyết minh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {/* Call Round Selector - only shown when multiple available */}
              {availableCallRounds.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Chọn đợt đăng ký <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="-- Chọn đợt đăng ký --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCallRounds.map((round) => (
                        <SelectItem key={round.id} value={round.id}>
                          <div className="flex flex-col">
                            <span>{round.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(round.registrationStartDate).toLocaleDateString("vi-VN")} – {new Date(round.registrationEndDate).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!activeCallRound && selectedCallRoundId === "" && (
                    <p className="text-xs text-muted-foreground">Vui lòng chọn đợt đăng ký để tiếp tục.</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Tên đề tài <span className="text-destructive">*</span></Label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Nhập tên đề tài nghiên cứu..."
                  className="bg-background"
                  disabled={!activeCallRound}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Mục tiêu <span className="text-destructive">*</span></Label>
                <Textarea 
                  value={objective} 
                  onChange={(e) => setObjective(e.target.value)} 
                  placeholder="Mục tiêu chính của nghiên cứu là gì?"
                  className="min-h-24 bg-background"
                  disabled={!activeCallRound}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Sản phẩm dự kiến</Label>
                <Textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Ví dụ: 01 bài báo ISI, 01 phần mềm..."
                  className="min-h-20 bg-background"
                  disabled={!activeCallRound}
                />
              </div>

                            <div className="space-y-2">
                <Label className="text-muted-foreground">Người hướng dẫn</Label>
                <Select value={instructorId} onValueChange={setInstructorId} disabled={!activeCallRound}>
                  <SelectTrigger>
                     <SelectValue placeholder="Chọn người hướng dẫn (Tùy chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Không có --</SelectItem>
                    {users.filter(u => u.role !== "STUDENT" && u.id !== session?.userId).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} - {u.role === "LECTURER" ? "Giảng viên" : "Cán bộ"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending || !activeCallRound} 
                className="w-full"
              >
                {!activeCallRound 
                  ? "Chưa mở đợt đăng ký" 
                  : createMutation.isPending 
                  ? "Đang xử lý..." 
                  : "Gửi đăng ký"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
           <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lịch sử đề xuất
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">
                  Đang tải danh sách...
                </div>
              ) : registrations.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                   <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                     <MonitorX className="h-6 w-6 text-muted-foreground" />
                   </div>
                   <p className="text-muted-foreground font-medium">Chưa có đề tài nào được đăng ký.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40%] pl-6">Nội dung đề xuất</TableHead><TableHead>Người HD</TableHead><TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRegistrations.map((item) => (
                        <TableRow key={item.id} className="group">
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col gap-1">
                              <p className="font-semibold text-primary leading-tight hover:underline cursor-pointer">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <span>{item.title}</span>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Chi tiết đề xuất nghiên cứu</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Tên đề tài</h4>
                                        <p className="text-sm font-medium">{item.title}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Mục tiêu</h4>
                                        <p className="text-sm whitespace-pre-wrap">{item.objective || "Chưa có thông tin"}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Sản phẩm dự kiến</h4>
                                        <p className="text-sm whitespace-pre-wrap">{item.expectedOutput || "Chưa có thông tin"}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Người hướng dẫn</h4>
                                        <p className="text-sm">
                                          {item.instructor ? item.instructor.name : "Không có"}
                                          {item.instructor && (
                                            <Badge variant="outline" className="ml-2">
                                              {item.instructorStatus === "ACCEPTED" ? "Đã đồng ý" 
                                               : item.instructorStatus === "REJECTED" ? "Từ chối" 
                                               : "Chờ xác nhận"}
                                            </Badge>
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Trạng thái duyệt cấp khoa</h4>
                                        <Badge variant={statusVariant[item.status] || "default"}>
                                          {statusLabel[item.status] ?? item.status}
                                        </Badge>
                                      </div>
                                      {item.cancelReason && (
                                        <div>
                                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Lý do hủy/từ chối</h4>
                                          <p className="text-sm text-destructive">{item.cancelReason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.objective}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                             <Badge variant={statusVariant[item.status] || "default"}>
                               {statusLabel[item.status] ?? item.status}
                             </Badge>
                             {item.status !== "PENDING" && item.cancelReason && (
                               <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                                 Lý do: {item.cancelReason}
                               </p>
                             )}
                          </TableCell>
                          <TableCell className="pr-6 align-top">
                            {item.status === "PENDING" && item.instructorStatus !== "ACCEPTED" ? (
                              <div className="flex flex-col gap-2 w-max">
                                <Input
                                  size={1}
                                  className="h-8 text-xs bg-background"
                                  value={cancelReasonById[item.id] ?? ""}
                                  onChange={(e) => setCancelReasonById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  placeholder="Lý do hủy..."
                                />
                                <Button
                                  variant="outline"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 self-end"
                                  size="sm"
                                  onClick={() => handleCancel(item.id)}
                                  disabled={cancelMutation.isPending}
                                >
                                  Hủy đăng ký
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
