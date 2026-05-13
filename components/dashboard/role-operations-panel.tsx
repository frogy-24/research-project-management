"use client";
import { ProgressReportPanel } from "@/components/projects/progress-report-panel";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Role } from "@/types/user.schema";
import { useProjects } from "@/hooks/useProjects";
import { useAuthSession } from "@/hooks/useAuth";
import {
  useCouncilEvaluations,
  useCreateCouncilEvaluation,
  useCreateDisbursement,
  useCreateExtensionRequest,
  useCreateProgressReport,
  useDisbursements,
  useExtensionRequests,
  useProgressReports,
  useReviewExtensionRequest,
} from "@/hooks/useProjectOperations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressReportManager } from "@/components/projects/progress-report-manager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type RoleOperationsPanelProps = {
  role: Role;
};

export function RoleOperationsPanel({ role }: RoleOperationsPanelProps) {
  const { data: projects = [] } = useProjects();
  const { data: session } = useAuthSession();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const [periodLabel, setPeriodLabel] = useState("");
  const [progressSummary, setProgressSummary] = useState("");
  const [progressFileUrl, setProgressFileUrl] = useState("");

  const [requestedMonths, setRequestedMonths] = useState("1");
  const [extensionReason, setExtensionReason] = useState("");

  const [evaluationScore, setEvaluationScore] = useState("0");
  const [evaluationDecision, setEvaluationDecision] = useState<
    "PASS" | "NEED_REVISION" | "FAIL"
  >("PASS");
  const [evaluationComment, setEvaluationComment] = useState("");

  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [voucherFileUrl, setVoucherFileUrl] = useState("");

  const visibleProjects = useMemo(() => {
    if (role === "LECTURER") {
      return projects.filter((project) => project.leaderId === session?.userId);
    }

    return projects;
  }, [projects, role, session?.userId]);

  const progressReportsQuery = useProgressReports(selectedProjectId);
  const extensionRequestsQuery = useExtensionRequests(selectedProjectId);
  const councilEvaluationsQuery = useCouncilEvaluations(selectedProjectId);
  const disbursementsQuery = useDisbursements(selectedProjectId);

  const createProgressReport = useCreateProgressReport();
  const createExtensionRequest = useCreateExtensionRequest();
  const reviewExtensionRequest = useReviewExtensionRequest(selectedProjectId);
  const createCouncilEvaluation = useCreateCouncilEvaluation();
  const createDisbursement = useCreateDisbursement();

  const handleCreateProgressReport = () => {
    if (!selectedProjectId) {
      toast.error("Vui lòng chọn đề tài");
      return;
    }

    createProgressReport.mutate(
      {
        projectId: selectedProjectId,
        payload: {
          periodLabel,
          summary: progressSummary,
          fileUrl: progressFileUrl.trim() ? progressFileUrl : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã nộp báo cáo tiến độ");
          setPeriodLabel("");
          setProgressSummary("");
          setProgressFileUrl("");
        },
        onError: () => {
          toast.error("Không thể nộp báo cáo tiến độ");
        },
      },
    );
  };

  const handleCreateExtensionRequest = () => {
    if (!selectedProjectId) {
      toast.error("Vui lòng chọn đề tài");
      return;
    }

    createExtensionRequest.mutate(
      {
        projectId: selectedProjectId,
        payload: {
          requestedMonths: Number(requestedMonths),
          reason: extensionReason,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi yêu cầu gia hạn");
          setRequestedMonths("1");
          setExtensionReason("");
        },
        onError: () => {
          toast.error("Không thể gửi yêu cầu gia hạn");
        },
      },
    );
  };

  const handleCreateCouncilEvaluation = () => {
    if (!selectedProjectId) {
      toast.error("Vui lòng chọn đề tài");
      return;
    }

    createCouncilEvaluation.mutate(
      {
        projectId: selectedProjectId,
        payload: {
          score: Number(evaluationScore),
          decision: evaluationDecision,
          comment: evaluationComment.trim() ? evaluationComment : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi nhận phiếu đánh giá");
          setEvaluationScore("0");
          setEvaluationDecision("PASS");
          setEvaluationComment("");
        },
        onError: () => {
          toast.error("Không thể gửi phiếu đánh giá");
        },
      },
    );
  };

  const handleCreateDisbursement = () => {
    if (!selectedProjectId) {
      toast.error("Vui lòng chọn đề tài");
      return;
    }

    createDisbursement.mutate(
      {
        projectId: selectedProjectId,
        payload: {
          projectId: selectedProjectId,
          amount: Number(disbursementAmount),
          disbursedAt: new Date(disbursementDate),
          voucherNo: voucherNo.trim() || undefined,
          voucherFileUrl: voucherFileUrl.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật giải ngân");
          setDisbursementAmount("");
          setDisbursementDate("");
          setVoucherNo("");
          setVoucherFileUrl("");
        },
        onError: () => {
          toast.error("Không thể cập nhật giải ngân");
        },
      },
    );
  };

  const handleReviewExtension = (
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    reviewExtensionRequest.mutate(
      {
        requestId,
        payload: { status },
      },
      {
        onSuccess: () => {
          toast.success("Đã xử lý yêu cầu gia hạn");
        },
        onError: () => {
          toast.error("Không thể xử lý yêu cầu gia hạn");
        },
      },
    );
  };

  const projectCount = projects.length;
  const inProgressCount = projects.filter(
    (project) => project.status === "IN_PROGRESS",
  ).length;
  const completedCount = projects.filter(
    (project) => project.status === "COMPLETED",
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nghiệp vụ mở rộng theo vai trò</CardTitle>
        <CardDescription>
          Thao tác nghiệp vụ chuyên sâu cho đồ án tốt nghiệp URMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Đề tài áp dụng</Label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn đề tài" />
            </SelectTrigger>
            <SelectContent>
              {visibleProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {role === "LECTURER" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nộp báo cáo tiến độ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Kỳ báo cáo (VD: Quý 1/2026)"
                  value={periodLabel}
                  onChange={(event) => setPeriodLabel(event.target.value)}
                />
                <Textarea
                  placeholder="Nội dung tiến độ"
                  value={progressSummary}
                  onChange={(event) => setProgressSummary(event.target.value)}
                />
                <Input
                  placeholder="Link file báo cáo (https://...)"
                  value={progressFileUrl}
                  onChange={(event) => setProgressFileUrl(event.target.value)}
                />
                <Button
                  onClick={handleCreateProgressReport}
                  disabled={createProgressReport.isPending}
                >
                  Gửi báo cáo tiến độ
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gửi yêu cầu gia hạn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  placeholder="Số tháng xin gia hạn"
                  value={requestedMonths}
                  onChange={(event) => setRequestedMonths(event.target.value)}
                />
                <Textarea
                  placeholder="Lý do gia hạn"
                  value={extensionReason}
                  onChange={(event) => setExtensionReason(event.target.value)}
                />
                <Button
                  onClick={handleCreateExtensionRequest}
                  disabled={createExtensionRequest.isPending}
                >
                  Gửi yêu cầu gia hạn
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  Lịch sử báo cáo và gia hạn
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Báo cáo tiến độ</p>
                  <div className="space-y-2">
                    {(progressReportsQuery.data ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <p className="font-medium">{item.periodLabel}</p>
                        <p className="text-muted-foreground">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Yêu cầu gia hạn</p>
                  <div className="space-y-2">
                    {(extensionRequestsQuery.data ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {item.requestedMonths} tháng
                          </p>
                          <p className="text-muted-foreground">{item.reason}</p>
                        </div>
                        <Badge
                          variant={
                            item.status === "APPROVED"
                              ? "default"
                              : item.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        

        {role === "COUNCIL" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chấm điểm hội đồng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Điểm số"
                  value={evaluationScore}
                  onChange={(event) => setEvaluationScore(event.target.value)}
                />
                <Select
                  value={evaluationDecision}
                  onValueChange={(value) =>
                    setEvaluationDecision(
                      value as "PASS" | "NEED_REVISION" | "FAIL",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kết luận" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">PASS</SelectItem>
                    <SelectItem value="NEED_REVISION">NEED_REVISION</SelectItem>
                    <SelectItem value="FAIL">FAIL</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Nhận xét hội đồng"
                  value={evaluationComment}
                  onChange={(event) => setEvaluationComment(event.target.value)}
                />
                <Button
                  onClick={handleCreateCouncilEvaluation}
                  disabled={createCouncilEvaluation.isPending}
                >
                  Gửi phiếu chấm
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phiếu đánh giá đã nộp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(councilEvaluationsQuery.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      Điểm: {item.score} - {item.decision}
                    </p>
                    <p className="text-muted-foreground">
                      {item.comment ?? "Không có nhận xét"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}

        

        {role === "ADMIN" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cập nhật giải ngân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="Số tiền giải ngân"
                  value={disbursementAmount}
                  onChange={(event) =>
                    setDisbursementAmount(event.target.value)
                  }
                />
                <Input
                  type="date"
                  value={disbursementDate}
                  onChange={(event) => setDisbursementDate(event.target.value)}
                />
                <Input
                  placeholder="Số chứng từ"
                  value={voucherNo}
                  onChange={(event) => setVoucherNo(event.target.value)}
                />
                <Input
                  placeholder="Link chứng từ"
                  value={voucherFileUrl}
                  onChange={(event) => setVoucherFileUrl(event.target.value)}
                />
                <Button
                  onClick={handleCreateDisbursement}
                  disabled={createDisbursement.isPending}
                >
                  Lưu giải ngân
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danh sách giải ngân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(disbursementsQuery.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {Number(item.amount).toLocaleString("vi-VN")} VND
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(item.disbursedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Duyệt yêu cầu gia hạn</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời lượng</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(extensionRequestsQuery.data ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.requestedMonths} tháng</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>
                          {item.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleReviewExtension(item.id, "APPROVED")
                                }
                                disabled={reviewExtensionRequest.isPending}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleReviewExtension(item.id, "REJECTED")
                                }
                                disabled={reviewExtensionRequest.isPending}
                              >
                                Từ chối
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant={
                                item.status === "APPROVED"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {item.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}

        

        {role === "DEAN" || role === "LEADER" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Tổng đề tài</p>
                <p className="text-2xl font-semibold">{projectCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Đang thực hiện</p>
                <p className="text-2xl font-semibold">{inProgressCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
                <p className="text-2xl font-semibold">{completedCount}</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground mb-2">Báo cáo</p>
                <Button asChild variant="outline">
                  <a href="/dean/reports">Quản lý báo cáo</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        

        

        {selectedProjectId && (
          <div className="mt-8 border-t pt-8">
            <h3 className="mb-4 text-xl font-semibold">Cổng thông tin báo cáo & Tiến độ</h3>
            <ProgressReportPanel projectId={selectedProjectId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
