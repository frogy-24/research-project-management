'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useMe, useUpdateMe } from '@/hooks/useMe';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Gender } from '@/types/user.schema';

type ProfilePageProps = {
    title: string;
};

export function ProfilePage({ title }: ProfilePageProps) {
    const { data: me, isLoading } = useMe();
    const updateMeMutation = useUpdateMe();

    const initialForm = useMemo(
        () => ({
            code: me?.code ?? '',
            name: me?.name ?? '',
            dateOfBirth: me?.dateOfBirth ? new Date(me.dateOfBirth).toISOString().slice(0, 10) : '',
            gender: (me?.gender ?? '') as Gender | '',
            phone: me?.phone ?? '',
            address: me?.address ?? '',
            department: me?.department ?? '',
        }),
        [me],
    );

    const [draftForm, setDraftForm] = useState<typeof initialForm | null>(null);
    const form = draftForm ?? initialForm;

    const updateDraft = (updater: (current: typeof initialForm) => typeof initialForm) => {
        setDraftForm((prev) => updater(prev ?? initialForm));
    };

    const handleSubmit = () => {
        updateMeMutation.mutate(
            {
                code: form.code.trim() ? form.code.trim() : null,
                name: form.name,
                dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : null,
                gender: form.gender || null,
                phone: form.phone.trim() ? form.phone.trim() : null,
                address: form.address.trim() ? form.address.trim() : null,
                department: form.department.trim() ? form.department.trim() : null,
            },
            {
                onSuccess: () => {
                    toast.success('Đã lưu thông tin hồ sơ');
                    setDraftForm(null);
                },
                onError: () => {
                    toast.error('Không thể lưu thông tin');
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-8 w-8 bg-primary/20 rounded-full animate-bounce" />
                    <p className="text-muted-foreground text-sm">Đang tải hồ sơ...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
                <p className="text-muted-foreground">Quản lý thông tin định danh và liên hệ nội bộ.</p>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
                    <CardDescription>Được dùng để hiển thị trên các văn bản thuyết minh, nghiệm thu.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Mã số</Label>
                        <Input value={form.code} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Họ và tên</Label>
                        <Input value={form.name} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Email</Label>
                        <Input value={me?.email || ''} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Ngày sinh</Label>
                        <Input
                            type="date"
                            value={form.dateOfBirth}
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Giới tính</Label>
                        <Input
                            value={
                                form.gender === 'MALE'
                                    ? 'Nam'
                                    : form.gender === 'FEMALE'
                                      ? 'Nữ'
                                      : form.gender === 'OTHER'
                                        ? 'Khác'
                                        : 'Chưa xác định'
                            }
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Đơn vị / Khoa</Label>
                        <Input
                            value={me?.departmentRef?.name || form.department || 'Chưa cập nhật'}
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Lớp</Label>
                        <Input
                            value={me?.class?.name || 'Chưa cập nhật'}
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Số điện thoại</Label>
                        <Input value={form.phone} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-muted-foreground">Địa chỉ liên hệ</Label>
                        <Input value={form.address} readOnly className="bg-muted/50 cursor-not-allowed" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
