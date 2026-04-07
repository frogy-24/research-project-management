'use client';

import * as React from 'react';
import { PlusCircle, Paperclip, Upload, Trash2, FileText, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCreateCallRound, useUpdateCallRound } from '@/hooks/useCallRounds';
import { useProgressTemplates } from '@/hooks/useProgressTemplates';
import { useUsers } from '@/hooks/useUsers';
import { callRoundsApi } from '@/api/call-rounds';
import type { CallRound, CallRoundAttachment } from '@/types/call-round.schema';
import type { User } from '@/types/user.schema';
import { MoneyInput } from '../ui/money-input';

export type CallRoundFormData = {
    name: string;
    description: string;
    registrationStartDate: string;
    registrationEndDate: string;
    projectStartDate: string;
    projectEndDate: string;
    budgetLimit?: number;
    defenseDate: string;
    projectLockDate: string;
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
    defenseDate: '',
    projectLockDate: '',
    maxProjects: '',
    requirements: '',
    templateId: '',
    instructorIds: [],
    councilMemberIds: [],
    applicableFor: 'STUDENT',
};

interface CallRoundFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingCallRound: CallRound | null;
    departmentId?: string | null;
    onSuccess?: () => void;
}

export function CallRoundFormDialog({
    open,
    onOpenChange,
    editingCallRound,
    departmentId,
    onSuccess,
}: CallRoundFormDialogProps) {
    const [formData, setFormData] = React.useState<CallRoundFormData>(initialFormData);
    const [attachments, setAttachments] = React.useState<CallRoundAttachment[]>([]);
    const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const createCallRound = useCreateCallRound();
    const updateCallRound = useUpdateCallRound();
    const { data: templates, isLoading: isLoadingTemplates } = useProgressTemplates(true);
    const { data: usersData, isLoading: isLoadingLecturers } = useUsers({
        role: 'LECTURER',
        departmentId: departmentId || undefined,
        limit: 100,
    });
    const lecturers = usersData?.data || [];

    // Fetch attachments when editing
    const { data: fetchedAttachments } = useQuery({
        queryKey: ['call-round-attachments', editingCallRound?.id],
        queryFn: () => callRoundsApi.getAttachments(editingCallRound!.id),
        enabled: !!editingCallRound?.id && open,
    });

    React.useEffect(() => {
        if (fetchedAttachments) {
            setAttachments(fetchedAttachments);
        }
    }, [fetchedAttachments]);

    React.useEffect(() => {
        if (editingCallRound) {
            setFormData({
                name: editingCallRound.name,
                description: editingCallRound.description || '',
                registrationStartDate: new Date(editingCallRound.registrationStartDate).toISOString().split('T')[0],
                registrationEndDate: new Date(editingCallRound.registrationEndDate).toISOString().split('T')[0],
                projectStartDate: editingCallRound.projectStartDate
                    ? new Date(editingCallRound.projectStartDate).toISOString().split('T')[0]
                    : '',
                projectEndDate: editingCallRound.projectEndDate
                    ? new Date(editingCallRound.projectEndDate).toISOString().split('T')[0]
                    : '',
                defenseDate: editingCallRound.defenseDate
                    ? new Date(editingCallRound.defenseDate).toISOString().split('T')[0]
                    : '',
                projectLockDate: editingCallRound.projectLockDate
                    ? new Date(editingCallRound.projectLockDate).toISOString().split('T')[0]
                    : '',
                maxProjects: editingCallRound.maxProjects?.toString() || '',
                requirements: editingCallRound.requirements || '',
                templateId: editingCallRound.templateId || '',
                instructorIds: editingCallRound.availableInstructors?.map((i) => i.instructorId) || [],
                councilMemberIds: editingCallRound.availableCouncilMembers?.map((c) => c.councilMemberId) || [],
                applicableFor: editingCallRound.applicableFor || 'STUDENT',
            });
        } else {
            setFormData(initialFormData);
        }
    }, [editingCallRound, open]);

    const handleClose = () => {
        setPendingFiles([]);
        setAttachments([]);
        onOpenChange(false);
    };

    // File upload handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleRemovePendingFile = (index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!editingCallRound?.id) return;
        try {
            await callRoundsApi.deleteAttachment(editingCallRound.id, attachmentId);
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
            queryClient.invalidateQueries({ queryKey: ['call-round-attachments', editingCallRound.id] });
            toast.success('Đã xóa tệp đính kèm');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Không thể xóa tệp đính kèm');
        }
    };

    const handleUploadPendingFiles = async (callRoundId: string) => {
        for (const file of pendingFiles) {
            const formData = new FormData();
            formData.append('file', file);
            await callRoundsApi.uploadAttachment(callRoundId, formData);
        }
        setPendingFiles([]);
        queryClient.invalidateQueries({ queryKey: ['call-round-attachments', callRoundId] });
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
                defenseDate: formData.defenseDate ? new Date(formData.defenseDate) : undefined,
                projectLockDate: formData.projectLockDate ? new Date(formData.projectLockDate) : undefined,
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
                // Upload pending files after update
                if (pendingFiles.length > 0) {
                    await handleUploadPendingFiles(editingCallRound.id);
                }
                toast.success('Cập nhật đợt đăng ký thành công!');
            } else {
                const result = await createCallRound.mutateAsync(payload);
                // Upload pending files after create
                if (pendingFiles.length > 0 && result?.id) {
                    await handleUploadPendingFiles(result.id);
                }
                toast.success('Tạo đợt đăng ký thành công! Đang chờ Admin phê duyệt.');
            }

            onSuccess?.();
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Có lỗi xảy ra!');
        }
    };

    const handleSelectAllLecturers = (field: 'instructorIds' | 'councilMemberIds') => {
        if (formData[field].length === lecturers.length) {
            setFormData({ ...formData, [field]: [] });
        } else {
            setFormData({ ...formData, [field]: lecturers.map((l: User) => l.id) });
        }
    };

    const handleToggleLecturer = (field: 'instructorIds' | 'councilMemberIds', lecturerId: string) => {
        if (formData[field].includes(lecturerId)) {
            setFormData({ ...formData, [field]: formData[field].filter((id: string) => id !== lecturerId) });
        } else {
            setFormData({ ...formData, [field]: [...formData[field], lecturerId] });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                                onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
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
                         <div className="space-y-2">
                            <Label htmlFor="projectLockDate">Ngày chốt đề tài</Label>
                            <Input
                                id="projectLockDate"
                                type="date"
                                value={formData.projectLockDate}
                                onChange={(e) => setFormData({ ...formData, projectLockDate: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Hạn chót để đăng ký/thay đổi đề tài</p>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="defenseDate">Ngày bảo vệ đề tài</Label>
                            <Input
                                id="defenseDate"
                                type="date"
                                value={formData.defenseDate}
                                onChange={(e) => setFormData({ ...formData, defenseDate: e.target.value })}
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
                        <Label>Mức hỗ trợ tối đa</Label>
                        <MoneyInput
                            value={formData.budgetLimit}
                            onChange={(value) => setFormData({ ...formData, budgetLimit: value })}
                            placeholder="VD: 2.000.000"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="applicableFor">Đối tượng áp dụng *</Label>
                        <Select
                            value={formData.applicableFor}
                            onValueChange={(value: 'STUDENT' | 'LECTURER' | 'BOTH') =>
                                setFormData({ ...formData, applicableFor: value })
                            }
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
                        <p className="text-xs text-muted-foreground">Xác định đợt đăng ký này dành cho đối tượng nào</p>
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

                    {/* Instructor Selection */}
                    <LecturerSelection
                        label="Giảng viên hướng dẫn"
                        field="instructorIds"
                        formData={formData}
                        lecturers={lecturers}
                        isLoading={isLoadingLecturers}
                        onSelectAll={handleSelectAllLecturers}
                        onToggle={handleToggleLecturer}
                        hint="Chọn giảng viên có thể hướng dẫn đề tài trong đợt này. Sinh viên chỉ được chọn giảng viên từ danh sách này."
                        selectedColor="text-blue-600"
                    />

                    {/* Council Member Selection */}
                    <LecturerSelection
                        label="Thành viên hội đồng"
                        field="councilMemberIds"
                        formData={formData}
                        lecturers={lecturers}
                        isLoading={isLoadingLecturers}
                        onSelectAll={handleSelectAllLecturers}
                        onToggle={handleToggleLecturer}
                        hint="Chọn thành viên hội đồng có thể chấm điểm và nghiệm thu đề tài trong đợt này."
                        selectedColor="text-emerald-600"
                    />

                    {/* File Attachments Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Tệp đính kèm</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-3 h-3 mr-1" />
                                Thêm tệp
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* Existing attachments */}
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                {attachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center justify-between p-2 rounded-md border bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {attachment.fileSize
                                                        ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                                                        : 'N/A'}{' '}
                                                    •{' '}
                                                    {attachment.createdAt
                                                        ? new Date(attachment.createdAt).toLocaleDateString('vi-VN')
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                asChild
                                            >
                                                <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                                onClick={() => handleDeleteAttachment(attachment.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pending files (not yet uploaded) */}
                        {pendingFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-amber-600 font-medium">
                                    Tệp chưa tải lên (sẽ được tải lên khi lưu):
                                </p>
                                {pendingFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-2 rounded-md border bg-amber-50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Paperclip className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                            onClick={() => handleRemovePendingFile(index)}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {attachments.length === 0 && pendingFiles.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed rounded-md">
                                <Paperclip className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-muted-foreground">Chưa có tệp đính kèm</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PDF, Word, Excel, PNG, JPG (tối đa 10MB/tệp)
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
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
    );
}

// Sub-component for lecturer selection to avoid duplication
function LecturerSelection({
    label,
    field,
    formData,
    lecturers,
    isLoading,
    onSelectAll,
    onToggle,
    hint,
    selectedColor,
}: {
    label: string;
    field: 'instructorIds' | 'councilMemberIds';
    formData: CallRoundFormData;
    lecturers: User[];
    isLoading: boolean;
    onSelectAll: (field: 'instructorIds' | 'councilMemberIds') => void;
    onToggle: (field: 'instructorIds' | 'councilMemberIds', lecturerId: string) => void;
    hint: string;
    selectedColor: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{label} (Chọn nhiều)</Label>
                {lecturers.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onSelectAll(field)}
                    >
                        {formData[field].length === lecturers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </Button>
                )}
            </div>
            <div className="rounded-md border p-4">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Đang tải danh sách giảng viên...</p>
                ) : lecturers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có giảng viên nào trong khoa</p>
                ) : (
                    <ScrollArea className="h-50">
                        <div className="space-y-2">
                            {lecturers.map((lecturer) => (
                                <div key={lecturer.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`${field}-${lecturer.id}`}
                                        checked={formData[field].includes(lecturer.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                onToggle(field, lecturer.id);
                                            } else {
                                                onToggle(field, lecturer.id);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor={`${field}-${lecturer.id}`}
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
            <p className="text-xs text-muted-foreground">{hint}</p>
            {formData[field].length > 0 && (
                <p className={`text-xs font-medium ${selectedColor}`}>Đã chọn: {formData[field].length} giảng viên</p>
            )}
        </div>
    );
}
