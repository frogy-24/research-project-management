'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateForm } from '@/components/templates/template-form';
import {
    useProgressTemplates,
    useCreateProgressTemplate,
    useUpdateProgressTemplate,
    useDeleteProgressTemplate,
} from '@/hooks/useProgressTemplates';
import { CreateTemplatePayload, TemplateWithItems } from '@/types/progress-template.schema';
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateWithItems | null>(null);

    const { data: templates, isLoading } = useProgressTemplates();
    const createMutation = useCreateProgressTemplate();
    const updateMutation = useUpdateProgressTemplate();
    const deleteMutation = useDeleteProgressTemplate();

    const handleCreate = async (data: CreateTemplatePayload) => {
        await createMutation.mutateAsync(data);
        setDialogOpen(false);
    };

    const handleUpdate = async (data: CreateTemplatePayload) => {
        if (!editingTemplate) return;
        await updateMutation.mutateAsync({ ...data, id: editingTemplate.id });
        setDialogOpen(false);
        setEditingTemplate(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa biểu mẫu này?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Đã xóa biểu mẫu');
        } catch (error) {
            toast.error('Không thể xóa biểu mẫu');
        }
    };

    const openCreateDialog = () => {
        setEditingTemplate(null);
        setDialogOpen(true);
    };

    const openEditDialog = (template: TemplateWithItems) => {
        setEditingTemplate(template);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingTemplate(null);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <p>Đang tải...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Quản lý Biểu mẫu Quy trình</h1>
                    <p className="text-muted-foreground mt-1">Tạo và quản lý các biểu mẫu báo cáo tiến độ theo tuần</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo biểu mẫu mới
                </Button>
            </div>

            {/* Templates List */}
            {!templates || templates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Chưa có biểu mẫu nào</h3>
                        <p className="text-muted-foreground mb-4">Tạo biểu mẫu đầu tiên để quản lý quy trình báo cáo</p>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tạo biểu mẫu
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Tên biểu mẫu</th>
                                        <th className="text-left p-4 font-medium">Mô tả</th>
                                        <th className="text-center p-4 font-medium w-32">Số tuần</th>
                                        <th className="text-center p-4 font-medium w-32">Trạng thái</th>
                                        <th className="text-center p-4 font-medium w-40">Cập nhật</th>
                                        <th className="text-center p-4 font-medium w-32">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map((template) => (
                                        <tr key={template.id} className="border-t hover:bg-muted/50">
                                            <td className="p-4">
                                                <div className="font-medium">{template.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                                                    {template.description || '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{template.items.length}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {template.isActive ? (
                                                    <Badge variant="default" className="flex items-center gap-1 w-fit mx-auto">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Đang dùng
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                                                        <XCircle className="h-3 w-3" />
                                                        Tắt
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(template.updatedAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(template)}
                                                        title="Sửa"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(template.id)}
                                                        disabled={deleteMutation.isPending}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] sm:max-w-2/3 overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Chỉnh sửa biểu mẫu' : 'Tạo biểu mẫu mới'}</DialogTitle>
                    </DialogHeader>
                    <TemplateForm
                        initialData={
                            editingTemplate
                                ? {
                                      name: editingTemplate.name,
                                      description: editingTemplate.description || undefined,
                                      isActive: editingTemplate.isActive,
                                      items: editingTemplate.items.map((item) => ({
                                          weekNumber: item.weekNumber,
                                          weekLabel: item.weekLabel,
                                          taskDescription: item.taskDescription,
                                          contentGuideline: item.contentGuideline || undefined,
                                          expectedResult: item.expectedResult || undefined,
                                          orderIndex: item.orderIndex,
                                      })),
                                  }
                                : undefined
                        }
                        onSubmit={editingTemplate ? handleUpdate : handleCreate}
                        onCancel={closeDialog}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
