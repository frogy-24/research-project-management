'use client';

import * as React from 'react';
import { Clock, CheckCircle, XCircle, PlusCircle, Eye, Pencil, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { useCallRounds, useCreateCallRound, useUpdateCallRound, useDeleteCallRound } from '@/hooks/useCallRounds';
import { useAuthSession } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useProgressTemplates } from '@/hooks/useProgressTemplates';
import { useUsers } from '@/hooks/useUsers';
import type { CallRound } from '@/types/call-round.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

type CallRoundFormData = {
    name: string;
    description: string;
    registrationStartDate: string;
    registrationEndDate: string;
    projectStartDate: string;
    projectEndDate: string;
    maxProjects: string;
    requirements: string;
    templateId: string;
    instructorIds: string[];
    councilMemberIds: string[];
    applicableFor: 'STUDENT' | 'LECTURER' | 'BOTH';
};

const initialFormData: CallRoundFormData = {
    name: '',
    description: '',
    registrationStartDate: '',
    registrationEndDate: '',
    projectStartDate: '',
    projectEndDate: '',
    maxProjects: '',
    requirements: '',
    templateId: '',
    instructorIds: [],
    councilMemberIds: [],
    applicableFor: 'STUDENT',
};

export function DeanCallRoundsManagement() {
    const { data: session } = useAuthSession();
    const { data: me } = useMe();
    const { data: callRounds, isLoading, refetch } = useCallRounds();
    const { data: templates, isLoading: isLoadingTemplates } = useProgressTemplates(true);
    
    // Fetch lecturers from dean's department
    const { data: usersData, isLoading: isLoadingLecturers } = useUsers({
        role: 'LECTURER',
        departmentId: me?.departmentId || undefined,
        limit: 100,
    });
    const lecturers = usersData?.data || [];
    
    // Fetch council members (LECTURER with COUNCIL capability)
    // const { data: councilData, isLoading: isLoadingCouncil } = useUsers({
    //     role: 'LECTURER',
    //     departmentId: session?.user?.departmentId || undefined,
    //     limit: 100,
    // });
    // const councilMembers = councilData?.data || [];
    const createCallRound = useCreateCallRound();
    const updateCallRound = useUpdateCallRound();
    const deleteCallRound = useDeleteCallRound();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [editingCallRound, setEditingCallRound] = React.useState<CallRound | null>(null);
    const [viewingCallRound, setViewingCallRound] = React.useState<CallRound | null>(null);
    const [deletingCallRound, setDeletingCallRound] = React.useState<CallRound | null>(null);
    const [formData, setFormData] = React.useState<CallRoundFormData>(initialFormData);

    // API đã filter sẵn: DEAN chỉ thấy đợt mình tạo, ADMIN thấy tất cả
    const deanCallRounds = callRounds || [];

    const canEditCallRound = (callRound: CallRound) => callRound.approvalStatus === 'PENDING_APPROVAL';

    const isCallRoundEnded = (callRound: CallRound) => new Date(callRound.registrationEndDate) < new Date();

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
        if (callRound) {
            if (!canEditCallRound(callRound)) {
                toast.error('Chỉ có thể chỉnh sửa đợt đăng ký khi đang ở trạng thái chờ duyệt.');
                return;
            }
            setEditingCallRound(callRound);
            setFormData({
                name: callRound.name,
                description: callRound.description || '',
                registrationStartDate: new Date(callRound.registrationStartDate).toISOString().split('T')[0],
                registrationEndDate: new Date(callRound.registrationEndDate).toISOString().split('T')[0],
                projectStartDate: callRound.projectStartDate
                    ? new Date(callRound.projectStartDate).toISOString().split('T')[0]
                    : '',
                projectEndDate: callRound.projectEndDate
                    ? new Date(callRound.projectEndDate).toISOString().split('T')[0]
                    : '',
                maxProjects: callRound.maxProjects?.toString() || '',
                requirements: callRound.requirements || '',
                templateId: callRound.templateId || '',
                instructorIds: callRound.availableInstructors?.map((i) => i.instructorId) || [],
                councilMemberIds: callRound.availableCouncilMembers?.map((c) => c.councilMemberId) || [],
                applicableFor: callRound.applicableFor || 'STUDENT',
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

        try {
            const payload: any = {
                name: formData.name,
                description: formData.description || undefined,
                registrationStartDate: new Date(formData.registrationStartDate),
                registrationEndDate: new Date(formData.registrationEndDate),
                startDate: new Date(formData.registrationStartDate),
                endDate: new Date(formData.registrationEndDate),
                projectStartDate: formData.projectStartDate ? new Date(formData.projectStartDate) : undefined,
                projectEndDate: formData.projectEndDate ? new Date(formData.projectEndDate) : undefined,
                maxProjects: formData.maxProjects ? parseInt(formData.maxProjects) : undefined,
                requirements: formData.requirements || undefined,
                templateId: formData.templateId && formData.templateId !== 'none' ? formData.templateId : null,
                instructorIds: formData.instructorIds,
                councilMemberIds: formData.councilMemberIds,
                applicableFor: formData.applicableFor,
                isActive: true,
                isLocked: false,
            };

            if (editingCallRound) {
                await updateCallRound.mutateAsync({ id: editingCallRound.id, ...payload });
                toast.success('Cập nhật đợt đăng ký thành công!');
            } else {
                await createCallRound.mutateAsync(payload);
                toast.success('Tạo đợt đăng ký thành công! Đang chờ Admin phê duyệt.');
            }

            handleCloseDialog();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Có lỗi xảy ra!');
        }
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
                                <TableHead>Biểu mẫu</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Tiến độ</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deanCallRounds.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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

                                                {!isCallRoundEnded(callRound) && canEditCallRound(callRound) && (
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

                                                {!isCallRoundEnded(callRound) && (
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
            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-1/2">
                    <DialogHeader>
                        <DialogTitle>{editingCallRound ? 'Chỉnh sửa đợt đăng ký' : 'Tạo đợt đăng ký mới'}</DialogTitle>
                        <DialogDescription>
                            {editingCallRound
                                ? 'Cập nhật thông tin đợt đăng ký'
                                : 'Đợt đăng ký sẽ được gửi đến Admin để phê duyệt'}
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
                                    type="date"
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
                                    type="date"
                                    value={formData.registrationEndDate}
                                    onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="projectStartDate">Ngày bắt đầu thực hiện</Label>
                                <Input
                                    id="projectStartDate"
                                    type="date"
                                    value={formData.projectStartDate}
                                    onChange={(e) => setFormData({ ...formData, projectStartDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="projectEndDate">Ngày kết thúc thực hiện</Label>
                                <Input
                                    id="projectEndDate"
                                    type="date"
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
                            <Label htmlFor="applicableFor">Đối tượng áp dụng *</Label>
                            <Select
                                value={formData.applicableFor}
                                onValueChange={(value: 'STUDENT' | 'LECTURER' | 'BOTH') => setFormData({ ...formData, applicableFor: value })}
                            >
                                <SelectTrigger id="applicableFor">
                                    <SelectValue placeholder="Chọn đối tượng áp dụng" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STUDENT">Sinh viên</SelectItem>
                                    <SelectItem value="LECTURER">Giảng viên</SelectItem>
                                    <SelectItem value="BOTH">Cả hai</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Xác định đợt đăng ký này dành cho đối tượng nào
                            </p>
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

                        <div className="space-y-2">
                            <Label htmlFor="templateId">Biểu mẫu báo cáo tiến độ</Label>
                            <Select
                                value={formData.templateId}
                                onValueChange={(value) => setFormData({ ...formData, templateId: value })}
                            >
                                <SelectTrigger id="templateId">
                                    <SelectValue placeholder="Chọn biểu mẫu (tùy chọn)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingTemplates ? (
                                        <SelectItem value="loading" disabled>
                                            Đang tải...
                                        </SelectItem>
                                    ) : templates && templates.length > 0 ? (
                                        <>
                                            <SelectItem value="none">Không sử dụng biểu mẫu</SelectItem>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        <SelectItem value="no-templates" disabled>
                                            Chưa có biểu mẫu nào
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Biểu mẫu này sẽ được sử dụng để hướng dẫn sinh viên báo cáo tiến độ
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Giảng viên hướng dẫn (Chọn nhiều)</Label>
                                {lecturers.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                            if (formData.instructorIds.length === lecturers.length) {
                                                setFormData({ ...formData, instructorIds: [] });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    instructorIds: lecturers.map((l) => l.id),
                                                });
                                            }
                                        }}
                                    >
                                        {formData.instructorIds.length === lecturers.length
                                            ? 'Bỏ chọn tất cả'
                                            : 'Chọn tất cả'}
                                    </Button>
                                )}
                            </div>
                            <div className="rounded-md border p-4">
                                {isLoadingLecturers ? (
                                    <p className="text-sm text-muted-foreground">Đang tải danh sách giảng viên...</p>
                                ) : lecturers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Chưa có giảng viên nào trong khoa</p>
                                ) : (
                                    <ScrollArea className="h-50">
                                        <div className="space-y-2">
                                            {lecturers.map((lecturer) => (
                                                <div key={lecturer.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`lecturer-${lecturer.id}`}
                                                        checked={formData.instructorIds.includes(lecturer.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setFormData({
                                                                    ...formData,
                                                                    instructorIds: [
                                                                        ...formData.instructorIds,
                                                                        lecturer.id,
                                                                    ],
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    instructorIds: formData.instructorIds.filter(
                                                                        (id) => id !== lecturer.id,
                                                                    ),
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`lecturer-${lecturer.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {lecturer.name} ({lecturer.email})
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Chọn giảng viên có thể hướng dẫn đề tài trong đợt này. Sinh viên chỉ được chọn giảng
                                viên từ danh sách này.
                            </p>
                            {formData.instructorIds.length > 0 && (
                                <p className="text-xs font-medium text-blue-600">
                                    Đã chọn: {formData.instructorIds.length} giảng viên
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Thành viên hội đồng (Chọn nhiều)</Label>
                                {lecturers.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                            if (formData.councilMemberIds.length === lecturers.length) {
                                                setFormData({ ...formData, councilMemberIds: [] });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    councilMemberIds: lecturers.map((l) => l.id),
                                                });
                                            }
                                        }}
                                    >
                                        {formData.councilMemberIds.length === lecturers.length
                                            ? 'Bỏ chọn tất cả'
                                            : 'Chọn tất cả'}
                                    </Button>
                                )}
                            </div>
                            <div className="rounded-md border p-4">
                                {isLoadingLecturers ? (
                                    <p className="text-sm text-muted-foreground">Đang tải danh sách giảng viên...</p>
                                ) : lecturers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Chưa có giảng viên nào trong khoa</p>
                                ) : (
                                    <ScrollArea className="h-50">
                                        <div className="space-y-2">
                                            {lecturers.map((member) => (
                                                <div key={member.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`council-${member.id}`}
                                                        checked={formData.councilMemberIds.includes(member.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setFormData({
                                                                    ...formData,
                                                                    councilMemberIds: [
                                                                        ...formData.councilMemberIds,
                                                                        member.id,
                                                                    ],
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    councilMemberIds: formData.councilMemberIds.filter(
                                                                        (id) => id !== member.id,
                                                                    ),
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`council-${member.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {member.name} ({member.email})
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Chọn thành viên hội đồng có thể chấm điểm và nghiệm thu đề tài trong đợt này.
                            </p>
                            {formData.councilMemberIds.length > 0 && (
                                <p className="text-xs font-medium text-emerald-600">
                                    Đã chọn: {formData.councilMemberIds.length} thành viên
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={createCallRound.isPending || updateCallRound.isPending}>
                                {createCallRound.isPending || updateCallRound.isPending
                                    ? 'Đang xử lý...'
                                    : editingCallRound
                                      ? 'Cập nhật'
                                      : 'Tạo mới'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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

            <Dialog
                open={Boolean(viewingCallRound)}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingCallRound(null);
                    }
                }}
            >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Chi tiết đợt đăng ký</DialogTitle>
                        <DialogDescription>Thông tin tổng quan và trạng thái vận hành của đợt đăng ký.</DialogDescription>
                    </DialogHeader>

                    {viewingCallRound && (
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Tên đợt</p>
                                <p className="font-medium">{viewingCallRound.name}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground">Bắt đầu đăng ký</p>
                                    <p>{new Date(viewingCallRound.registrationStartDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Kết thúc đăng ký</p>
                                    <p>{new Date(viewingCallRound.registrationEndDate).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground">Trạng thái phê duyệt</p>
                                    <div className="mt-1">{getStatusBadge(viewingCallRound)}</div>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Trạng thái vận hành</p>
                                    <div className="mt-1">{getRoundPhaseBadge(viewingCallRound)}</div>
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Mô tả</p>
                                <p>{viewingCallRound.description || 'Không có mô tả'}</p>
                            </div>
                        </div>
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
