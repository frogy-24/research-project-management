'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useMajors } from '@/hooks/useMajors';
import { useClasses } from '@/hooks/useClasses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Role, Gender } from '@/types/user.schema';

const ROLES: Role[] = ['STUDENT', 'LECTURER', 'DEAN', 'ADMIN', 'COUNCIL', 'LEADER'];
const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];

export function UserManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 400);
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [genderFilter, setGenderFilter] = useState<string>('ALL');
    const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
    const [majorFilter, setMajorFilter] = useState<string>('ALL');
    const [classFilter, setClassFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 20;

    const { data: usersData, isLoading: isLoadingUsers } = useUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        gender: genderFilter === 'ALL' ? undefined : genderFilter,
        departmentId: departmentFilter === 'ALL' ? undefined : departmentFilter,
        majorId: majorFilter === 'ALL' ? undefined : majorFilter,
        classId: classFilter === 'ALL' ? undefined : classFilter,
        search: debouncedSearch,
        page: currentPage,
        limit,
    });
    const pagination = usersData?.pagination;
    const users = usersData?.data || [];
    const { data: departments = [] } = useDepartments();
    const { data: majorsData } = useMajors();
    const majors = majorsData?.data ?? [];

    const { data: classesData } = useClasses({ limit: 1000 });
    const classes = classesData?.data ?? [];

    // Filter majors and classes based on selection
    const filteredMajors =
        majorFilter === 'ALL' && departmentFilter !== 'ALL'
            ? majors.filter((m: any) => m.departmentId === departmentFilter)
            : majors;

    const filteredClasses =
        classFilter === 'ALL' && majorFilter !== 'ALL'
            ? classes.filter((c: any) => c.majorId === majorFilter)
            : classes;

    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        email: '',
        role: 'STUDENT' as Role,
        gender: 'MALE' as Gender,
        phone: '',
        address: '',
        departmentId: '',
        majorId: '',
        classId: '',
    });

    const handleOpenDialog = (user?: any) => {
        if (user) {
            setEditingId(user.id);
            setFormData({
                code: user.code || '',
                name: user.name,
                email: user.email,
                role: user.role,
                gender: user.gender || 'MALE',
                phone: user.phone || '',
                address: user.address || '',
                departmentId: user.departmentId || '',
                majorId: user.majorId || '',
                classId: user.classId || '',
            });
        } else {
            setEditingId(null);
            setFormData({
                code: '',
                name: '',
                email: '',
                role: 'STUDENT',
                gender: 'MALE',
                phone: '',
                address: '',
                departmentId: '',
                majorId: '',
                classId: '',
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                departmentId: formData.departmentId || null,
                majorId: formData.majorId || null,
                classId: formData.classId || null,
            };

            if (editingId) {
                await updateMutation.mutateAsync({ id: editingId, ...data });
                toast.success('Cập nhật người dùng thành công');
            } else {
                await createMutation.mutateAsync(data);
                toast.success('Thêm người dùng thành công');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || 'Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            try {
                await deleteMutation.mutateAsync(id);
                toast.success('Xóa người dùng thành công');
            } catch (error: any) {
                toast.error(error.message || 'Không thể xóa người dùng');
            }
        }
    };

    const getRoleBadge = (role: Role) => {
        const variants: Record<Role, string> = {
            ADMIN: 'destructive',
            DEAN: 'default',
            LECTURER: 'secondary',
            STUDENT: 'outline',
            COUNCIL: 'default',
            LEADER: 'default',
            DISBURSER: 'secondary',
        };
        return <Badge variant={variants[role] as any}>{role}</Badge>;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Danh sách Người dùng</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Thêm Người dùng
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl sm:max-w-1/3">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Mã số (MSSV/MSCB)</Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="VD: 20110123"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Họ và tên</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="VD: Nguyễn Văn A"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="VD: a@example.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Vai trò</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn vai trò" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Giới tính</Label>
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(value) => setFormData({ ...formData, gender: value as Gender })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn giới tính" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GENDERS.map((gender) => (
                                                <SelectItem key={gender} value={gender}>
                                                    {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Số điện thoại</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="VD: 0123456789"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="department">Khoa</Label>
                                    <Select
                                        value={formData.departmentId}
                                        onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn khoa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Không có</SelectItem>
                                            {departments.map((dept: any) => (
                                                <SelectItem key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="major">Ngành</Label>
                                    <Select
                                        value={formData.majorId}
                                        onValueChange={(value) => setFormData({ ...formData, majorId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn ngành" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Không có</SelectItem>
                                            {majors
                                                .filter(
                                                    (m: any) =>
                                                        !formData.departmentId ||
                                                        m.departmentId === formData.departmentId,
                                                )
                                                .map((major: any) => (
                                                    <SelectItem key={major.id} value={major.id}>
                                                        {major.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class">Lớp</Label>
                                    <Select
                                        value={formData.classId}
                                        onValueChange={(value) => setFormData({ ...formData, classId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn lớp" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Không có</SelectItem>
                                            {classes
                                                .filter((c: any) => !formData.majorId || c.majorId === formData.majorId)
                                                .map((cls: any) => (
                                                    <SelectItem key={cls.id} value={cls.id}>
                                                        {cls.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="VD: 123 Đường ABC, Quận XYZ"
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingId ? 'Cập nhật' : 'Lưu'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 mb-4">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên, email hoặc mã số..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Vai trò" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả</SelectItem>
                                {ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={genderFilter} onValueChange={setGenderFilter}>
                            <SelectTrigger className="w-[130px]">
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

                    <div className="flex gap-4 flex-wrap">
                        <Select
                            value={departmentFilter}
                            onValueChange={(value) => {
                                setDepartmentFilter(value);
                                setMajorFilter('ALL');
                                setClassFilter('ALL');
                            }}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Khoa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả khoa</SelectItem>
                                {departments.map((dept: any) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={majorFilter}
                            onValueChange={(value) => {
                                setMajorFilter(value);
                                setClassFilter('ALL');
                            }}
                            disabled={departmentFilter !== 'ALL' && filteredMajors.length === 0}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Ngành" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả ngành</SelectItem>
                                {filteredMajors.map((major: any) => (
                                    <SelectItem key={major.id} value={major.id}>
                                        {major.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={classFilter}
                            onValueChange={setClassFilter}
                            disabled={majorFilter !== 'ALL' && filteredClasses.length === 0}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Lớp" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả lớp</SelectItem>
                                {filteredClasses.map((cls: any) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {pagination && (
                    <div className="mb-2 text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, pagination.total)} /
                        Tổng: <Badge variant="secondary">{pagination.total}</Badge> người dùng
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <div className="mb-4">
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

                                {(() => {
                                    const { page, totalPages } = pagination;
                                    const pages: (number | string)[] = [];
                                    if (totalPages <= 7) {
                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                    } else {
                                        pages.push(1);
                                        if (page > 3) pages.push('...');
                                        for (
                                            let i = Math.max(2, page - 1);
                                            i <= Math.min(totalPages - 1, page + 1);
                                            i++
                                        ) {
                                            pages.push(i);
                                        }
                                        if (page < totalPages - 2) pages.push('...');
                                        pages.push(totalPages);
                                    }
                                    return pages.map((pageNum, idx) => (
                                        <PaginationItem key={idx}>
                                            {pageNum === '...' ? (
                                                <span className="px-3">...</span>
                                            ) : (
                                                <PaginationLink
                                                    size="default"
                                                    onClick={() => setCurrentPage(pageNum as number)}
                                                    isActive={currentPage === pageNum}
                                                    className="cursor-pointer"
                                                >
                                                    {pageNum}
                                                </PaginationLink>
                                            )}
                                        </PaginationItem>
                                    ));
                                })()}

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

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã số</TableHead>
                                <TableHead>Họ và tên</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Vai trò</TableHead>
                                <TableHead>Khoa/Lớp</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Không tìm thấy người dùng nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.code || '-'}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                {user.departmentRef?.name || '-'}
                                                {user.class?.name && (
                                                    <div className="text-muted-foreground">{user.class.name}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(user.id)}
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
            </CardContent>
        </Card>
    );
}
