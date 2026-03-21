'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCallRounds, useCreateCallRound, useUpdateCallRound, useDeleteCallRound } from '@/hooks/useCallRounds';
import { useProgressTemplates } from '@/hooks/useProgressTemplates';
import { useDepartments } from '@/hooks/useDepartments';
import { useMajors } from '@/hooks/useMajors';
import { useClasses } from '@/hooks/useClasses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveCallRound, rejectCallRound } from '@/api/call-rounds-approval';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Calendar, Building2, Info, Clock, DollarSign, FileText, Lock, Unlock, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MoneyInput } from '@/components/ui/money-input';
import type { CallRound } from '@/types/call-round.schema';

export default function CallRoundsPage() {
    const { data: callRounds = [], isLoading } = useCallRounds();
    const { data: templates = [] } = useProgressTemplates();
    const { data: departments = [] } = useDepartments();
    const { data: majorsData } = useMajors({ limit: 1000 });
    const majors = majorsData?.data ?? [];
    const { data: classesData } = useClasses({ limit: 1000 });
    const classes = classesData?.data ?? [];
    const createMutation = useCreateCallRound();
    const updateMutation = useUpdateCallRound();
    const deleteMutation = useDeleteCallRound();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<CallRound | null>(null);
    
    // Confirmation dialogs state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
    const [selectedRoundForAction, setSelectedRoundForAction] = useState<any>(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // Approval mutations
    const approveMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) => approveCallRound(id, note),
        onSuccess: () => {
            toast.success('Đã phê duyệt đợt đăng ký');
            queryClient.invalidateQueries({ queryKey: ['call-rounds'] });
            setApprovalDialogOpen(false);
            setSelectedRoundForAction(null);
            setApprovalNote('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Lỗi khi phê duyệt');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) => rejectCallRound(id, note),
        onSuccess: () => {
            toast.success('Đã từ chối đợt đăng ký');
            queryClient.invalidateQueries({ queryKey: ['call-rounds'] });
            setApprovalDialogOpen(false);
            setSelectedRoundForAction(null);
            setApprovalNote('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Lỗi khi từ chối');
        },
    });
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        registrationStartDate: string;
        registrationEndDate: string;
        projectStartDate: string;
        projectEndDate: string;
        reviewDeadline: string;
        reportingStartDate: string;
        maxProjects: string;
        budgetLimit: number | string;
        requirements: string;
        guidelines: string;
        contactInfo: string;
        isActive: boolean;
        isLocked: boolean;
        templateId: string;
        departmentIds: string[];
        majorIds: string[];
        classIds: string[];
    }>({
        name: '',
        description: '',
        registrationStartDate: '',
        registrationEndDate: '',
        projectStartDate: '',
        projectEndDate: '',
        reviewDeadline: '',
        reportingStartDate: '',
        maxProjects: '',
        budgetLimit: '',
        requirements: '',
        guidelines: '',
        contactInfo: '',
        isActive: true,
        isLocked: false,
        templateId: '',
        departmentIds: [],
        majorIds: [],
        classIds: [],
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            registrationStartDate: '',
            registrationEndDate: '',
            projectStartDate: '',
            projectEndDate: '',
            reviewDeadline: '',
            reportingStartDate: '',
            maxProjects: '',
            budgetLimit: '',
            requirements: '',
            guidelines: '',
            contactInfo: '',
            isActive: true,
            isLocked: false,
            templateId: '',
            departmentIds: [],
            majorIds: [],
            classIds: [],
        });
        setErrors({});
        setEditingRound(null);
    };

    const handleCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const handleEdit = (round: any) => {
        setEditingRound(round);
        setFormData({
            name: round.name,
            description: round.description || '',
            registrationStartDate: round.registrationStartDate 
                ? new Date(round.registrationStartDate).toISOString().split('T')[0]
                : new Date(round.startDate).toISOString().split('T')[0],
            registrationEndDate: round.registrationEndDate
                ? new Date(round.registrationEndDate).toISOString().split('T')[0]
                : new Date(round.endDate).toISOString().split('T')[0],
            projectStartDate: round.projectStartDate ? new Date(round.projectStartDate).toISOString().split('T')[0] : '',
            projectEndDate: round.projectEndDate ? new Date(round.projectEndDate).toISOString().split('T')[0] : '',
            reviewDeadline: round.reviewDeadline ? new Date(round.reviewDeadline).toISOString().split('T')[0] : '',
            reportingStartDate: round.reportingStartDate ? new Date(round.reportingStartDate).toISOString().split('T')[0] : '',
            maxProjects: round.maxProjects?.toString() || '',
            budgetLimit: round.budgetLimit?.toString() || '',
            requirements: round.requirements || '',
            guidelines: round.guidelines || '',
            contactInfo: round.contactInfo || '',
            isActive: round.isActive,
            isLocked: round.isLocked || false,
            templateId: round.templateId || '',
            departmentIds: round.departments?.map((d: any) => d.id) || [],
            majorIds: round.majors?.map((m: any) => m.id) || [],
            classIds: round.classes?.map((c: any) => c.id) || [],
        });
        setDialogOpen(true);
    };

    const handleSubmit = () => {
        // Validate required fields
        const newErrors: Record<string, boolean> = {};
        if (!formData.name) newErrors.name = true;
        if (!formData.registrationStartDate) newErrors.registrationStartDate = true;
        if (!formData.registrationEndDate) newErrors.registrationEndDate = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (đánh dấu *)');
            return;
        }

        const payload: any = {
            name: formData.name,
            description: formData.description || null,
            registrationStartDate: new Date(formData.registrationStartDate),
            registrationEndDate: new Date(formData.registrationEndDate),
            // Legacy fields - map to registration dates
            startDate: new Date(formData.registrationStartDate),
            endDate: new Date(formData.registrationEndDate),
            projectStartDate: formData.projectStartDate ? new Date(formData.projectStartDate) : null,
            projectEndDate: formData.projectEndDate ? new Date(formData.projectEndDate) : null,
            reviewDeadline: formData.reviewDeadline ? new Date(formData.reviewDeadline) : null,
            reportingStartDate: formData.reportingStartDate ? new Date(formData.reportingStartDate) : null,
            maxProjects: formData.maxProjects ? parseInt(formData.maxProjects) : null,
            budgetLimit: formData.budgetLimit ? (typeof formData.budgetLimit === 'number' ? formData.budgetLimit : parseFloat(formData.budgetLimit.toString())) : null,
            requirements: formData.requirements || null,
            guidelines: formData.guidelines || null,
            contactInfo: formData.contactInfo || null,
            isActive: formData.isActive,
            isLocked: formData.isLocked,
            templateId: formData.templateId || null,
            departmentIds: formData.departmentIds,
            majorIds: formData.majorIds,
            classIds: formData.classIds,
        };

        if (editingRound) {
            updateMutation.mutate(
                { id: editingRound.id, ...payload },
                {
                    onSuccess: () => {
                        toast.success('Cập nhật đợt đăng ký thành công');
                        setDialogOpen(false);
                        resetForm();
                    },
                    onError: (error: any) => {
                        console.error('Error updating call round:', error);
                        toast.error(error.response?.data?.error || 'Lỗi khi cập nhật');
                    },
                },
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    toast.success('Tạo đợt đăng ký thành công');
                    setDialogOpen(false);
                    resetForm();
                },
                onError: (error: any) => {
                    console.error('Error creating call round:', error);
                    toast.error(error.response?.data?.error || 'Lỗi khi tạo đợt đăng ký');
                },
            });
        }
    };

    const handleDeleteClick = (round: any) => {
        setSelectedRoundForAction(round);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedRoundForAction) return;
        
        deleteMutation.mutate(selectedRoundForAction.id, {
            onSuccess: () => {
                toast.success('Đã xóa đợt đăng ký');
                setDeleteConfirmOpen(false);
                setSelectedRoundForAction(null);
            },
            onError: () => toast.error('Lỗi khi xóa đợt đăng ký'),
        });
    };

    const handleToggleLockClick = (round: any) => {
        const newLockState = !round.isLocked;
        if (newLockState) {
            // If locking, show confirmation
            setSelectedRoundForAction(round);
            setLockConfirmOpen(true);
        } else {
            // If unlocking, just do it
            executeToggleLock(round.id, false);
        }
    };

    const confirmLock = () => {
        if (!selectedRoundForAction) return;
        executeToggleLock(selectedRoundForAction.id, true);
        setLockConfirmOpen(false);
        setSelectedRoundForAction(null);
    };

    const executeToggleLock = (id: string, isLocked: boolean) => {
        updateMutation.mutate(
            { id, isLocked },
            {
                onSuccess: () => toast.success(isLocked ? 'Đã khóa đợt đăng ký' : 'Đã mở khóa đợt đăng ký'),
                onError: () => toast.error('Lỗi khi cập nhật trạng thái khóa'),
            }
        );
    };

    // Filter majors and classes based on selected departments
    const filteredMajors = majors.filter(
        (major: any) => formData.departmentIds.length === 0 || formData.departmentIds.includes(major.departmentId),
    );

    const filteredClasses = classes.filter(
        (cls: any) => formData.majorIds.length === 0 || formData.majorIds.includes(cls.majorId),
    );

    const handleDepartmentChange = (departmentId: string) => {
        const newDepartmentIds = formData.departmentIds.includes(departmentId)
            ? formData.departmentIds.filter((id) => id !== departmentId)
            : [...formData.departmentIds, departmentId];

        setFormData((prev) => ({
            ...prev,
            departmentIds: newDepartmentIds,
            majorIds: [],
            classIds: [],
        }));
    };

    const handleMajorChange = (majorId: string) => {
        const newMajorIds = formData.majorIds.includes(majorId)
            ? formData.majorIds.filter((id) => id !== majorId)
            : [...formData.majorIds, majorId];

        setFormData((prev) => ({
            ...prev,
            majorIds: newMajorIds,
            classIds: [],
        }));
    };

    const handleClassChange = (classId: string) => {
        const newClassIds = formData.classIds.includes(classId)
            ? formData.classIds.filter((id) => id !== classId)
            : [...formData.classIds, classId];

        setFormData((prev) => ({
            ...prev,
            classIds: newClassIds,
        }));
    };

    const isReadOnly = editingRound?.isLocked || false;

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-2xl">Quản lý Đợt Đăng Ký</CardTitle>
                        <CardDescription>Tạo và quản lý các đợt đăng ký đề tài nghiên cứu</CardDescription>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo đợt mới
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : callRounds.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Chưa có đợt đăng ký nào</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên đợt</TableHead>
                                        <TableHead>Thời gian đăng ký</TableHead>
                                        <TableHead>Biểu mẫu</TableHead>
                                        <TableHead>Số đề tài</TableHead>
                                        <TableHead>Trạng thái duyệt</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {callRounds.map((round: any) => {
                                        const getApprovalBadge = () => {
                                            switch (round.approvalStatus) {
                                                case 'PENDING_APPROVAL':
                                                    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Chờ duyệt</Badge>;
                                                case 'APPROVED':
                                                    return <Badge variant="default" className="bg-emerald-500">Đã duyệt</Badge>;
                                                case 'REJECTED':
                                                    return <Badge variant="destructive">Bị từ chối</Badge>;
                                                default:
                                                    return <Badge variant="secondary">{round.approvalStatus}</Badge>;
                                            }
                                        };
                                        
                                        return (
                                            <TableRow key={round.id}>
                                                <TableCell className="font-medium">
                                                    <div>{round.name}</div>
                                                    {round.description && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {round.description.substring(0, 50)}
                                                            {round.description.length > 50 && '...'}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <div>
                                                            {new Date(round.registrationStartDate || round.startDate).toLocaleDateString('vi-VN')} - {new Date(round.registrationEndDate || round.endDate).toLocaleDateString('vi-VN')}
                                                        </div>
                                                        {round.maxProjects && (
                                                            <Badge variant="outline" className="text-xs w-fit">
                                                                Tối đa: {round.maxProjects} đề tài
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {round.template ? (
                                                        <Badge variant="secondary">{round.template.name}</Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Chưa gán</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{round._count?.projects || 0}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {getApprovalBadge()}
                                                        {round.approvalNote && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {round.approvalNote}
                                                            </span>
                                                        )}
                                                        {round.approvalStatus === 'PENDING_APPROVAL' && (
                                                            <div className="flex gap-1 mt-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                                    onClick={() => {
                                                                        setSelectedRoundForAction(round);
                                                                        setApprovalDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Duyệt
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => {
                                                                        setSelectedRoundForAction(round);
                                                                        setApprovalDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Từ chối
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {round.isActive ? (
                                                            <Badge variant="default" className="w-fit">Hoạt động</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="w-fit">Tạm ngưng</Badge>
                                                        )}
                                                        {round.isLocked && (
                                                            <Badge variant="destructive" className="w-fit flex items-center gap-1">
                                                                <Lock className="h-3 w-3" /> Đã khóa
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={() => handleToggleLockClick(round)}
                                                            title={round.isLocked ? "Mở khóa" : "Khóa chỉnh sửa"}
                                                        >
                                                            {round.isLocked ? (
                                                                <Lock className="h-4 w-4 text-destructive" />
                                                            ) : (
                                                                <Unlock className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={() => handleEdit(round)}
                                                            title={round.isLocked ? "Xem chi tiết" : "Chỉnh sửa"}
                                                        >
                                                            {round.isLocked ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteClick(round)}
                                                            disabled={(round._count?.projects || 0) > 0 || round.isLocked}
                                                            title={round.isLocked ? "Đã khóa" : "Xóa"}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRound ? (isReadOnly ? 'Chi tiết' : 'Chỉnh sửa') : 'Tạo'} Đợt Đăng Ký
                            {isReadOnly && <Badge variant="destructive" className="ml-2">Đã khóa</Badge>}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRound 
                                ? (isReadOnly ? 'Xem thông tin chi tiết đợt đăng ký' : 'Cập nhật thông tin đợt đăng ký') 
                                : 'Nhập thông tin đợt đăng ký mới'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto px-1">
                        {/* Thông tin cơ bản */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                <Label className="font-semibold">Thông tin cơ bản</Label>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className={errors.name ? 'text-red-500' : ''}>
                                    Tên đợt đăng ký <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value });
                                        if (errors.name) setErrors({ ...errors, name: false });
                                    }}
                                    placeholder="VD: Đợt đăng ký đề tài NCKH Sinh viên 2024-2025"
                                    className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    disabled={isReadOnly}
                                />
                                {errors.name && <p className="text-sm text-red-500">Vui lòng nhập tên đợt đăng ký</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Mô tả</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mô tả ngắn gọn về đợt đăng ký..."
                                    rows={3}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Thời gian đăng ký */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <Label className="font-semibold">Thời gian đăng ký đề tài</Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className={errors.registrationStartDate ? 'text-red-500' : ''}>
                                        Ngày bắt đầu đăng ký <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.registrationStartDate}
                                        onChange={(e) => {
                                            setFormData({ ...formData, registrationStartDate: e.target.value });
                                            if (errors.registrationStartDate) setErrors({ ...errors, registrationStartDate: false });
                                        }}
                                        className={errors.registrationStartDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        disabled={isReadOnly}
                                    />
                                    {errors.registrationStartDate && <p className="text-sm text-red-500">Vui lòng chọn ngày bắt đầu</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className={errors.registrationEndDate ? 'text-red-500' : ''}>
                                        Ngày kết thúc đăng ký <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.registrationEndDate}
                                        onChange={(e) => {
                                            setFormData({ ...formData, registrationEndDate: e.target.value });
                                            if (errors.registrationEndDate) setErrors({ ...errors, registrationEndDate: false });
                                        }}
                                        className={errors.registrationEndDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        disabled={isReadOnly}
                                    />
                                    {errors.registrationEndDate && <p className="text-sm text-red-500">Vui lòng chọn ngày kết thúc</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Hạn chót duyệt đề tài</Label>
                                <Input
                                    type="date"
                                    value={formData.reviewDeadline}
                                    onChange={(e) => setFormData({ ...formData, reviewDeadline: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Thời gian thực hiện đề tài */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <Label className="font-semibold">Thời gian thực hiện đề tài</Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Ngày bắt đầu thực hiện</Label>
                                    <Input
                                        type="date"
                                        value={formData.projectStartDate}
                                        onChange={(e) => setFormData({ ...formData, projectStartDate: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ngày dự kiến kết thúc</Label>
                                    <Input
                                        type="date"
                                        value={formData.projectEndDate}
                                        onChange={(e) => setFormData({ ...formData, projectEndDate: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Ngày bắt đầu báo cáo tiến độ</Label>
                                <Input
                                    type="date"
                                    value={formData.reportingStartDate}
                                    onChange={(e) => setFormData({ ...formData, reportingStartDate: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Giới hạn và ngân sách */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <Label className="font-semibold">Giới hạn và ngân sách</Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Số lượng đề tài tối đa</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.maxProjects}
                                        onChange={(e) => setFormData({ ...formData, maxProjects: e.target.value })}
                                        placeholder="VD: 50"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ngân sách tối đa</Label>
                                    <MoneyInput
                                        value={formData.budgetLimit}
                                        onChange={(value) => setFormData({ ...formData, budgetLimit: value })}
                                        placeholder="VD: 50.000.000"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Thông tin chi tiết */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <Label className="font-semibold">Thông tin chi tiết</Label>
                            </div>

                            <div className="space-y-2">
                                <Label>Yêu cầu, điều kiện đăng ký</Label>
                                <Textarea
                                    value={formData.requirements}
                                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                    placeholder="VD: Sinh viên năm 3, 4 có GPA >= 2.5..."
                                    rows={3}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Hướng dẫn đăng ký</Label>
                                <Textarea
                                    value={formData.guidelines}
                                    onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
                                    placeholder="VD: 1. Đăng nhập hệ thống... 2. Điền đầy đủ thông tin..."
                                    rows={3}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Thông tin liên hệ</Label>
                                <Textarea
                                    value={formData.contactInfo}
                                    onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                                    placeholder="VD: Phòng KHCN - Email: khcn@university.edu.vn - SĐT: 0123456789"
                                    rows={2}
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Biểu mẫu báo cáo tiến độ</Label>
                                <Select
                                    value={formData.templateId || undefined}
                                    onValueChange={(v) => setFormData({ ...formData, templateId: v === 'none' ? '' : v })}
                                    disabled={isReadOnly}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn biểu mẫu..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Không gán</SelectItem>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        {/* Phân quyền tổ chức */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <Label className="font-semibold">Phân quyền tổ chức (tùy chọn)</Label>
                            </div>

                            <div className="space-y-2">
                                <Label>Khoa</Label>
                                <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                    {departments.map((dept: any) => (
                                        <div key={dept.id} className="flex items-center gap-2 p-1">
                                            <input
                                                type="checkbox"
                                                id={`dept-${dept.id}`}
                                                checked={formData.departmentIds.includes(dept.id)}
                                                onChange={() => handleDepartmentChange(dept.id)}
                                                className="h-4 w-4"
                                                disabled={isReadOnly}
                                            />
                                            <Label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">
                                                {dept.code} - {dept.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {formData.departmentIds.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Ngành học</Label>
                                    <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                        {filteredMajors.map((major: any) => (
                                            <div key={major.id} className="flex items-center gap-2 p-1">
                                                <input
                                                    type="checkbox"
                                                    id={`major-${major.id}`}
                                                    checked={formData.majorIds.includes(major.id)}
                                                    onChange={() => handleMajorChange(major.id)}
                                                    className="h-4 w-4"
                                                    disabled={isReadOnly}
                                                />
                                                <Label htmlFor={`major-${major.id}`} className="text-sm cursor-pointer">
                                                    {major.code} - {major.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.majorIds.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Lớp</Label>
                                    <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                                        {filteredClasses.map((cls: any) => (
                                            <div key={cls.id} className="flex items-center gap-2 p-1">
                                                <input
                                                    type="checkbox"
                                                    id={`class-${cls.id}`}
                                                    checked={formData.classIds.includes(cls.id)}
                                                    onChange={() => handleClassChange(cls.id)}
                                                    className="h-4 w-4"
                                                    disabled={isReadOnly}
                                                />
                                                <Label htmlFor={`class-${cls.id}`} className="text-sm cursor-pointer">
                                                    {cls.code} - {cls.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Trạng thái */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="h-4 w-4"
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="isActive">Đợt đang hoạt động</Label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isLocked"
                                    checked={formData.isLocked}
                                    onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                                    className="h-4 w-4"
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="isLocked" className="flex items-center gap-1">
                                    <Lock className="h-4 w-4" /> Khóa chỉnh sửa (không cho phép thay đổi sau khi tạo/cập nhật)
                                </Label>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <Button
                                onClick={handleSubmit}
                                className="w-full"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang xử lý...
                                    </div>
                                ) : (
                                    editingRound ? 'Cập nhật đợt đăng ký' : 'Tạo đợt đăng ký'
                                )}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Xác nhận xóa
                        </DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa đợt đăng ký <span className="font-semibold text-foreground">{selectedRoundForAction?.name}</span>?
                            Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Hủy
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lock Confirmation Dialog */}
            <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Lock className="h-5 w-5" />
                            Xác nhận khóa đợt đăng ký
                        </DialogTitle>
                        <DialogDescription>
                            Bạn đang chuẩn bị khóa đợt đăng ký <span className="font-semibold text-foreground">{selectedRoundForAction?.name}</span>.
                            <br /><br />
                            Sau khi khóa, <strong>không ai có thể chỉnh sửa</strong> thông tin của đợt đăng ký này nữa. Bạn có chắc chắn muốn tiếp tục?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setLockConfirmOpen(false)}>
                            Hủy
                        </Button>
                        <Button 
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={confirmLock}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Đang khóa...' : 'Khóa đợt đăng ký'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            Phê duyệt đợt đăng ký
                        </DialogTitle>
                        <DialogDescription>
                            Đợt đăng ký: <span className="font-semibold text-foreground">{selectedRoundForAction?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Ghi chú (tùy chọn)</Label>
                            <Textarea
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                                placeholder="Nhập ghi chú nếu có..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => {
                            setApprovalDialogOpen(false);
                            setApprovalNote('');
                        }}>
                            Hủy
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={() => {
                                if (selectedRoundForAction) {
                                    rejectMutation.mutate({ 
                                        id: selectedRoundForAction.id, 
                                        note: approvalNote || undefined 
                                    });
                                }
                            }}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                        >
                            {rejectMutation.isPending ? 'Đang xử lý...' : 'Từ chối'}
                        </Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                if (selectedRoundForAction) {
                                    approveMutation.mutate({ 
                                        id: selectedRoundForAction.id, 
                                        note: approvalNote || undefined 
                                    });
                                }
                            }}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                            {approveMutation.isPending ? 'Đang xử lý...' : 'Phê duyệt'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
