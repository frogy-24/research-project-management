'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import {
    Search,
    BookUser,
    ChevronLeft,
    ChevronRight,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    UserRound,
    GraduationCap,
    FlaskConical,
    FileText,
    ExternalLink,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { useMajors } from '@/hooks/useMajors';
import { useMe } from '@/hooks/useMe';
import { userApi } from '@/api/users';
import { uploadApi } from '@/api/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const schema = z.object({
    code: z.string().default(''),
    name: z.string().min(1, 'Bắt buộc'),
    email: z.string().email('Email không hợp lệ'),
    avatarUrl: z.string().url('URL ảnh không hợp lệ').or(z.literal('')).default(''),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSET']).default('UNSET'),
    phone: z.string().default(''),
    address: z.string().default(''),
    majorId: z.string().default('UNSET'),
    staffId: z.string().default(''),
    academicRank: z
        .enum(['BACHELOR', 'MASTER', 'DOCTOR', 'DOCTOR_OF_SCIENCE', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'UNSET'])
        .default('UNSET'),
    positionTitle: z.string().default(''),
    workStartDate: z.string().default(''),
    yearsOfService: z.coerce.number().int().min(0).nullable().optional(),
    teachingExperience: z.string().default(''),
    coursesTaught: z.string().default(''),
    teachingYears: z.coerce.number().int().min(0).nullable().optional(),
    trainingSystem: z.string().default(''),
    pedagogyCertificate: z.string().default(''),
    workHistory: z.string().default(''),
    degreeName: z.string().default(''),
    degreeMajor: z.string().default(''),
    degreeInstitution: z.string().default(''),
    degreeCountry: z.string().default(''),
    degreeYear: z.coerce.number().int().min(0).nullable().optional(),
    degreeScanUrl: z.string().url('URL không hợp lệ').or(z.literal('')).default(''),
    academicTitleYear: z.coerce.number().int().min(0).nullable().optional(),
    academicTitleDecision: z.string().default(''),
    academicTitleProofUrl: z.string().url('URL không hợp lệ').or(z.literal('')).default(''),
    organizationMajor: z.string().default(''),
    positionRole: z.string().default(''),
    lecturerType: z.enum(['FULL_TIME', 'ADJUNCT', 'UNSET']).default('UNSET'),
    civilServantCode: z.string().default(''),
    civilServantGrade: z.string().default(''),
    workingStatus: z.enum(['ACTIVE', 'RETIRED', 'RESIGNED', 'UNSET']).default('UNSET'),
    joinedAt: z.string().default(''),
    departmentName: z.string().default(''),
    facultyName: z.string().default(''),
    customResearchFields: z.array(z.object({ label: z.string().default(''), value: z.string().default('') })).default([]),
    isResearchProfileEnabled: z.boolean().default(true),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const defaultValues: FormValues = {
    code: '',
    name: '',
    email: '',
    avatarUrl: '',
    gender: 'UNSET',
    phone: '',
    address: '',
    majorId: 'UNSET',
    staffId: '',
    academicRank: 'UNSET',
    positionTitle: '',
    workStartDate: '',
    yearsOfService: null,
    teachingExperience: '',
    coursesTaught: '',
    teachingYears: null,
    trainingSystem: '',
    pedagogyCertificate: '',
    workHistory: '',
    degreeName: '',
    degreeMajor: '',
    degreeInstitution: '',
    degreeCountry: '',
    degreeYear: null,
    degreeScanUrl: '',
    academicTitleYear: null,
    academicTitleDecision: '',
    academicTitleProofUrl: '',
    organizationMajor: '',
    positionRole: '',
    lecturerType: 'UNSET',
    civilServantCode: '',
    civilServantGrade: '',
    workingStatus: 'UNSET',
    joinedAt: '',
    departmentName: '',
    facultyName: '',
    customResearchFields: [],
    isResearchProfileEnabled: true,
};

