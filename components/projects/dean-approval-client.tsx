"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Registration {
  id: string;
  title: string;
  user: {
    name: string;
    department: string | null;
  };
  instructor: {
    name: string;
  } | null;
  instructorStatus: string;
  facultyStatus: string;
}

export function DeanApprovalClient() {
  const queryClient = useQueryClient();

  const { data: registrations, isLoading } = useQuery<Registration[]>({
    queryKey: ["dean-approvals"],
    queryFn: async () => {
      const res = await api.get("/dean/approvals");
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) => {
      const res = await api.patch(`/dean/approvals/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["dean-approvals"] });
    },
    onError: () => {
      toast.error("Đã xảy ra lỗi khi cập nhật");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!registrations || registrations.length === 0) {
    return (
      <div className="text-center p-12 border border-dashed rounded-lg bg-muted/50">
        <p className="text-muted-foreground">Không có hồ sơ nào cần duyệt.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên đề tài</TableHead>
            <TableHead>Chủ nhiệm</TableHead>
            <TableHead>GV Hướng dẫn</TableHead>
            <TableHead>Trạng thái Khoa</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registrations.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.title}</TableCell>
              <TableCell>{req.user.name}</TableCell>
              <TableCell>
                {req.instructor ? (
                  <div className="flex flex-col gap-1">
                    <span>{req.instructor.name}</span>
                    <Badge variant={req.instructorStatus === "ACCEPTED" ? "default" : "secondary"} className="w-fit text-[10px]">
                      {req.instructorStatus}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Không có</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    req.facultyStatus === "APPROVED"
                      ? "default"
                      : req.facultyStatus === "REJECTED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {req.facultyStatus === "APPROVED"
                    ? "Đã duyệt"
                    : req.facultyStatus === "REJECTED"
                      ? "Đã từ chối"
                      : "Chờ duyệt"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {req.facultyStatus === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ id: req.id, status: "APPROVED" })
                      }
                      disabled={mutation.isPending || Boolean(req.instructor && req.instructorStatus === "PENDING")}
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        mutation.mutate({ id: req.id, status: "REJECTED" })
                      }
                      disabled={mutation.isPending}
                    >
                      Từ chối
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
