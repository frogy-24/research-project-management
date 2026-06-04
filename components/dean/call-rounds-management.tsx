'use client';

import * as React from 'react';
import {
    Clock,
    CheckCircle,
    XCircle,
    PlusCircle,
    Eye,
    Pencil,
    Trash2,
    Calendar,
    Users,
    FileText,
    Settings,
    BookOpen,
    GraduationCap,
    DollarSign,
    Hash,
    AlertCircle,
    Info,
    Paperclip,
    ExternalLink,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useCallRounds, useCreateCallRound, useUpdateCallRound, useDeleteCallRound } from '@/hooks/useCallRounds';
import { useDeanApprovals } from '@/hooks/useDeanApprovals';
import { useAuthSession } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useProgressTemplates } from '@/hooks/useProgressTemplates';
import { useUsers } from '@/hooks/useUsers';
import type { CallRound } from '@/types/call-round.schema';
import { CallRoundFormDialog } from '@/components/dean/call-round-form-dialog';
import { callRoundsApi } from '@/api/call-rounds';
import type { CallRoundAttachment } from '@/types/call-round.schema';

// Helper: render invitation status badge
function InvitationStatusBadge({ status }: { status?: string }) {
    if (status === 'ACCEPTED') {
        return (
            <Badge variant="default" className="gap-1 bg-emerald-500 text-white">
                <CheckCircle className="h-3 w-3" />
                Đã đồng ý
            </Badge>
        );
    }
    if (status === 'REJECTED') {
        return (
            <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Từ chối
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
            <Clock className="h-3 w-3" />
            Chờ phản hồi
        </Badge>
    );
}

const toEndOfDay = (value: Date | string): Date => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

export function DeanCallRoundsManagement() {
    const { data: session } = useAuthSession();
    const { data: me } = useMe();
    const { data: callRounds, isLoading, refetch } = useCallRounds();
    const createCallRound = useCreateCallRound();
    const updateCallRound = useUpdateCallRound();
    const deleteCallRound = useDeleteCallRound();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [editingCallRound, setEditingCallRound] = React.useState<CallRound | null>(null);
    const [viewingCallRound, setViewingCallRound] = React.useState<CallRound | null>(null);
    const [deletingCallRound, setDeletingCallRound] = React.useState<CallRound | null>(null);
    const [registrationStatusFilter, setRegistrationStatusFilter] = React.useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

    const { data: deanApprovalsData, isLoading: loadingRegistrations } = useDeanApprovals(1, 500, {
        callRoundId: viewingCallRound?.id,
        facultyStatus: registrationStatusFilter === 'ALL' ? undefined : registrationStatusFilter,
    });

    // API đã filter sẵn: DEAN chỉ thấy đợt mình tạo, ADMIN thấy tất cả
    const deanCallRounds = callRounds || [];

    const canEditCallRound = (callRound: CallRound) => {
        // Chỉ cho phép sửa khi đang chờ duyệt
        return callRound.approvalStatus === 'PENDING_APPROVAL';
    };

    const isCallRoundEnded = (callRound: CallRound) => new Date() > toEndOfDay(callRound.registrationEndDate);

    const getRoundPhaseBadge = (callRound: CallRound) => {
        if (isCallRoundEnded(callRound)) {
            return (
                <Badge variant="secondary" className="gap-1 bg-slate-200 text-slate-700">
                    Kết thúc
                </Badge>
            );
        }

        return (
            <Badge variant="default" className="gap-1 bg-blue-600">
                Đang mở
            </Badge>
        );
    };

    const handleOpenDialog = (callRound?: CallRound) => {
        if (callRound && !canEditCallRound(callRound)) {
            toast.error('Chỉ có thể chỉnh sửa đợt đăng ký khi đang ở trạng thái chờ duyệt.');
            return;
        }
        setEditingCallRound(callRound || null);
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingCallRound) return;

        try {
            await deleteCallRound.mutateAsync(deletingCallRound.id);
            toast.success('Xóa đợt đăng ký thành công!');
            setIsDeleteDialogOpen(false);
            setDeletingCallRound(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Không thể xóa đợt đăng ký!');
        }
    };

    const getStatusBadge = (callRound: CallRound) => {
        if (callRound.approvalStatus === 'PENDING_APPROVAL') {
            return (
                <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Chờ duyệt
                </Badge>
            );
        }
        if (callRound.approvalStatus === 'APPROVED') {
            return (
                <Badge variant="default" className="gap-1 bg-emerald-500">
                    <CheckCircle className="h-3 w-3" />
                    Đã duyệt
                </Badge>
            );
        }
        if (callRound.approvalStatus === 'REJECTED') {
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
                    <p className="text-muted-foreground mt-1">Tạo và quản lý các đợt đăng ký đề tài của khoa</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Thêm đợt đăng ký
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
                                <TableHead>Ngày chốt đề tài</TableHead>
                                <TableHead>Ngày bảo vệ</TableHead>
                                <TableHead>Biểu mẫu</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Tiến độ</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deanCallRounds.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                                                    {new Date(callRound.registrationStartDate).toLocaleDateString(
                                                        'vi-VN',
                                                    )}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    đến{' '}
                                                    {new Date(callRound.registrationEndDate).toLocaleDateString(
                                                        'vi-VN',
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {callRound.projectStartDate && callRound.projectEndDate ? (
                                                <div className="text-sm">
                                                    <div>
                                                        {new Date(callRound.projectStartDate).toLocaleDateString(
                                                            'vi-VN',
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        đến{' '}
                                                        {new Date(callRound.projectEndDate).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Chưa xác định</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {callRound.projectLockDate ? (
                                                <div className="text-sm">
                                                    {new Date(callRound.projectLockDate).toLocaleDateString('vi-VN')}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {callRound.defenseDate ? (
                                                <div className="text-sm">
                                                    {new Date(callRound.defenseDate).toLocaleDateString('vi-VN')}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {callRound.template ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    {callRound.template.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Chưa có</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(callRound)}</TableCell>
                                        <TableCell>{getRoundPhaseBadge(callRound)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setViewingCallRound(callRound)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Xem
                                                </Button>

                                                {canEditCallRound(callRound) && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenDialog(callRound)}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" />
                                                        Sửa
                                                    </Button>
                                                )}

                                                {canEditCallRound(callRound) && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setDeletingCallRound(callRound);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Xóa
                                                    </Button>
                                                )}
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
            <CallRoundFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingCallRound={editingCallRound}
                departmentId={me?.departmentId}
                onSuccess={() => refetch()}
            />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa đợt đăng ký "{deletingCallRound?.name}"? Hành động này không thể
                            hoàn tác.
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
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteCallRound.isPending}>
                            {deleteCallRound.isPending ? 'Đang xóa...' : 'Xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Detail Dialog */}
            <Dialog
                open={Boolean(viewingCallRound)}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingCallRound(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-1/2">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">{viewingCallRound?.name}</DialogTitle>
                                <DialogDescription>
                                    Mã đợt:{' '}
                                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                        {viewingCallRound?.id.slice(0, 8)}
                                    </code>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {viewingCallRound && (
                        <Tabs defaultValue="overview" className="mt-2 flex flex-col">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="overview">
                                    <Info className="mr-1.5 h-3.5 w-3.5" />
                                    Tổng quan
                                </TabsTrigger>
                                <TabsTrigger value="timeline">
                                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                    Thời gian
                                </TabsTrigger>
                                <TabsTrigger value="config">
                                    <Settings className="mr-1.5 h-3.5 w-3.5" />
                                    Cấu hình
                                </TabsTrigger>
                                <TabsTrigger value="personnel">
                                    <Users className="mr-1.5 h-3.5 w-3.5" />
                                    Giảng viên
                                </TabsTrigger>
                                <TabsTrigger value="registrations">
                                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                                    Đề tài đã đăng ký
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab: Tổng quan */}
                            <TabsContent value="overview" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="h-4 w-4" />
                                            Trạng thái phê duyệt
                                        </div>
                                        <div className="mt-2">{getStatusBadge(viewingCallRound)}</div>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            Trạng thái vận hành
                                        </div>
                                        <div className="mt-2">{getRoundPhaseBadge(viewingCallRound)}</div>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <FileText className="h-4 w-4" />
                                        Mô tả
                                    </div>
                                    <Separator className="my-3" />
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {viewingCallRound.description || (
                                            <span className="text-muted-foreground italic">Không có mô tả</span>
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <AlertCircle className="h-4 w-4" />
                                        Yêu cầu & Điều kiện
                                    </div>
                                    <Separator className="my-3" />
                                    <p className="text-sm leading-relaxed">
                                        {viewingCallRound.requirements || (
                                            <span className="text-muted-foreground italic">
                                                Không có yêu cầu đặc biệt
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {viewingCallRound.approvalStatus === 'REJECTED' && viewingCallRound.approvalNote && (
                                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                                            <XCircle className="h-4 w-4" />
                                            Lý do từ chối
                                        </div>
                                        <p className="mt-2 text-sm text-rose-600">{viewingCallRound.approvalNote}</p>
                                    </div>
                                )}

                                {/* Attachments Section */}
                                <AttachmentsSection callRoundId={viewingCallRound.id} />
                            </TabsContent>

                            {/* Tab: Thời gian */}
                            <TabsContent value="timeline" className="space-y-4">
                                <div className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                        <Calendar className="h-4 w-4" />
                                        Thời gian đăng ký
                                    </div>
                                    <Separator className="my-3" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Bắt đầu</p>
                                            <p className="mt-1 font-medium">
                                                {new Date(viewingCallRound.registrationStartDate).toLocaleDateString(
                                                    'vi-VN',
                                                    {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Kết thúc</p>
                                            <p className="mt-1 font-medium">
                                                {new Date(viewingCallRound.registrationEndDate).toLocaleDateString(
                                                    'vi-VN',
                                                    {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                                        <BookOpen className="h-4 w-4" />
                                        Thời gian thực hiện đề tài
                                    </div>
                                    <Separator className="my-3" />
                                    {viewingCallRound.projectStartDate && viewingCallRound.projectEndDate ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Bắt đầu</p>
                                                <p className="mt-1 font-medium">
                                                    {new Date(viewingCallRound.projectStartDate).toLocaleDateString(
                                                        'vi-VN',
                                                        {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Kết thúc</p>
                                                <p className="mt-1 font-medium">
                                                    {new Date(viewingCallRound.projectEndDate).toLocaleDateString(
                                                        'vi-VN',
                                                        {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Chưa xác định</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                                            <Calendar className="h-4 w-4" />
                                            Ngày chốt đề tài
                                        </div>
                                        <Separator className="my-3" />
                                        {viewingCallRound.projectLockDate ? (
                                            <p className="font-medium">
                                                {new Date(viewingCallRound.projectLockDate).toLocaleDateString(
                                                    'vi-VN',
                                                    {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    },
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Chưa thiết lập</p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Hạn chót đăng ký/thay đổi đề tài
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                                            <GraduationCap className="h-4 w-4" />
                                            Ngày bảo vệ đề tài
                                        </div>
                                        <Separator className="my-3" />
                                        {viewingCallRound.defenseDate ? (
                                            <p className="font-medium">
                                                {new Date(viewingCallRound.defenseDate).toLocaleDateString('vi-VN', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Chưa thiết lập</p>
                                        )}
                                    </div>
                                </div>

                                {viewingCallRound.reviewDeadline && (
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Calendar className="h-4 w-4" />
                                            Hạn nộp hồ sơ thẩm định
                                        </div>
                                        <p className="mt-2 font-medium">
                                            {new Date(viewingCallRound.reviewDeadline).toLocaleDateString('vi-VN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab: Cấu hình */}
                            <TabsContent value="config" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Hash className="h-4 w-4" />
                                            Số lượng đề tài tối đa
                                        </div>
                                        <Separator className="my-3" />
                                        {viewingCallRound.maxProjects ? (
                                            <p className="text-2xl font-bold">{viewingCallRound.maxProjects}</p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Không giới hạn</p>
                                        )}
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <DollarSign className="h-4 w-4" />
                                            Giới hạn kinh phí
                                        </div>
                                        <Separator className="my-3" />
                                        {viewingCallRound.budgetLimit ? (
                                            <p className="text-2xl font-bold text-emerald-600">
                                                {new Intl.NumberFormat('vi-VN', {
                                                    style: 'currency',
                                                    currency: 'VND',
                                                }).format(viewingCallRound.budgetLimit)}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Theo quy định</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Users className="h-4 w-4" />
                                            Đối tượng áp dụng
                                        </div>
                                        <Separator className="my-3" />
                                        <Badge
                                            variant={
                                                viewingCallRound.applicableFor === 'BOTH' ? 'default' : 'secondary'
                                            }
                                        >
                                            {viewingCallRound.applicableFor === 'STUDENT' && 'Sinh viên'}
                                            {viewingCallRound.applicableFor === 'LECTURER' && 'Giảng viên'}
                                            {viewingCallRound.applicableFor === 'BOTH' && 'Cả hai'}
                                        </Badge>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <FileText className="h-4 w-4" />
                                            Biểu mẫu báo cáo
                                        </div>
                                        <Separator className="my-3" />
                                        {viewingCallRound.template ? (
                                            <Badge variant="secondary">{viewingCallRound.template.name}</Badge>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Chưa thiết lập</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <CheckCircle className="h-4 w-4" />
                                            Trạng thái kích hoạt
                                        </div>
                                        <Separator className="my-3" />
                                        <Badge
                                            variant={viewingCallRound.isActive ? 'default' : 'secondary'}
                                            className={viewingCallRound.isActive ? 'bg-emerald-500' : ''}
                                        >
                                            {viewingCallRound.isActive ? 'Đang kích hoạt' : 'Không kích hoạt'}
                                        </Badge>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <AlertCircle className="h-4 w-4" />
                                            Trạng thái khóa
                                        </div>
                                        <Separator className="my-3" />
                                        <Badge variant={viewingCallRound.isLocked ? 'destructive' : 'outline'}>
                                            {viewingCallRound.isLocked ? 'Đã khóa' : 'Chưa khóa'}
                                        </Badge>
                                    </div>
                                </div>

                                {viewingCallRound.guidelines && (
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <FileText className="h-4 w-4" />
                                            Hướng dẫn bổ sung
                                        </div>
                                        <Separator className="my-3" />
                                        <p className="text-sm leading-relaxed">{viewingCallRound.guidelines}</p>
                                    </div>
                                )}

                                {viewingCallRound.contactInfo && (
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Users className="h-4 w-4" />
                                            Thông tin liên hệ
                                        </div>
                                        <Separator className="my-3" />
                                        <p className="text-sm">{viewingCallRound.contactInfo}</p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab: Nhân sự */}
                            <TabsContent value="personnel" className="space-y-4">
                                <Tabs defaultValue="instructors" className="w-full flex flex-col gap-4">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="instructors">
                                            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                            Giảng viên hướng dẫn
                                        </TabsTrigger>
                                        <TabsTrigger value="council-members">
                                            <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                                            Thành viên hội đồng
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Sub-tab: Giảng viên hướng dẫn */}
                                    <TabsContent value="instructors" className="mt-4">
                                        <InstructorsTab instructors={viewingCallRound.availableInstructors || []} />
                                    </TabsContent>

                                    {/* Sub-tab: Thành viên hội đồng */}
                                    <TabsContent value="council-members" className="mt-4">
                                        <CouncilMembersTab
                                            councilMembers={viewingCallRound.availableCouncilMembers || []}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </TabsContent>

                            <TabsContent value="registrations" className="space-y-4">
                                <RegistrationsTab
                                    registrations={deanApprovalsData?.data || []}
                                    isLoading={loadingRegistrations}
                                    statusFilter={registrationStatusFilter}
                                    onStatusFilterChange={setRegistrationStatusFilter}
                                />
                            </TabsContent>
                        </Tabs>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setViewingCallRound(null)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RegistrationsTab({
    registrations,
    isLoading,
    statusFilter,
    onStatusFilterChange,
}: {
    registrations: any[];
    isLoading: boolean;
    statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
    onStatusFilterChange: (v: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => void;
}) {
    return (
        <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Danh sách đề tài đã đăng ký</div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Lọc phê duyệt</Label>
                    <select
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
                    >
                        <option value="ALL">Tất cả</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Từ chối</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
            ) : registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Chưa có đề tài đăng ký</p>
            ) : (
                <div className="space-y-2">
                    {registrations.map((item, idx) => (
                        <details key={item.id} className="rounded-md border bg-muted/30 p-3">
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{idx + 1}. {item.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        Chủ nhiệm: {item.user?.name || 'N/A'} • GVHD: {item.instructor?.name || 'Chưa phân công'}
                                    </p>
                                </div>
                                <Badge variant={item.facultyStatus === 'APPROVED' ? 'default' : item.facultyStatus === 'REJECTED' ? 'destructive' : 'outline'}>
                                    {item.facultyStatus}
                                </Badge>
                            </summary>
                            <div className="mt-3 space-y-2">
                                <div className="rounded-md border bg-background p-3">
                                    <p className="text-xs font-medium mb-2">Thành viên tham gia</p>
                                    <ul className="space-y-1 text-sm">
                                        <li>
                                            <span className="font-medium">{item.user?.name || 'N/A'}</span> — Vai trò: Trưởng nhóm
                                        </li>
                                        {(item.teamMembers || []).map((m: any, i: number) => (
                                            <li key={`${m.name}-${i}`}>
                                                <span className="font-medium">{m.name}</span> — Vai trò: {m.role || 'Thành viên'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
}

// Instructors Tab Component with Search
function InstructorsTab({ instructors }: { instructors: any[] }) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredInstructors = React.useMemo(() => {
        if (!searchQuery.trim()) return instructors;
        const query = searchQuery.toLowerCase();
        return instructors.filter(
            (item) =>
                item.instructor.name.toLowerCase().includes(query) ||
                item.instructor.email.toLowerCase().includes(query),
        );
    }, [instructors, searchQuery]);

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <BookOpen className="h-4 w-4" />
                    Danh sách giảng viên hướng dẫn
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Tìm theo tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
            </div>
            <Separator className="my-3" />
            {instructors.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Chưa có giảng viên hướng dẫn được chỉ định</p>
            ) : filteredInstructors.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                    Không tìm thấy giảng viên phù hợp
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredInstructors.map((item) => (
                        <div
                            key={item.instructorId}
                            className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                                    <span className="text-xs font-medium">{item.instructor.name.charAt(0)}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{item.instructor.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.instructor.email}</p>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <InvitationStatusBadge status={item.invitationStatus} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Council Members Tab Component with Search
function CouncilMembersTab({ councilMembers }: { councilMembers: any[] }) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredCouncilMembers = React.useMemo(() => {
        if (!searchQuery.trim()) return councilMembers;
        const query = searchQuery.toLowerCase();
        return councilMembers.filter(
            (item) =>
                item.councilMember.name.toLowerCase().includes(query) ||
                item.councilMember.email.toLowerCase().includes(query),
        );
    }, [councilMembers, searchQuery]);

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <GraduationCap className="h-4 w-4" />
                    Danh sách thành viên hội đồng
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Tìm theo tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
            </div>
            <Separator className="my-3" />
            {councilMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Chưa có thành viên hội đồng được chỉ định</p>
            ) : filteredCouncilMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                    Không tìm thấy thành viên phù hợp
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredCouncilMembers.map((item) => (
                        <div
                            key={item.councilMemberId}
                            className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 p-3"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
                                    <span className="text-xs font-medium">{item.councilMember.name.charAt(0)}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{item.councilMember.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.councilMember.email}</p>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <InvitationStatusBadge status={item.invitationStatus} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Attachments Section Component
function AttachmentsSection({ callRoundId }: { callRoundId: string }) {
    const { data: attachments, isLoading } = useQuery({
        queryKey: ['call-round-attachments', callRoundId],
        queryFn: () => callRoundsApi.getAttachments(callRoundId),
        enabled: !!callRoundId,
    });

    if (isLoading) {
        return (
            <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Đang tải tệp đính kèm...
                </div>
            </div>
        );
    }

    if (!attachments || attachments.length === 0) {
        return (
            <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Paperclip className="h-4 w-4" />
                    Tệp đính kèm
                </div>
                <Separator className="my-3" />
                <div className="text-center py-4">
                    <Paperclip className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">Không có tệp đính kèm</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                Tệp đính kèm ({attachments.length})
            </div>
            <Separator className="my-3" />
            <div className="space-y-2">
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-muted/50 hover:bg-muted/80 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'N/A'} •{' '}
                                    {attachment.createdAt
                                        ? new Date(attachment.createdAt).toLocaleDateString('vi-VN')
                                        : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
