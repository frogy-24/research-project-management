"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectList } from "@/components/projects/project-list";
import { RoleOperationsPanel } from "@/components/dashboard/role-operations-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Role } from "@/types/user.schema";

type RoleDashboardProps = {
  role: Role;
};

export function RoleDashboard({ role }: RoleDashboardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreateProject = role === "LECTURER" || role === "ADMIN";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý Đề tài</h1>
          <p className="mt-1 text-muted-foreground">Các đề tài đang xử lý trong không gian làm việc của bạn.</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreateProject ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Đăng ký đề tài mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Thêm đề tài nghiên cứu</DialogTitle>
                </DialogHeader>
                <ProjectForm onSuccess={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="space-y-8">
        <ProjectList currentRole={role} />
        
        <div className="pt-2 border-t border-border/50">
          <RoleOperationsPanel role={role} />
        </div>
      </div>
    </div>
  );
}
