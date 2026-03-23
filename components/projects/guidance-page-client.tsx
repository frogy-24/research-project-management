'use client';

import { toast } from 'sonner';
import { useGuidanceRequests, useUpdateInstructorStatus } from '@/hooks/useGuidanceRequests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Registration {
    id: string;
    title: string;
    objective?: string;
    expectedOutput?: string;
    user: {
        name: string;
        email: string;
    };
    instructorStatus: string;
}

export function GuidancePageClient() {
    const { data: registrations, isLoading } = useGuidanceRequests();
    const mutation = useUpdateInstructorStatus();

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
                <p className="text-muted-foreground">Không có yêu cầu hướng dẫn nào.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tên đề tài</TableHead>
                        <TableHead>Sinh viên đăng ký</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {registrations.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.title}</TableCell>
                            <TableCell>{req.user.name}</TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        req.instructorStatus === 'ACCEPTED'
                                            ? 'default'
                                            : req.instructorStatus === 'REJECTED'
                                              ? 'destructive'
                                              : 'secondary'
                                    }
                                >
                                    {req.instructorStatus === 'ACCEPTED'
                                        ? 'Đã đồng ý'
                                        : req.instructorStatus === 'REJECTED'
                                          ? 'Đã từ chối'
                                          : 'Chờ xác nhận'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            Chi tiết
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Chi tiết đăng ký hướng dẫn</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                    Tên đề tài
                                                </h4>
                                                <p className="text-sm font-medium">{req.title}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                    Người đăng ký
                                                </h4>
                                                <p className="text-sm">
                                                    {req.user.name} ({req.user.email})
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm text-muted-foreground mb-1">Mục tiêu</h4>
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {req.objective || 'Chưa có thông tin'}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                    Sản phẩm dự kiến
                                                </h4>
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {req.expectedOutput || 'Chưa có thông tin'}
                                                </p>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                {req.instructorStatus === 'PENDING' && (
                                    <>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() =>
                                                mutation.mutate(
                                                    { id: req.id, status: 'ACCEPTED' },
                                                    {
                                                        onSuccess: () => toast.success('Cập nhật trạng thái thành công'),
                                                        onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                    }
                                                )
                                            }
                                            disabled={mutation.isPending}
                                        >
                                            Đồng ý
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                mutation.mutate(
                                                    { id: req.id, status: 'REJECTED' },
                                                    {
                                                        onSuccess: () => toast.success('Cập nhật trạng thái thành công'),
                                                        onError: () => toast.error('Đã xảy ra lỗi khi cập nhật'),
                                                    }
                                                )
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
