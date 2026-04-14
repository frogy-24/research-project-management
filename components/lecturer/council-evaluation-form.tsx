'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCouncilEvaluationSchema, type CreateCouncilEvaluationInput } from '@/types/council-evaluation.schema';
import { useCreateCouncilEvaluation } from '@/hooks/useProjectOperations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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

    const decisionLabels = {
        PASS: 'Đạt',
        NEED_REVISION: 'Cần sửa đổi',
        FAIL: 'Không đạt',
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
                                            Điểm số (0-100) <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                placeholder="Nhập điểm từ 0 đến 100"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    field.onChange(value === '' ? undefined : parseInt(value, 10));
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
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="flex flex-col space-y-2"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="PASS" id="pass" />
                                                    <Label htmlFor="pass" className="font-normal cursor-pointer">
                                                        {decisionLabels.PASS}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="NEED_REVISION" id="need-revision" />
                                                    <Label
                                                        htmlFor="need-revision"
                                                        className="font-normal cursor-pointer"
                                                    >
                                                        {decisionLabels.NEED_REVISION}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="FAIL" id="fail" />
                                                    <Label htmlFor="fail" className="font-normal cursor-pointer">
                                                        {decisionLabels.FAIL}
                                                    </Label>
                                                </div>
                                            </RadioGroup>
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
