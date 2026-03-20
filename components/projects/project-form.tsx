"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createProjectSchema, ProjectStatusEnum, type CreateProjectInput } from "@/types/project.schema";
import { useCreateProject } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormProps = {
  onSuccess?: () => void;
};

const statusOptions = ProjectStatusEnum.options;
type CreateProjectFormInput = z.input<typeof createProjectSchema>;

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const { data: users = [] } = useUsers();
  const createMutation = useCreateProject();

  const form = useForm<CreateProjectFormInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: "",
      objective: "",
      expectedOutput: "",
      proposalFileUrl: "",
      status: "DRAFT",
      budgetRequested: null,
      budgetApproved: null,
      leaderId: "",
      deanReviewerId: null,
      callRoundId: null,
      projectTypeId: null,
      code: null,
      overdueReportCount: 0,
      budgetSuspended: false,
    },
  });

  const onSubmit = async (values: CreateProjectFormInput) => {
    const payload: CreateProjectInput = createProjectSchema.parse({
      ...values,
      expectedOutput: values.expectedOutput?.trim() ? values.expectedOutput : null,
      proposalFileUrl: values.proposalFileUrl?.trim() ? values.proposalFileUrl : null,
      budgetRequested:
        values.budgetRequested === undefined || values.budgetRequested === null
          ? null
          : Number(values.budgetRequested),
      budgetApproved:
        values.budgetApproved === undefined || values.budgetApproved === null
          ? null
          : Number(values.budgetApproved),
      deanReviewerId: values.deanReviewerId ?? null,
      callRoundId: values.callRoundId ?? null,
      projectTypeId: values.projectTypeId ?? null,
      code: values.code ?? null,
    });

    await createMutation.mutateAsync(payload);

    form.reset();
    onSuccess?.();
  };

  const lecturers = users.filter((user) => user.role === "LECTURER");
  const selectedLeaderId = useWatch({ control: form.control, name: "leaderId" });
  const selectedStatus = useWatch({ control: form.control, name: "status" });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="title">Tên đề tài</Label>
        <Input id="title" {...form.register("title")} placeholder="Nghiên cứu ứng dụng AI trong giáo dục" />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Mục tiêu</Label>
        <Textarea id="objective" {...form.register("objective")} placeholder="Mục tiêu chính của đề tài" />
        {form.formState.errors.objective ? (
          <p className="text-sm text-destructive">{form.formState.errors.objective.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedOutput">Sản phẩm dự kiến</Label>
        <Textarea id="expectedOutput" {...form.register("expectedOutput")} placeholder="Bài báo, báo cáo, phần mềm..." />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Chủ nhiệm đề tài</Label>
          <Select
            value={selectedLeaderId}
            onValueChange={(value) => form.setValue("leaderId", value, { shouldValidate: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn giảng viên" />
            </SelectTrigger>
            <SelectContent>
              {lecturers.map((lecturer) => (
                <SelectItem key={lecturer.id} value={lecturer.id}>
                  {lecturer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.leaderId ? (
            <p className="text-sm text-destructive">{form.formState.errors.leaderId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Select
            value={selectedStatus}
            onValueChange={(value) =>
              form.setValue("status", value as CreateProjectFormInput["status"], { shouldValidate: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budgetRequested">Kinh phí đề xuất (VND)</Label>
        <Input
          id="budgetRequested"
          type="number"
          min={0}
          placeholder="0"
          onChange={(event) => {
            const value = event.target.value;
            form.setValue("budgetRequested", value === "" ? null : Number(value), {
              shouldValidate: true,
            });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proposalFileUrl">Link hồ sơ PDF</Label>
        <Input id="proposalFileUrl" {...form.register("proposalFileUrl")} placeholder="https://..." />
      </div>

      <Button className="w-full" type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Đang lưu..." : "Tạo đề tài"}
      </Button>
    </form>
  );
}
