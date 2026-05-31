'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthSession, useLogin } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/lib/role-routes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginWithCredentialsSchema, type LoginWithCredentials } from '@/types/auth.schema';

export default function LoginPage() {
    const router = useRouter();
    const [showDemoAccounts, setShowDemoAccounts] = useState(false);

    const { data: session, isLoading: isSessionLoading } = useAuthSession();
    const loginMutation = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<LoginWithCredentials>({
        resolver: zodResolver(loginWithCredentialsSchema),
    });

    useEffect(() => {
        if (session?.role) {
            router.replace(getDashboardRoute(session.role));
        }
    }, [router, session?.role]);

    const onSubmit = (data: LoginWithCredentials) => {
        loginMutation.mutate(data, {
            onSuccess: (response) => {
                toast.success(`Đăng nhập thành công! Xin chào ${response.name}`);
                router.replace(getDashboardRoute(response.role));
                router.refresh(); // Force Next.js to re-render with new session
            },
            onError: (error: any) => {
                const errorMessage = error?.response?.data?.error || 'Không thể đăng nhập';
                toast.error(errorMessage);
            },
        });
    };

    const fillDemoAccount = (email: string, password: string) => {
        setValue('email', email);
        setValue('password', password);
    };

    return (
        <main className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Đăng nhập hệ thống URMS</CardTitle>
                    <CardDescription>Hệ thống Quản lý Nghiên cứu Khoa học Đại học</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@university.edu.vn"
                                {...register('email')}
                                disabled={loginMutation.isPending || isSessionLoading}
                            />
                            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Nhập mật khẩu"
                                {...register('password')}
                                disabled={loginMutation.isPending || isSessionLoading}
                            />
                            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loginMutation.isPending || isSessionLoading}>
                            {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </Button>
                    </form>

                    <div className="mt-6">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                            type="button"
                        >
                            {showDemoAccounts ? 'Ẩn tài khoản demo' : 'Hiển thị tài khoản demo'}
                        </Button>

                        {showDemoAccounts && (
                            <div className="mt-4 space-y-2 rounded-lg border bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-700 mb-2">
                                    Tài khoản demo (Click để đăng nhập):
                                </p>
                                <div className="grid gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('admin@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-blue-600">🔧 ADMIN</span>
                                            <span className="text-xs text-muted-foreground">admin@university.edu</span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('disburser@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-cyan-600">
                                                💸 Người giải ngân
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                disburser@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('dean.it@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-purple-600">
                                                👔 Trưởng khoa CNTT
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                dean.it@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('dean.bus@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-purple-600">
                                                👔 Trưởng khoa Kinh tế
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                dean.bus@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('gv00001@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-green-600">
                                                👨‍🏫 Giảng viên - Khoa CNTT
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                gv00001@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('gv00061@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-green-600">
                                                👨‍🏫 Giảng viên - Khoa Kinh tế
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                gv00061@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('sv000001@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-orange-600">
                                                🎓 Sinh viên - Khoa CNTT
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                sv000001@university.edu
                                            </span>
                                        </div>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            fillDemoAccount('sv000301@university.edu', '123456');
                                            handleSubmit(onSubmit)();
                                        }}
                                        className="justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-xs text-orange-600">
                                                🎓 Sinh viên - Khoa Kinh tế
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                sv000301@university.edu
                                            </span>
                                        </div>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                    Mật khẩu tất cả tài khoản: <strong>123456</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
