'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    CreateTemplatePayload,
    createTemplateSchema,
    ProgressReportTemplateItem,
} from '@/types/progress-template.schema';
import { Plus, Trash2, GripVertical, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateFormProps {
    initialData?: CreateTemplatePayload;
    onSubmit: (data: CreateTemplatePayload) => Promise<void>;
    onCancel: () => void;
}

export function TemplateForm({ initialData, onSubmit, onCancel }: TemplateFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        index: number;
        field: 'taskDescription' | 'contentGuideline' | 'expectedResult';
        title: string;
    } | null>(null);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<CreateTemplatePayload>({
        resolver: zodResolver(createTemplateSchema),
        defaultValues: initialData || {
            name: '',
            description: '',
            isActive: true,
            items: [
                {
                    weekNumber: 1,
                    weekLabel: 'Tuần 1',
                    taskDescription: '',
                    contentGuideline: '',
                    expectedResult: '',
                    orderIndex: 0,
                },
            ],
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: 'items',
    });

    const handleFormSubmit = async (data: CreateTemplatePayload) => {
        try {
            setIsSubmitting(true);
            await onSubmit(data);
            toast.success('Lưu biểu mẫu thành công!');
        } catch (error: any) {
            toast.error(error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItem = () => {
        const lastItem = fields[fields.length - 1];
        append({
            weekNumber: (lastItem?.weekNumber || 0) + 1,
            weekLabel: `Tuần ${(lastItem?.weekNumber || 0) + 1}`,
            taskDescription: '',
            contentGuideline: '',
            expectedResult: '',
            orderIndex: fields.length,
        });
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin biểu mẫu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="name">
                            Tên biểu mẫu <span className="text-red-500">*</span>
                        </Label>
                        <Input id="name" {...register('name')} placeholder="VD: Biểu mẫu báo cáo tuần - Đề tài NCKH" />
                        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Mô tả ngắn gọn về biểu mẫu này..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isActive" {...register('isActive')} className="h-4 w-4" />
                        <Label htmlFor="isActive" className="cursor-pointer">
                            Kích hoạt biểu mẫu
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {/* Template Items */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Danh sách mục báo cáo ({fields.length})</CardTitle>
                    <Button type="button" onClick={addItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm tuần
                    </Button>
                </CardHeader>
                <CardContent>
                    {fields.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Chưa có mục nào. Nhấn "Thêm tuần" để bắt đầu.
                        </p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3 font-medium w-24">Tuần</th>
                                        <th className="text-left p-3 font-medium w-32">Nhãn</th>
                                        <th className="text-left p-3 font-medium">Mô tả công việc</th>
                                        <th className="text-left p-3 font-medium">Hướng dẫn</th>
                                        <th className="text-left p-3 font-medium">Kết quả mong đợi</th>
                                        <th className="text-center p-3 font-medium w-20">Xóa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="border-t hover:bg-muted/50">
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    {...register(`items.${index}.weekNumber` as const, {
                                                        valueAsNumber: true,
                                                    })}
                                                    min={1}
                                                    className="w-20"
                                                />
                                                {errors.items?.[index]?.weekNumber && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        {errors.items[index]?.weekNumber?.message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    {...register(`items.${index}.weekLabel` as const)}
                                                    placeholder="Tuần 1"
                                                    className="w-full"
                                                />
                                                {errors.items?.[index]?.weekLabel && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        {errors.items[index]?.weekLabel?.message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        {...register(`items.${index}.taskDescription` as const)}
                                                        placeholder="Mô tả công việc..."
                                                        className="flex-1"
                                                        readOnly
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'taskDescription',
                                                                title: 'Mô tả công việc',
                                                            })
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'taskDescription',
                                                                title: 'Mô tả công việc',
                                                            })
                                                        }
                                                    >
                                                        <Maximize2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {errors.items?.[index]?.taskDescription && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        {errors.items[index]?.taskDescription?.message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        {...register(`items.${index}.contentGuideline` as const)}
                                                        placeholder="Hướng dẫn nội dung..."
                                                        className="flex-1"
                                                        readOnly
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'contentGuideline',
                                                                title: 'Hướng dẫn nội dung',
                                                            })
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'contentGuideline',
                                                                title: 'Hướng dẫn nội dung',
                                                            })
                                                        }
                                                    >
                                                        <Maximize2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        {...register(`items.${index}.expectedResult` as const)}
                                                        placeholder="Kết quả dự kiến..."
                                                        className="flex-1"
                                                        readOnly
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'expectedResult',
                                                                title: 'Kết quả mong đợi',
                                                            })
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setEditDialog({
                                                                open: true,
                                                                index,
                                                                field: 'expectedResult',
                                                                title: 'Kết quả mong đợi',
                                                            })
                                                        }
                                                    >
                                                        <Maximize2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                    disabled={fields.length === 1}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                                <input
                                                    type="hidden"
                                                    {...register(`items.${index}.orderIndex` as const, {
                                                        valueAsNumber: true,
                                                    })}
                                                    value={index}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {errors.items && typeof errors.items.message === 'string' && (
                        <p className="text-sm text-red-500 mt-4">{errors.items.message}</p>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu biểu mẫu'}
                </Button>
            </div>

            {/* Edit Dialog */}
            {editDialog && (
                <Dialog
                    open={editDialog.open}
                    onOpenChange={(open) => {
                        if (!open) setEditDialog(null);
                    }}
                >
                    <DialogContent className="max-w-3xl max-h-[80vh] sm:max-w-1/2">
                        <DialogHeader>
                            <DialogTitle>{editDialog.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Textarea
                                value={watch(`items.${editDialog.index}.${editDialog.field}` as any) || ''}
                                onChange={(e) =>
                                    setValue(`items.${editDialog.index}.${editDialog.field}` as any, e.target.value)
                                }
                                placeholder={`Nhập ${editDialog.title.toLowerCase()}...`}
                                rows={12}
                                className="resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditDialog(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </form>
    );
}
