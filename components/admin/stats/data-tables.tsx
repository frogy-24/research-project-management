'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const statusLabelMap: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  DEAN_APPROVED: 'Khoa duyệt',
  DEAN_REVISION: 'Cần sửa',
  ADMIN_REVIEW: 'Admin xem',
  COUNCIL_EVALUATING: 'Hội đồng đánh giá',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Đình chỉ',
};

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  DEAN_APPROVED: 'default',
  DEAN_REVISION: 'outline',
  ADMIN_REVIEW: 'secondary',
  COUNCIL_EVALUATING: 'default',
  APPROVED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'default',
  REJECTED: 'destructive',
  SUSPENDED: 'destructive',
};

export function ProjectDataTable({ projects }: { projects: Array<{ id: string; code: string; title: string; status: string; budgetRequested: number | null; budgetApproved: number | null; leaderName: string; createdAt: string }> }) {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const pageSize = 10;

  const filtered = filterStatus === 'ALL' ? projects : projects.filter((p) => p.status === filterStatus);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Danh sách đề tài</CardTitle>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(statusLabelMap).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đề tài</TableHead>
              <TableHead>Tên đề tài</TableHead>
              <TableHead>Chủ nhiệm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Kinh phí duyệt</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-xs">{project.code || '—'}</TableCell>
                  <TableCell className="max-w-xs truncate">{project.title}</TableCell>
                  <TableCell>{project.leaderName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[project.status] ?? 'outline'}>
                      {statusLabelMap[project.status] ?? project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {project.budgetApproved ? `${project.budgetApproved.toLocaleString('vi-VN')} VNĐ` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Trang {page}/{totalPages} ({filtered.length} kết quả)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Trước
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Sau
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
