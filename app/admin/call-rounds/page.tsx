'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCallRounds, useCreateCallRound, useUpdateCallRound, useDeleteCallRound } from '@/hooks/useCallRounds';
import { useProgressTemplates } from '@/hooks/useProgressTemplates';
import { useDepartments } from '@/hooks/useDepartments';
import { useMajors } from '@/hooks/useMajors';
import { useClasses } from '@/hooks/useClasses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Building2, GraduationCap, Users } from 'lucide-react';
import type { CallRound } from '@/types/call-round.schema';

export default function CallRoundsPage() {
    const { data: callRounds = [], isLoading } = useCallRounds();
    const { data: templates = [] } = useProgressTemplates();
    const { data: departments = [] } = useDepartments();
    const { data: majors = [] } = useMajors();
    const { data: classes = [] } = useClasses();
    const createMutation = useCreateCallRound();
    const updateMutation = useUpdateCallRound();
    const deleteMutation = useDeleteCallRound();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<CallRound | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        isActive: true,
        templateId: '',
        departmentIds: [] as string[],
        majorIds: [] as string[],
        classIds: [] as string[],
    });

    const resetForm = () => {
        setFormData({
            name: '',
            startDate: '',
            endDate: '',
            isActive: true,
            templateId: '',
            departmentIds: [],
            majorIds: [],
            classIds: [],
        });
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
            startDate: new Date(round.startDate).toISOString().split('T')[0],
            endDate: new Date(round.endDate).toISOString().split('T')[0],
            isActive: round.isActive,
            templateId: round.templateId || '',
            departmentIds: round.departments?.map((d: any) => d.id) || [],
            majorIds: round.majors?.map((m: any) => m.id) || [],
            classIds: round.classes?.map((c: any) => c.id) || [],
        });
        setDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.startDate || !formData.endDate) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        const payload = {
            name: formData.name,
            startDate: new Date(formData.startDate),
            endDate: new Date(formData.endDate),
            isActive: formData.isActive,
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
                }
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

    const handleDelete = (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa đợt đăng ký này?')) return;
        deleteMutation.mutate(id, {
            onSuccess: () => toast.success('Đã xóa'),
            onError: () => toast.error('Lỗi khi xóa'),
        });
    };

    // Filter majors and classes based on selected departments
    const filteredMajors = majors.filter((major: any) => 
        formData.departmentIds.length === 0 || formData.departmentIds.includes(major.departmentId)
    );

    const filteredClasses = classes.filter((cls: any) => 
        formData.majorIds.length === 0 || formData.majorIds.includes(cls.majorId)
    );

    const handleDepartmentChange = (departmentId: string) => {
        const newDepartmentIds = formData.departmentIds.includes(departmentId)
            ? formData.departmentIds.filter(id => id !== departmentId)
            : [...formData.departmentIds, departmentId];
        
        setFormData(prev => ({
            ...prev,
            departmentIds: newDepartmentIds,
            // Clear majors and classes when departments change
            majorIds: [],
            classIds: [],
        }));
    };

    const handleMajorChange = (majorId: string) => {
        const newMajorIds = formData.majorIds.includes(majorId)
            ? formData.majorIds.filter(id => id !== majorId)
            : [...formData.majorIds, majorId];
        
        setFormData(prev => ({
            ...prev,
            majorIds: newMajorIds,
            // Clear classes when majors change
            classIds: [],
        }));
    };

    const handleClassChange = (classId: string) => {
        const newClassIds = formData.classIds.includes(classId)
            ? formData.classIds.filter(id => id !== classId)
            : [...formData.classIds, classId];
        
        setFormData(prev => ({
            ...prev,
            classIds: newClassIds,
        }));
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-2xl">Quản lý Đợt Đăng Ký</CardTitle>
                        <CardDescription>Tạo và quản lý các đợt đăng ký đề tài, gán biểu mẫu tiến độ</CardDescription>
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
                                        <TableHead>Thời gian</TableHead>
                                        <TableHead>Biểu mẫu</TableHead>
                                        <TableHead>Số đề tài</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {callRounds.map((round: any) => (
                                        <TableRow key={round.id}>
                                            <TableCell className="font-medium">{round.name}</TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(round.startDate).toLocaleDateString('vi-VN')} -{' '}
                                                {new Date(round.endDate).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell>
                                                {round.template ? (
                                                    <Badge variant="secondary">{round.template.name}</Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Chưa gán</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{round._count?.projects || 0} đề tài</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {round.isActive ? (
                                                    <Badge variant="default">Hoạt động</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Tạm ngưng</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(round)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(round.id)}
                                                        disabled={(round._count?.projects || 0) > 0}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRound ? 'Chỉnh sửa' : 'Tạo'} Đợt Đăng Ký</DialogTitle>
                        <DialogDescription>
                            {editingRound ? 'Cập nhật thông tin' : 'Nhập thông tin đợt đăng ký mới'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-2">
                            <Label>Tên đợt đăng ký *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Đợt 1 - Năm 2024"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ngày bắt đầu *</Label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ngày kết thúc *</Label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Biểu mẫu báo cáo tiến độ</Label>
                            <Select value={formData.templateId || undefined} onValueChange={(v) => setFormData({ ...formData, templateId: v === 'none' ? '' : v })}>
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
                        
                        {/* Organization Selection Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <Label className="font-semibold">Phân quyền tổ chức</Label>
                            </div>
                            
                            {/* Departments */}
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
                                            />
                                            <Label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer">
                                                {dept.code} - {dept.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Majors - only show if departments are selected */}
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
                                                />
                                                <Label htmlFor={`major-${major.id}`} className="text-sm cursor-pointer">
                                                    {major.code} - {major.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Classes - only show if majors are selected */}
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
                        
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isActive">Đợt đang hoạt động</Label>
                        </div>
                        <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                            {editingRound ? 'Cập nhật' : 'Tạo đợt'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
