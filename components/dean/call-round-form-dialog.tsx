'use client';

import * as React from 'react';
import {
    PlusCircle,
    Paperclip,
    Upload,
    Trash2,
    FileText,
    ExternalLink,
    X,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
} from 'lucide-react';
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

const toDateInputValue = (value: Date | string | null | undefined): string => {
    if (!value) {
        return '';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toDateTimeLocalValue = (value: Date | string | null | undefined): string => {
    if (!value) {
        return '';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hour = String(parsedDate.getHours()).padStart(2, '0');
    const minute = String(parsedDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
};

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
    invitationDeadline: string;
    maxProjects: string;
    requirements: string;
    templateId: string;
    instructorIds: string[];
    councilMemberIds: string[];
    applicableFor: 'STUDENT' | 'LECTURER' | 'BOTH';
};

type PendingAttachmentRow = {
    id: string;
    displayName: string;
    file: File | null;
};

const initialFormData: CallRoundFormData = {
    name: '',
    description: '',
    registrationStartDate: '',
    registrationEndDate: '',
    projectStartDate: '',
    projectEndDate: '',
    budgetLimit: undefined,
    defenseDate: '',
    projectLockDate: '',
    invitationDeadline: '',
    maxProjects: '',
    requirements: '',
    templateId: '',
    instructorIds: [],
    councilMemberIds: [],
    applicableFor: 'STUDENT',
};

const createPendingAttachmentRow = (): PendingAttachmentRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: '',
    file: null,
});

const normalizePendingAttachmentRows = (rows: PendingAttachmentRow[]) => {
    const normalized = rows
        .map((row) => ({
            id: row.id,
            displayName: row.displayName.trim(),
            file: row.file,
        }))
        .filter((row) => row.displayName.length > 0 || row.file !== null);

    const hasIncomplete = normalized.some((row) => row.displayName.length === 0 || row.file === null);

    return {
        hasIncomplete,
        rows: normalized.filter((row): row is { id: string; displayName: string; file: File } => {
            return row.displayName.length > 0 && row.file !== null;
        }),
        importantFileNamesText: normalized
            .map((row) => row.displayName)
            .filter((name) => name.length > 0)
            .join('\n'),
    };
};

const normalizeImportantFileNames = (value: string): string | undefined => {
    const lines = value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return undefined;
    }

    return lines.join('\n');
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
    const [pendingAttachmentRows, setPendingAttachmentRows] = React.useState<PendingAttachmentRow[]>([
        createPendingAttachmentRow(),
    ]);
    const [pendingAdditionalFiles, setPendingAdditionalFiles] = React.useState<File[]>([]);
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
    const additionalFilesInputRef = React.useRef<HTMLInputElement | null>(null);
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
                registrationStartDate: toDateInputValue(editingCallRound.registrationStartDate),
                registrationEndDate: toDateInputValue(editingCallRound.registrationEndDate),
                projectStartDate: editingCallRound.projectStartDate
                    ? toDateInputValue(editingCallRound.projectStartDate)
                    : '',
                projectEndDate: editingCallRound.projectEndDate
                    ? toDateInputValue(editingCallRound.projectEndDate)
                    : '',
                budgetLimit: editingCallRound.budgetLimit
                    ? Number(editingCallRound.budgetLimit)
                    : undefined,
                defenseDate: editingCallRound.defenseDate
                    ? toDateTimeLocalValue(editingCallRound.defenseDate)
                    : '',
                projectLockDate: editingCallRound.projectLockDate
                    ? toDateInputValue(editingCallRound.projectLockDate)
                    : '',
                invitationDeadline: editingCallRound.invitationDeadline
                    ? toDateTimeLocalValue(editingCallRound.invitationDeadline)
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

        setPendingAttachmentRows([createPendingAttachmentRow()]);
        setPendingAdditionalFiles([]);
    }, [editingCallRound, open]);

    const handleClose = () => {
        setPendingAttachmentRows([createPendingAttachmentRow()]);
        setPendingAdditionalFiles([]);
        setAttachments([]);
        onOpenChange(false);
    };

    const handleAddAttachmentRow = () => {
        setPendingAttachmentRows((prev) => [...prev, createPendingAttachmentRow()]);
    };

    const handleRemoveAttachmentRow = (rowId: string) => {
        setPendingAttachmentRows((prev) => {
            if (prev.length === 1) {
                return [{ ...prev[0], displayName: '', file: null }];
            }

            return prev.filter((row) => row.id !== rowId);
        });

        if (fileInputRefs.current[rowId]) {
            delete fileInputRefs.current[rowId];
        }
    };

    const handlePendingAttachmentNameChange = (rowId: string, value: string) => {
        setPendingAttachmentRows((prev) =>
            prev.map((row) => (row.id === rowId ? { ...row, displayName: value } : row)),
        );
    };

    const handlePendingAttachmentFileChange = (rowId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null;

        setPendingAttachmentRows((prev) =>
            prev.map((row) => {
                if (row.id !== rowId) {
                    return row;
                }

                if (!selectedFile) {
                    return { ...row, file: null };
                }

                return {
                    ...row,
                    file: selectedFile,
                    displayName: row.displayName.trim().length > 0 ? row.displayName : selectedFile.name,
                };
            }),
        );
    };

    const handleChooseRowFile = (rowId: string) => {
        fileInputRefs.current[rowId]?.click();
    };

    const handleChooseAdditionalFiles = () => {
        additionalFilesInputRef.current?.click();
    };

    const handleAdditionalFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        if (selectedFiles.length === 0) {
            return;
        }

        setPendingAdditionalFiles((prev) => {
            const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const newFiles = selectedFiles.filter((file) => {
                const key = `${file.name}-${file.size}-${file.lastModified}`;
                return !existingKeys.has(key);
            });
            return [...prev, ...newFiles];
        });

        event.target.value = '';
    };

    const handleRemoveAdditionalFile = (fileIndex: number) => {
        setPendingAdditionalFiles((prev) => prev.filter((_, index) => index !== fileIndex));
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

    const handleUploadPendingFiles = async (
        callRoundId: string,
        rows: Array<{ id: string; displayName: string; file: File }>,
    ) => {
        for (const row of rows) {
            const formData = new FormData();
            formData.append('file', row.file);
            formData.append('description', row.displayName);
            await callRoundsApi.uploadAttachment(callRoundId, formData);
        }
        setPendingAttachmentRows([createPendingAttachmentRow()]);
        queryClient.invalidateQueries({ queryKey: ['call-round-attachments', callRoundId] });
    };

    const handleUploadPendingAdditionalFiles = async (callRoundId: string, files: File[]) => {
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('description', file.name);
            await callRoundsApi.uploadAttachment(callRoundId, formData);
        }
        setPendingAdditionalFiles([]);
        queryClient.invalidateQueries({ queryKey: ['call-round-attachments', callRoundId] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const normalizedPendingAttachments = normalizePendingAttachmentRows(pendingAttachmentRows);
            if (normalizedPendingAttachments.hasIncomplete) {
                toast.error('Mỗi dòng file quan trọng cần nhập đủ tên file và chọn file upload.');
                return;
            }

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
                invitationDeadline: formData.invitationDeadline ? new Date(formData.invitationDeadline) : undefined,
                maxProjects: formData.maxProjects ? parseInt(formData.maxProjects) : undefined,
                budgetLimit: formData.budgetLimit ?? undefined,
                requirements: formData.requirements || undefined,
                guidelines: normalizeImportantFileNames(normalizedPendingAttachments.importantFileNamesText),
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
                if (normalizedPendingAttachments.rows.length > 0) {
                    await handleUploadPendingFiles(editingCallRound.id, normalizedPendingAttachments.rows);
                }
                if (pendingAdditionalFiles.length > 0) {
                    await handleUploadPendingAdditionalFiles(editingCallRound.id, pendingAdditionalFiles);
                }
                toast.success('Cập nhật đợt đăng ký thành công!');
            } else {
                const result = await createCallRound.mutateAsync(payload);
                // Upload pending files after create
                if (normalizedPendingAttachments.rows.length > 0 && result?.id) {
                    await handleUploadPendingFiles(result.id, normalizedPendingAttachments.rows);
                }
                if (pendingAdditionalFiles.length > 0 && result?.id) {
                    await handleUploadPendingAdditionalFiles(result.id, pendingAdditionalFiles);
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

    const importantFileNameSet = React.useMemo(() => {
        const guidelineText = editingCallRound?.guidelines ?? '';
        const names = guidelineText
            .split('\n')
            .map((line) => line.trim().toLowerCase())
            .filter((line) => line.length > 0);

        return new Set(names);
    }, [editingCallRound?.guidelines]);

    const importantAttachments = React.useMemo(() => {
        if (attachments.length === 0 || importantFileNameSet.size === 0) {
            return [];
        }

        return attachments.filter((attachment) => {
            const normalizedDescription = attachment.description?.trim().toLowerCase();
            if (!normalizedDescription) {
                return false;
            }

            return importantFileNameSet.has(normalizedDescription);
        });
    }, [attachments, importantFileNameSet]);

    const additionalAttachments = React.useMemo(() => {
        if (attachments.length === 0) {
            return [];
        }

        const importantAttachmentIds = new Set(importantAttachments.map((attachment) => attachment.id));
        return attachments.filter((attachment) => !importantAttachmentIds.has(attachment.id));
    }, [attachments, importantAttachments]);

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
                            <Label htmlFor="defenseDate">Ngày giờ bảo vệ đề tài (dự kiến)</Label>
                            <Input
                                id="defenseDate"
                                type="datetime-local"
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
                        <Label>Mức hỗ trợ tối đa trên 1 đề tài</Label>
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
                        <Label htmlFor="requirements">Lưu ý (*)</Label>
                        <Textarea
                            id="requirements"
                            value={formData.requirements}
                            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            placeholder="Nhập các lưu ý cần hiển thị cho sinh viên/giảng viên khi đăng ký đề tài..."
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Nội dung này sẽ hiển thị tại trang đăng ký đề tài của sinh viên và giảng viên.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Danh sách file quan trọng</Label>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleAddAttachmentRow}>
                                <PlusCircle className="w-3 h-3 mr-1" />
                                Thêm dòng
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {pendingAttachmentRows.map((row, index) => (
                                <div key={row.id} className="space-y-1 rounded-md border bg-muted/20 p-2">
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                        <Input
                                            value={row.displayName}
                                            onChange={(e) => handlePendingAttachmentNameChange(row.id, e.target.value)}
                                            placeholder={`Tên file quan trọng #${index + 1}`}
                                        />

                                        <Button type="button" variant="outline" onClick={() => handleChooseRowFile(row.id)}>
                                            <Upload className="w-4 h-4 mr-1" />
                                            Upload file
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => handleRemoveAttachmentRow(row.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <input
                                        ref={(element) => {
                                            fileInputRefs.current[row.id] = element;
                                        }}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(event) => handlePendingAttachmentFileChange(row.id, event)}
                                    />

                                    {row.file ? (
                                        <p className="text-xs text-muted-foreground">
                                            Đã chọn: {row.file.name} ({(row.file.size / 1024).toFixed(1)} KB)
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Chưa chọn file upload</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Mỗi dòng gồm tên file quan trọng và 1 tệp upload tương ứng.
                        </p>

                        {importantAttachments.length > 0 && (
                            <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                                <p className="text-xs font-medium">File quan trọng đã tải lên</p>
                                {importantAttachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center justify-between rounded-md border bg-background p-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{attachment.fileName}</p>
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
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>File đi kèm</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={handleChooseAdditionalFiles}
                            >
                                <Upload className="w-3 h-3 mr-1" />
                                Upload nhiều file
                            </Button>
                        </div>

                        <input
                            ref={additionalFilesInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            className="hidden"
                            multiple
                            onChange={handleAdditionalFilesChange}
                        />

                        <div className="space-y-2">
                            {pendingAdditionalFiles.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Chưa chọn file đi kèm.</p>
                            ) : (
                                pendingAdditionalFiles.map((file, index) => (
                                    <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between rounded-md border bg-muted/20 p-2">
                                        <p className="text-xs text-muted-foreground">
                                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                        </p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => handleRemoveAdditionalFile(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            File đi kèm là tài liệu bổ sung ngoài danh sách file quan trọng (có thể chọn nhiều file).
                        </p>

                        {additionalAttachments.length > 0 && (
                            <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                                <p className="text-xs font-medium">File đi kèm đã tải lên</p>
                                {additionalAttachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center justify-between rounded-md border bg-background p-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {attachment.fileSize
                                                    ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                                                    : 'N/A'}{' '}
                                                •{' '}
                                                {attachment.createdAt
                                                    ? new Date(attachment.createdAt).toLocaleDateString('vi-VN')
                                                    : 'N/A'}
                                            </p>
                                            {attachment.description && (
                                                <p className="truncate text-xs text-muted-foreground">{attachment.description}</p>
                                            )}
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
                        <Label htmlFor="invitationDeadline" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Hạn phản hồi lời mời (giảng viên/hội đồng)
                        </Label>
                        <Input
                            id="invitationDeadline"
                            type="datetime-local"
                            value={formData.invitationDeadline}
                            onChange={(e) => setFormData({ ...formData, invitationDeadline: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Hạn chót để giảng viên/hội đồng phản hồi lời mời
                        </p>
                    </div>
                    {/* Instructor Selection */}
                    <LecturerSelection
                        label="Lựa chọn giảng viên hướng dẫn - Tự động gửi lời mời"
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
                        label="Lựa chọn thành viên hội đồng - Tự động gửi lời mời"
                        field="councilMemberIds"
                        formData={formData}
                        lecturers={lecturers}
                        isLoading={isLoadingLecturers}
                        onSelectAll={handleSelectAllLecturers}
                        onToggle={handleToggleLecturer}
                        hint="Chọn thành viên hội đồng có thể chấm điểm và nghiệm thu đề tài trong đợt này."
                        selectedColor="text-emerald-600"
                    />

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
