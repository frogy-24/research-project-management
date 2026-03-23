'use client';

import { useState } from 'react';
import { Search, UserRound, ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { useClasses } from '@/hooks/useClasses';
import { useMajors } from '@/hooks/useMajors';
import { useMe } from '@/hooks/useMe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { toast } from 'sonner';

interface StudentFormData {
    code: string;
    name: string;
    email: string;
    gender: string;
    phone: string;
    address: string;
    classId: string;
    majorId: string;
}

const defaultForm: StudentFormData = {
    code: '',
    name: '',
    email: '',
    gender: '',
    phone: '',
    address: '',
    classId: '',
    majorId: '',
};

export function StudentManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 400);
    const [classFilter, setClassFilter] = useState<string>('ALL');
    const [genderFilter, setGenderFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 20;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<StudentFormData>(defaultForm);

    // Get current user (dean) info to get their departmentId
    const { data: me } = useMe();
    const myDepartmentId = (me as any)?.departmentId ?? undefined;

    // Fetch students – API tự lọc theo departmentId của dean qua session
    const { data: studentsData, isLoading: isLoadingStudents } = useUsers({
        role: 'STUDENT',
        search: debouncedSearch,
        classId: classFilter === 'ALL' ? undefined : classFilter,
        gender: genderFilter === 'ALL' ? undefined : genderFilter,
        page: currentPage,
        limit,
    });

    const students = studentsData?.data ?? [];
    const pagination = studentsData?.pagination;

    // Fetch classes – CHỈ LẤY CÁC LỚP THUỘC KHOA CỦA DEAN
    const { data: classesData } = useClasses({ 
        limit: 1000,
        departmentId: myDepartmentId // Filter theo departmentId của Dean
    });
    const classes = classesData?.data ?? [];

    // Fetch majors – CHỈ LẤY CÁC NGÀNH THUỘC KHOA CỦA DEAN
    const { data: majorsData } = useMajors({ 
        limit: 1000,
        departmentId: myDepartmentId // Filter theo departmentId của Dean
    });
    const majors = majorsData?.data ?? [];

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const getPageNumbers = () => {
        if (!pagination) return [];
        const { page, totalPages } = pagination;
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData(defaultForm);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (student: any) => {
        setEditingId(student.id);
        setFormData({
            code: student.code ?? '',
            name: student.name ?? '',
            email: student.email ?? '',
            gender: student.gender ?? '',
            phone: student.phone ?? '',
            address: student.address ?? '',
            classId: student.classId ?? '',
            majorId: student.majorId ?? '',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                role: 'STUDENT',
                departmentId: myDepartmentId,
                gender: formData.gender || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                classId: formData.classId || undefined,
                majorId: formData.majorId || undefined,
            };

            if (editingId) {
                await updateMutation.mutateAsync({ id: editingId, ...payload });
                toast.success('Cập nhật sinh viên thành công');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Thêm sinh viên thành công');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.error ?? error.message ?? 'Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Xóa sinh viên thành công');
        } catch (error: any) {
            toast.error(error?.response?.data?.error ?? 'Không thể xóa sinh viên');
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-primary" />
                    Danh sách Sinh viên thuộc Khoa
                </CardTitle>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm Sinh viên
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-4 flex-wrap">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm theo tên, email hoặc mã số..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Lọc theo lớp" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả lớp</SelectItem>
                            {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Giới tính" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả</SelectItem>
                            <SelectItem value="MALE">Nam</SelectItem>
                            <SelectItem value="FEMALE">Nữ</SelectItem>
                            <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>MSSV</TableHead>
                                <TableHead>Họ và tên</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Giới tính</TableHead>
                                <TableHead>Lớp</TableHead>
                                <TableHead>Ngành</TableHead>
                                <TableHead>Số điện thoại</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingStudents ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Không tìm thấy sinh viên nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student: any) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.code ?? '-'}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{student.email}</TableCell>
                                        <TableCell>
                                            {student.gender === 'MALE'
                                                ? 'Nam'
                                                : student.gender === 'FEMALE'
                                                  ? 'Nữ'
                                                  : 'Khác'}
                                        </TableCell>
                                        <TableCell>{student.class?.name ?? '-'}</TableCell>
                                        <TableCell>{student.major?.name ?? '-'}</TableCell>
                                        <TableCell>{student.phone ?? '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEdit(student)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(student.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-4">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Trước
                                    </Button>
                                </PaginationItem>

                                {getPageNumbers().map((pageNum, idx) => (
                                    <PaginationItem key={idx}>
                                        {pageNum === '...' ? (
                                            <span className="px-3">...</span>
                                        ) : (
                                            <PaginationLink
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum as number)}
                                                isActive={currentPage === pageNum}
                                                className="cursor-pointer"
                                            >
                                                {pageNum}
                                            </PaginationLink>
                                        )}
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                                        disabled={currentPage === pagination.totalPages}
                                    >
                                        Sau
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {pagination && (
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                        Hiển thị {(currentPage - 1) * limit + 1} – {Math.min(currentPage * limit, pagination.total)} /
                        Tổng số: <Badge variant="secondary">{pagination.total}</Badge> sinh viên
                    </div>
                )}
            </CardContent>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg sm:max-w-1/2">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Chỉnh sửa Sinh viên' : 'Thêm Sinh viên mới'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sv-code">MSSV</Label>
                                <Input
                                    id="sv-code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="VD: 20110001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sv-gender">Giới tính</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                                >
                                    <SelectTrigger id="sv-gender">
                                        <SelectValue placeholder="Chọn giới tính" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Nam</SelectItem>
                                        <SelectItem value="FEMALE">Nữ</SelectItem>
                                        <SelectItem value="OTHER">Khác</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-name">
                                Họ và tên <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="sv-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nguyễn Văn A"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="sv-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="sinhvien@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-major">Ngành</Label>
                            <Select
                                value={formData.majorId}
                                onValueChange={(v) => setFormData({ ...formData, majorId: v, classId: '' })}
                            >
                                <SelectTrigger id="sv-major">
                                    <SelectValue placeholder="Chọn ngành" />
                                </SelectTrigger>
                                <SelectContent>
                                    {majors.map((major) => (
                                        <SelectItem key={major.id} value={major.id}>
                                            {major.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-class">Lớp</Label>
                            <Select
                                value={formData.classId}
                                onValueChange={(v) => setFormData({ ...formData, classId: v })}
                            >
                                <SelectTrigger id="sv-class">
                                    <SelectValue placeholder="Chọn lớp" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes
                                        .filter((cls) => !formData.majorId || cls.majorId === formData.majorId)
                                        .map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-phone">Số điện thoại</Label>
                            <Input
                                id="sv-phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0901234567"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sv-address">Địa chỉ</Label>
                            <Input
                                id="sv-address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="TP. Hồ Chí Minh"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
