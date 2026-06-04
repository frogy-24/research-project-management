"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteProject, useProjects, useUpdateProject } from "@/hooks/useProjects";
import type { ProjectStatus } from "@/types/project.schema";
import type { Role } from "@/types/user.schema";
import { toast } from "sonner";

const statusLabel: Record<ProjectStatus, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Đã nộp",
  DEAN_APPROVED: "Khoa đạt",
  DEAN_REVISION: "Khoa yêu cầu sửa",
  ADMIN_REVIEW: "QLKH thẩm định",
  COUNCIL_EVALUATING: "Hội đồng đánh giá",
  APPROVED: "Được duyệt",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  REJECTED: "Không đạt",
  SUSPENDED: "Đình chỉ",
};

const statusVariant: Record<ProjectStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  DEAN_APPROVED: "default",
  DEAN_REVISION: "destructive",
  ADMIN_REVIEW: "secondary",
  COUNCIL_EVALUATING: "secondary",
  APPROVED: "default",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

const normalizeBudget = (value: unknown) => {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
};

type RoleAction = {
  label: string;
  nextStatus: ProjectStatus;
  variant?: "default" | "secondary" | "destructive" | "outline";
};

type DashboardMetric = {
  title: string;
  value: number;
};

type ProjectListProps = {
  currentRole: Role;
};

const roleLabel: Record<Role, string> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  DEAN: "Trưởng khoa",
  ADMIN: "Phòng QLKH",
  COUNCIL: "Hội đồng",
  LEADER: "Ban giám hiệu",
  DISBURSER: "Thủ quỹ",
};

const roleActions: Record<Role, Partial<Record<ProjectStatus, RoleAction[]>>> = {
  STUDENT: {},
  LECTURER: {
    DRAFT: [{ label: "Nộp thuyết minh", nextStatus: "SUBMITTED" }],
    DEAN_REVISION: [{ label: "Nộp lại sau chỉnh sửa", nextStatus: "SUBMITTED" }],
    APPROVED: [{ label: "Bắt đầu thực hiện", nextStatus: "IN_PROGRESS" }],
    IN_PROGRESS: [{ label: "Nộp hồ sơ nghiệm thu", nextStatus: "COMPLETED" }],
  },
  DEAN: {
    SUBMITTED: [
      { label: "Duyệt cấp khoa", nextStatus: "DEAN_APPROVED" },
      { label: "Yêu cầu sửa", nextStatus: "DEAN_REVISION", variant: "destructive" },
    ],
  },
  ADMIN: {
    DEAN_APPROVED: [{ label: "Thẩm định hồ sơ", nextStatus: "ADMIN_REVIEW" }],
    COUNCIL_EVALUATING: [
      { label: "Phê duyệt thực hiện", nextStatus: "APPROVED" },
      { label: "Không phê duyệt", nextStatus: "REJECTED", variant: "destructive" },
    ],
  },
  COUNCIL: {
    ADMIN_REVIEW: [{ label: "Bắt đầu chấm hội đồng", nextStatus: "COUNCIL_EVALUATING" }],
  },
  LEADER: {},
  DISBURSER: {},
};

const getRoleMetrics = (role: Role, statuses: ProjectStatus[]): DashboardMetric[] => {
  const count = (status: ProjectStatus) => statuses.filter((item) => item === status).length;

  switch (role) {
    case "STUDENT":
      return [
        { title: "Đề tài đã đăng ký", value: statuses.length },
        { title: "Đang xử lý", value: count("DRAFT") + count("SUBMITTED") + count("DEAN_REVISION") },
        { title: "Đã phê duyệt", value: count("APPROVED") + count("IN_PROGRESS") + count("COMPLETED") },
      ];
    case "LECTURER":
      return [
        { title: "Đang soạn hồ sơ", value: count("DRAFT") + count("DEAN_REVISION") },
        { title: "Đang thực hiện", value: count("IN_PROGRESS") },
        { title: "Đã hoàn thành", value: count("COMPLETED") },
      ];
    case "DEAN":
      return [
        { title: "Chờ duyệt khoa", value: count("SUBMITTED") },
        { title: "Đã duyệt", value: count("DEAN_APPROVED") },
        { title: "Yêu cầu sửa", value: count("DEAN_REVISION") },
      ];
    case "ADMIN":
      return [
        { title: "Chờ thẩm định", value: count("DEAN_APPROVED") },
        { title: "Đang điều phối", value: count("ADMIN_REVIEW") + count("COUNCIL_EVALUATING") },
        { title: "Đã phê duyệt", value: count("APPROVED") },
      ];
    case "COUNCIL":
      return [
        { title: "Sẵn sàng chấm", value: count("ADMIN_REVIEW") },
        { title: "Đang đánh giá", value: count("COUNCIL_EVALUATING") },
        { title: "Đề tài hoàn tất", value: count("COMPLETED") },
      ];
    case "LEADER":
      return [
        { title: "Tổng đề tài", value: statuses.length },
        { title: "Đang thực hiện", value: count("IN_PROGRESS") },
        { title: "Không đạt", value: count("REJECTED") },
      ];
    default:
      return [];
  }
};

export function ProjectList({ currentRole }: ProjectListProps) {
  const { data: projects = [], isLoading, isError } = useProjects();
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();

  const metrics = getRoleMetrics(
    currentRole,
    projects.map((project) => project.status)
  );

  const handleStatusAction = (projectId: string, nextStatus: ProjectStatus, label: string) => {
    updateMutation.mutate(
      { id: projectId, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(`Đã cập nhật trạng thái: ${label}`);
        },
        onError: () => {
          toast.error("Không thể cập nhật trạng thái.");
        },
      }
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải danh sách đề tài...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Không thể tải danh sách đề tài.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard vai trò: {roleLabel[currentRole]}</CardTitle>
          <CardDescription>Tổng hợp nhanh theo quyền nghiệp vụ hiện tại.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.title}>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-semibold">{metric.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đề tài</CardTitle>
          <CardDescription>Theo dõi luồng đăng ký, xét duyệt và trạng thái thực hiện.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đề tài</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Kinh phí đề xuất</TableHead>
                <TableHead>Quá hạn</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    Chưa có đề tài nào.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => {
                  const actions = roleActions[currentRole][project.status] ?? [];

                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{project.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{project.objective}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[project.status]}>{statusLabel[project.status]}</Badge>
                      </TableCell>
                      <TableCell>{normalizeBudget(project.budgetRequested)}</TableCell>
                      <TableCell>{project.overdueReportCount}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => (
                            <Button
                              key={`${project.id}-${action.nextStatus}`}
                              variant={action.variant ?? "outline"}
                              size="sm"
                              onClick={() =>
                                handleStatusAction(project.id, action.nextStatus, action.label)
                              }
                              disabled={updateMutation.isPending}
                            >
                              {action.label}
                            </Button>
                          ))}

                          {currentRole === "LECTURER" || currentRole === "ADMIN" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(project.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Xóa
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
