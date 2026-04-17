'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCouncilEvaluationSchema, type CreateCouncilEvaluationInput } from '@/types/council-evaluation.schema';
import { useCreateCouncilEvaluation } from '@/hooks/useProjectOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

interface CouncilEvaluationFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectTitle: string;
    advisorName?: string;
    studentName?: string;
    onSuccess?: () => void;
}

const decisionOptions = [
    { value: 'PASS', label: 'Đạt' },
    { value: 'NEED_REVISION', label: 'Cần sửa đổi' },
    { value: 'FAIL', label: 'Không đạt' },
] as const;

export function CouncilEvaluationForm({
    open,
    onOpenChange,
    projectId,
    projectTitle,
    advisorName,
    studentName,
    onSuccess,
}: CouncilEvaluationFormProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const createMutation = useCreateCouncilEvaluation();

    const form = useForm<CreateCouncilEvaluationInput>({
        resolver: zodResolver(createCouncilEvaluationSchema),
        defaultValues: {
            score: undefined,
            decision: undefined,
            comment: '',
        },
    });

    const onSubmit = (data: CreateCouncilEvaluationInput) => {
        void data;
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        const data = form.getValues();
        createMutation.mutate(
            { projectId, payload: data },
            {
                onSuccess: () => {
                    toast.success('Gửi đánh giá thành công');
                    form.reset();
                    setShowConfirm(false);
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (error: any) => {
                    const message = error?.response?.data?.error || 'Không thể gửi đánh giá. Vui lòng thử lại';
                    toast.error(message);
                    setShowConfirm(false);
                },
            }
        );
    };

    const handleCancel = () => {
        form.reset();
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chấm điểm đề tài</DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-1 pt-2">
                                <div className="font-medium text-foreground">{projectTitle}</div>
                                {advisorName && <div className="text-sm">GVHD: {advisorName}</div>}
                                {studentName && <div className="text-sm">SV: {studentName}</div>}
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="score"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Điểm số (0-10) <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={10}
                                                step="0.1"
                                                placeholder="Nhập điểm từ 0 đến 10"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : parseFloat(value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="decision"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>
                                            Quyết định <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                {decisionOptions.map((option) => {
                                                    const isSelected = field.value === option.value;
                                                    const selectedClass =
                                                        option.value === 'PASS'
                                                            ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : option.value === 'NEED_REVISION'
                                                              ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
                                                              : 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700';

                                                    return (
                                                        <Button
                                                            key={option.value}
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => field.onChange(option.value)}
                                                            className={cn(
                                                                'justify-center font-medium transition-colors',
                                                                isSelected
                                                                    ? selectedClass
                                                                    : 'border-border bg-background text-foreground hover:bg-muted/50'
                                                            )}
                                                        >
                                                            {option.label}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="comment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nhận xét (tùy chọn)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Nhập nhận xét về đề tài (tùy chọn)"
                                                className="min-h-[100px] resize-none"
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận gửi đánh giá</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn gửi đánh giá này? Sau khi gửi, bạn không thể chỉnh sửa hoặc xóa đánh
                            giá.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Đang gửi...' : 'Xác nhận'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