const rankOptions = [
    { value: 'BACHELOR', label: 'Cử nhân' },
    { value: 'MASTER', label: 'Thạc sĩ' },
    { value: 'DOCTOR', label: 'Tiến sĩ' },
    { value: 'ASSOCIATE_PROFESSOR', label: 'Phó giáo sư' },
    { value: 'PROFESSOR', label: 'Giáo sư' },
];

export function LecturerManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 400);
    const [majorFilter, setMajorFilter] = useState<string>('ALL');
    const [genderFilter, setGenderFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
    const limit = 20;

    const form = useForm<FormInput, any, FormValues>({ resolver: zodResolver(schema), defaultValues });
    const { fields: customFields, append: appendCustomField, remove: removeCustomField } = useFieldArray({
        control: form.control,
        name: 'customResearchFields',
    });

    const { data: me } = useMe();
    const myDepartmentId = (me as any)?.departmentId ?? undefined;
    const {
        data: lecturersData,
        isLoading: isLoadingLecturers,
        isError,
    } = useUsers({
        role: 'LECTURER',
        search: debouncedSearch,
        majorId: majorFilter === 'ALL' ? undefined : majorFilter,
        gender: genderFilter === 'ALL' ? undefined : genderFilter,
        page: currentPage,
        limit,
    } as any);
    const { data: majorsData, isLoading: isLoadingMajors } = useMajors({ limit: 1000, departmentId: myDepartmentId });
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const lecturers = lecturersData?.data ?? [];
    const pagination = lecturersData?.pagination;
    const majors = majorsData?.data ?? [];
    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const pages = useMemo(() => {
        if (!pagination) return [] as (number | string)[];
        const { page, totalPages } = pagination;
        const out: (number | string)[] = [];
        if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) out.push(i);
        else {
            out.push(1);
            if (page > 3) out.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) out.push(i);
            if (page < totalPages - 2) out.push('...');
            out.push(totalPages);
        }
        return out;
    }, [pagination]);

    const openCreate = async () => {
        setEditingId(null);
        form.reset(defaultValues);
        setAvatarPreviewUrl('');
        setIsDialogOpen(true);
        try {
            const { code } = await userApi.getNextCode('LECTURER');
            form.setValue('code', code);
        } catch {}
    };

    const openEdit = (lecturer: any) => {
        setEditingId(lecturer.id);
        form.reset({
            code: lecturer.code ?? '',
            name: lecturer.name ?? '',
            email: lecturer.email ?? '',
            avatarUrl: lecturer.avatarUrl ?? '',
            gender: lecturer.gender ?? 'UNSET',
            phone: lecturer.phone ?? '',
            address: lecturer.address ?? '',
            majorId: lecturer.majorId ?? 'UNSET',
            staffId: lecturer.lecturerProfile?.staffId ?? '',
            academicRank: lecturer.lecturerProfile?.academicRank ?? 'UNSET',
            positionTitle: lecturer.lecturerProfile?.positionTitle ?? '',
            workStartDate: lecturer.lecturerProfile?.workStartDate
                ? new Date(lecturer.lecturerProfile.workStartDate).toISOString().slice(0, 10)
                : '',
            yearsOfService: lecturer.lecturerProfile?.yearsOfService ?? null,
            teachingExperience: lecturer.lecturerProfile?.teachingExperience ?? '',
            coursesTaught: lecturer.lecturerProfile?.coursesTaught ?? '',
            teachingYears: lecturer.lecturerProfile?.teachingYears ?? null,
            trainingSystem: lecturer.lecturerProfile?.trainingSystem ?? '',
            pedagogyCertificate: lecturer.lecturerProfile?.pedagogyCertificate ?? '',
            workHistory: lecturer.lecturerProfile?.workHistory ?? '',
            degreeName: lecturer.lecturerProfile?.degreeName ?? '',
            degreeMajor: lecturer.lecturerProfile?.degreeMajor ?? '',
            degreeInstitution: lecturer.lecturerProfile?.degreeInstitution ?? '',
            degreeCountry: lecturer.lecturerProfile?.degreeCountry ?? '',
            degreeYear: lecturer.lecturerProfile?.degreeYear ?? null,
            degreeScanUrl: lecturer.lecturerProfile?.degreeScanUrl ?? '',
            academicTitleYear: lecturer.lecturerProfile?.academicTitleYear ?? null,
            academicTitleDecision: lecturer.lecturerProfile?.academicTitleDecision ?? '',
            academicTitleProofUrl: lecturer.lecturerProfile?.academicTitleProofUrl ?? '',
            organizationMajor: lecturer.lecturerProfile?.organizationMajor ?? '',
            positionRole: lecturer.lecturerProfile?.positionRole ?? '',
            lecturerType: lecturer.lecturerProfile?.lecturerType ?? 'UNSET',
            civilServantCode: lecturer.lecturerProfile?.civilServantCode ?? '',
            civilServantGrade: lecturer.lecturerProfile?.civilServantGrade ?? '',
            workingStatus: lecturer.lecturerProfile?.workingStatus ?? 'UNSET',
            joinedAt: lecturer.lecturerProfile?.joinedAt ? new Date(lecturer.lecturerProfile.joinedAt).toISOString().slice(0, 10) : '',
            departmentName: lecturer.lecturerProfile?.departmentName ?? '',
            facultyName: lecturer.lecturerProfile?.facultyName ?? '',
            customResearchFields: lecturer.lecturerProfile?.customResearchFields ?? [],
            isResearchProfileEnabled: true,
        });
        setAvatarPreviewUrl(lecturer.avatarUrl ?? '');
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: FormValues) => {
        try {
            const payload = {
                code: values.code,
                name: values.name,
                email: values.email,
                avatarUrl: values.avatarUrl || undefined,
                role: 'LECTURER',
                departmentId: myDepartmentId,
                gender: values.gender === 'UNSET' ? undefined : values.gender,
                phone: values.phone || undefined,
                address: values.address || undefined,
                majorId: values.majorId === 'UNSET' ? undefined : values.majorId,
                lecturerProfile: values.isResearchProfileEnabled
                    ? {
                          staffId: values.staffId || undefined,
                          academicRank: values.academicRank === 'UNSET' ? undefined : values.academicRank,
                          positionTitle: values.positionTitle || undefined,
                          workStartDate: values.workStartDate ? new Date(values.workStartDate) : undefined,
                          yearsOfService:
                              values.yearsOfService === null || values.yearsOfService === undefined
                                  ? undefined
                                  : values.yearsOfService,
                          teachingExperience: values.teachingExperience || undefined,
                          coursesTaught: values.coursesTaught || undefined,
                          teachingYears: values.teachingYears ?? undefined,
                          trainingSystem: values.trainingSystem || undefined,
                          pedagogyCertificate: values.pedagogyCertificate || undefined,
                          workHistory: values.workHistory || undefined,
                          degreeName: values.degreeName || undefined,
                          degreeMajor: values.degreeMajor || undefined,
                          degreeInstitution: values.degreeInstitution || undefined,
                          degreeCountry: values.degreeCountry || undefined,
                          degreeYear: values.degreeYear ?? undefined,
                          degreeScanUrl: values.degreeScanUrl || undefined,
                          academicTitleYear: values.academicTitleYear ?? undefined,
                          academicTitleDecision: values.academicTitleDecision || undefined,
                          academicTitleProofUrl: values.academicTitleProofUrl || undefined,
                          organizationMajor: values.organizationMajor || undefined,
                          positionRole: values.positionRole || undefined,
                          lecturerType: values.lecturerType === 'UNSET' ? undefined : values.lecturerType,
                          civilServantCode: values.civilServantCode || undefined,
                          civilServantGrade: values.civilServantGrade || undefined,
                          workingStatus: values.workingStatus === 'UNSET' ? undefined : values.workingStatus,
                          joinedAt: values.joinedAt ? new Date(values.joinedAt) : undefined,
                          departmentName: values.departmentName || undefined,
                          facultyName: values.facultyName || undefined,
                          customResearchFields: values.customResearchFields?.filter((f) => f.label?.trim() || f.value?.trim()),
                      }
                    : undefined,
            } as any;
            if (editingId) {
                await updateMutation.mutateAsync({ id: editingId, ...payload });
                toast.success('Cập nhật giảng viên thành công');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Thêm giảng viên thành công');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.error ?? error.message ?? 'Có lỗi xảy ra');
        }
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <BookUser className="h-5 w-5 text-primary" />
                    Danh sách Giảng viên
                </CardTitle>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm Giảng viên
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm tên/email/mã..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={majorFilter} onValueChange={setMajorFilter}>
                        <SelectTrigger className="w-[210px]">
                            <SelectValue placeholder="Lọc ngành" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả ngành</SelectItem>
                            {majors.map((m: any) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name}
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

                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã</TableHead>
                                <TableHead>Giảng viên</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Ngành</TableHead>
                                <TableHead>Điện thoại</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingLecturers &&
                                [...Array(4)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                            <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {!isLoadingLecturers && isError && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-destructive py-8">
                                        Lỗi tải dữ liệu giảng viên
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoadingLecturers && !isError && lecturers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Không tìm thấy giảng viên
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoadingLecturers &&
                                !isError &&
                                lecturers.map((l: any) => (
                                    <TableRow key={l.id}>
                                        <TableCell>{l.code ?? '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={l.avatarUrl ?? undefined} alt={l.name ?? 'Giảng viên'} />
                                                    <AvatarFallback>
                                                        {(l.name ?? 'GV').slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{l.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{l.email}</TableCell>
                                        <TableCell>{l.major?.name ?? '-'}</TableCell>
                                        <TableCell>{l.phone ?? '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEdit(l)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Sửa</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={async () => {
                                                        if (!confirm('Bạn có chắc chắn muốn xóa giảng viên này?'))
                                                            return;
                                                        try {
                                                            await deleteMutation.mutateAsync(l.id);
                                                            toast.success('Xóa giảng viên thành công');
                                                        } catch (e: any) {
                                                            toast.error(
                                                                e?.response?.data?.error ?? 'Không thể xóa giảng viên',
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>
                {pagination && (
                    <div className="text-sm text-muted-foreground text-center">
                        Tổng số: <Badge variant="secondary">{pagination.total}</Badge>
                    </div>
                )}
                {pagination && pagination.totalPages > 1 && (
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
                            {pages.map((p, i) => (
                                <PaginationItem key={i}>
                                    {p === '...' ? (
                                        <span className="px-3">...</span>
                                    ) : (
                                        <PaginationLink
                                            onClick={() => setCurrentPage(p as number)}
                                            isActive={currentPage === p}
                                            className="cursor-pointer"
                                        >
                                            {p}
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
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto sm:max-w-1/2">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Chỉnh sửa Giảng viên' : 'Thêm Giảng viên'}</DialogTitle>
                        <DialogDescription>Thông tin chia nhóm, dễ thao tác, tối ưu desktop/mobile.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Tabs defaultValue="general" className="w-full flex-col flex">
                                <TabsList className="grid grid-cols-3 w-full">
                                    <TabsTrigger value="general">
                                        <UserRound className="h-4 w-4 mr-2" />
                                        Cơ bản
                                    </TabsTrigger>
                                    <TabsTrigger value="academic">
                                        <GraduationCap className="h-4 w-4 mr-2" />
                                        Học thuật
                                    </TabsTrigger>
                                    <TabsTrigger value="research">
                                        <FlaskConical className="h-4 w-4 mr-2" />
                                        Nghiên cứu
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="general">
                                    <Card>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                                            <div className="md:col-span-2 rounded-xl border bg-muted/20 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-medium">Ảnh đại diện</Label>
                                                    {isUploadingAvatar && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <Loader2 className="h-3 w-3 animate-spin" /> Đang tải ảnh
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                                    <div className="relative">
                                                        <Avatar className="h-16 w-16 ring-2 ring-background shadow-sm">
                                                            <AvatarImage
                                                                src={avatarPreviewUrl || form.watch('avatarUrl') || undefined}
                                                                alt="Preview"
                                                                className={isUploadingAvatar ? 'blur-sm scale-105' : ''}
                                                            />
                                                            <AvatarFallback>{isUploadingAvatar ? '...' : 'AV'}</AvatarFallback>
                                                        </Avatar>
                                                        {isUploadingAvatar && (
                                                            <div className="absolute inset-0 grid place-items-center rounded-full bg-black/35">
                                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        className="md:max-w-sm"
                                                        disabled={isUploadingAvatar || isSubmitting}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const localPreview = URL.createObjectURL(file);
                                                            setAvatarPreviewUrl(localPreview);
                                                            try {
                                                                setIsUploadingAvatar(true);
                                                                const uploaded = await uploadApi.file(file);
                                                                form.setValue('avatarUrl', uploaded.url, { shouldValidate: true });
                                                                setAvatarPreviewUrl(uploaded.url);
                                                                toast.success('Tải ảnh thành công');
                                                            } catch (error: any) {
                                                                setAvatarPreviewUrl(form.getValues('avatarUrl') || '');
                                                                toast.error(error?.response?.data?.error ?? error?.message ?? 'Tải ảnh thất bại');
                                                            } finally {
                                                                setIsUploadingAvatar(false);
                                                                e.target.value = '';
                                                                URL.revokeObjectURL(localPreview);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Hỗ trợ ảnh JPG/PNG/WebP. Ảnh sẽ lưu dạng URL HTTP trong cơ sở dữ liệu.</p>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="code"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mã giảng viên</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                disabled={!editingId}
                                                                className={!editingId ? 'bg-muted' : ''}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Họ tên *</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email *</FormLabel>
                                                        <FormControl>
                                                            <Input type="email" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Điện thoại</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="gender"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Giới tính</FormLabel>
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Chọn" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="UNSET">Không chọn</SelectItem>
                                                                <SelectItem value="MALE">Nam</SelectItem>
                                                                <SelectItem value="FEMALE">Nữ</SelectItem>
                                                                <SelectItem value="OTHER">Khác</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="majorId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Ngành</FormLabel>
                                                        <Select
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            disabled={isLoadingMajors}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Chọn ngành" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="UNSET">Không chọn</SelectItem>
                                                                {majors.map((m: any) => (
                                                                    <SelectItem key={m.id} value={m.id}>
                                                                        {m.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel>Địa chỉ</FormLabel>
                                                        <FormControl>
                                                            <Textarea rows={3} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="academic">
                                    <div className="space-y-4">
                                    <Card>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                                            <FormField
                                                control={form.control}
                                                name="staffId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mã cán bộ</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="academicRank"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Học hàm/học vị</FormLabel>
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Chọn" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="UNSET">Không chọn</SelectItem>
                                                                {rankOptions.map((r) => (
                                                                    <SelectItem key={r.value} value={r.value}>
                                                                        {r.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="facultyName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Khoa/Viện</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="positionTitle"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Chức danh công tác</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ví dụ: Giảng viên chính" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="workStartDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Ngày bắt đầu làm việc</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="yearsOfService"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Số năm công tác</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                placeholder="Ví dụ: 5"
                                                                value={field.value ?? ''}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    field.onChange(v === '' ? null : Number(v));
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="departmentName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Bộ môn</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField control={form.control} name="degreeName" render={({ field }) => (<FormItem><FormLabel>Tên bằng cấp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="degreeMajor" render={({ field }) => (<FormItem><FormLabel>Chuyên ngành (bằng cấp)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="degreeInstitution" render={({ field }) => (<FormItem><FormLabel>Nơi cấp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="degreeCountry" render={({ field }) => (<FormItem><FormLabel>Quốc gia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="positionRole" render={({ field }) => (<FormItem><FormLabel>Chức vụ</FormLabel><FormControl><Input placeholder="Giảng viên/Trưởng bộ môn..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="organizationMajor" render={({ field }) => (<FormItem><FormLabel>Chuyên ngành (tổ chức)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                Chứng chỉ & bằng cấp (PDF)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>File scan bằng cấp (PDF)</Label>
                                                <Input
                                                    type="file"
                                                    accept="application/pdf"
                                                    disabled={isSubmitting}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            const uploaded = await uploadApi.file(file);
                                                            form.setValue('degreeScanUrl', uploaded.url, { shouldValidate: true });
                                                            toast.success('Tải file bằng cấp thành công');
                                                        } catch (error: any) {
                                                            toast.error(error?.response?.data?.error ?? error?.message ?? 'Tải file thất bại');
                                                        } finally {
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                                <Input placeholder="Hoặc dán URL PDF bằng cấp" {...form.register('degreeScanUrl')} />
                                                {form.watch('degreeScanUrl') && (
                                                    <div className="rounded-md border p-2 space-y-2">
                                                        <a
                                                            href={form.watch('degreeScanUrl')}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sm text-primary inline-flex items-center gap-1"
                                                        >
                                                            Mở file bằng cấp <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        <iframe
                                                            src={form.watch('degreeScanUrl')}
                                                            className="w-full h-56 rounded border"
                                                            title="degree-scan-preview"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label>File minh chứng học hàm (PDF)</Label>
                                                <Input
                                                    type="file"
                                                    accept="application/pdf"
                                                    disabled={isSubmitting}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            const uploaded = await uploadApi.file(file);
                                                            form.setValue('academicTitleProofUrl', uploaded.url, { shouldValidate: true });
                                                            toast.success('Tải file minh chứng thành công');
                                                        } catch (error: any) {
                                                            toast.error(error?.response?.data?.error ?? error?.message ?? 'Tải file thất bại');
                                                        } finally {
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                                <Input placeholder="Hoặc dán URL PDF minh chứng" {...form.register('academicTitleProofUrl')} />
                                                {form.watch('academicTitleProofUrl') && (
                                                    <div className="rounded-md border p-2 space-y-2">
                                                        <a
                                                            href={form.watch('academicTitleProofUrl')}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sm text-primary inline-flex items-center gap-1"
                                                        >
                                                            Mở file minh chứng <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        <iframe
                                                            src={form.watch('academicTitleProofUrl')}
                                                            className="w-full h-56 rounded border"
                                                            title="academic-proof-preview"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </div>
                                </TabsContent>
                                <TabsContent value="research">
                                    <Card>
                                        <CardContent className="space-y-4 pt-6">
                                            <FormField
                                                control={form.control}
                                                name="isResearchProfileEnabled"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                        <FormLabel>Kích hoạt hồ sơ nghiên cứu</FormLabel>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <Separator />
                                            <div
                                                className={
                                                    form.watch('isResearchProfileEnabled')
                                                        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                                                        : 'grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60 pointer-events-none'
                                                }
                                            >
                                                <div className="md:col-span-2 space-y-3 rounded-lg border p-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium">Trường nghiên cứu động</p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => appendCustomField({ label: '', value: '' })}
                                                        >
                                                            <Plus className="h-4 w-4 mr-1" />
                                                            Thêm trường
                                                        </Button>
                                                    </div>
                                                    {customFields.length === 0 && (
                                                        <p className="text-sm text-muted-foreground">Chưa có trường động. Bấm "Thêm trường" để tạo.</p>
                                                    )}
                                                    {customFields.map((item, index) => (
                                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-1 gap-3 rounded-md border p-3">
                                                            <FormField
                                                                control={form.control}
                                                                name={`customResearchFields.${index}.label`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Trường</FormLabel>
                                                                        <FormControl><Input placeholder="Ví dụ: Thành tựu nổi bật" {...field} /></FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <div className="flex items-end gap-2">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`customResearchFields.${index}.value`}
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex-1">
                                                                            <FormLabel>Nội dung</FormLabel>
                                                                            <FormControl><Textarea rows={3} placeholder="Nhập nội dung..." {...field} /></FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeCustomField(index)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isSubmitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
