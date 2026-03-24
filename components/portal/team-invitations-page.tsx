'use client';

import { toast } from 'sonner';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyTeamInvitations, useRespondMyTeamInvitation } from '@/hooks/useMyTeamInvitations';

const statusLabel: Record<'PENDING' | 'ACCEPTED' | 'REJECTED', string> = {
    PENDING: 'Chờ xác nhận',
    ACCEPTED: 'Đã đồng ý',
    REJECTED: 'Đã từ chối',
};

const statusVariant: Record<'PENDING' | 'ACCEPTED' | 'REJECTED', 'secondary' | 'default' | 'destructive'> = {
    PENDING: 'secondary',
    ACCEPTED: 'default',
    REJECTED: 'destructive',
};

const registrationStatusLabel: Record<'PENDING' | 'APPROVED' | 'CANCELED' | 'REJECTED', string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    CANCELED: 'Đã hủy',
    REJECTED: 'Bị từ chối',
};

const registrationStatusVariant: Record<'PENDING' | 'APPROVED' | 'CANCELED' | 'REJECTED', 'secondary' | 'default' | 'outline' | 'destructive'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    CANCELED: 'outline',
    REJECTED: 'destructive',
};

const instructorStatusLabel: Record<'PENDING' | 'ACCEPTED' | 'REJECTED', string> = {
    PENDING: 'Giảng viên chưa phản hồi',
    ACCEPTED: 'Giảng viên đã đồng ý',
    REJECTED: 'Giảng viên đã từ chối',
};

const facultyStatusLabel: Record<'PENDING' | 'APPROVED' | 'REJECTED', string> = {
    PENDING: 'Khoa đang xử lý',
    APPROVED: 'Khoa đã duyệt',
    REJECTED: 'Khoa từ chối',
};

export function TeamInvitationsPage() {
    const { data: invitations = [], isLoading } = useMyTeamInvitations();
    const respondMutation = useRespondMyTeamInvitation();

    const handleRespond = (registrationId: string, decision: 'ACCEPTED' | 'REJECTED') => {
        respondMutation.mutate(
            { registrationId, payload: { decision } },
            {
                onSuccess: () => {
                    toast.success(decision === 'ACCEPTED' ? 'Bạn đã đồng ý tham gia nhóm.' : 'Bạn đã từ chối lời mời.');
                },
                onError: (error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Không thể xử lý lời mời lúc này.';
                    toast.error(message);
                },
            },
        );
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Lời mời tham gia nhóm đề tài</h1>
                <p className="text-sm text-muted-foreground">
                    Khi bạn được thêm vào nhóm nghiên cứu, hãy xác nhận tại đây trước khi đề tài được triển khai.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={`invitation-skeleton-${index}`}>
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-4 w-2/5" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-9 w-48" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : invitations.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Hiện chưa có lời mời tham gia nhóm nào.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {invitations.map((invitation) => {
                        const canRespond = invitation.invitationStatus === 'PENDING';
                        return (
                            <Card key={invitation.registrationId} className="border-border/60">
                                <CardHeader>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{invitation.registrationTitle}</CardTitle>
                                            <CardDescription>
                                                Mời bởi: <span className="font-medium">{invitation.inviterName}</span>
                                            </CardDescription>
                                        </div>
                                        <Badge variant={statusVariant[invitation.invitationStatus]}>
                                            {statusLabel[invitation.invitationStatus]}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                        <span>Vai trò trong nhóm: {invitation.role}</span>
                                        <span>•</span>
                                        <span>
                                            Được mời lúc: {new Date(invitation.invitedAt).toLocaleString('vi-VN')}
                                        </span>
                                        {invitation.respondedAt && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Đã phản hồi: {new Date(invitation.respondedAt).toLocaleString('vi-VN')}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    <div className="rounded-md border bg-muted/20 p-4 space-y-3">
                                        <h3 className="text-sm font-semibold">Chi tiết đề tài</h3>
                                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground">Người mời</p>
                                                <p className="font-medium">{invitation.inviterName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {invitation.inviterEmail || 'Chưa có email'}
                                                    {invitation.inviterCode ? ` • ${invitation.inviterCode}` : ''}
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-muted-foreground">Giảng viên hướng dẫn</p>
                                                <p className="font-medium">
                                                    {invitation.instructorName || 'Chưa phân công giảng viên'}
                                                </p>
                                                {invitation.instructorEmail && (
                                                    <p className="text-xs text-muted-foreground">{invitation.instructorEmail}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-muted-foreground">Đợt đăng ký</p>
                                                <p className="font-medium">{invitation.callRoundName || 'Chưa gắn đợt đề tài'}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-muted-foreground">Trạng thái xử lý</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {invitation.registrationStatus && (
                                                        <Badge
                                                            variant={registrationStatusVariant[invitation.registrationStatus]}
                                                        >
                                                            {registrationStatusLabel[invitation.registrationStatus]}
                                                        </Badge>
                                                    )}
                                                    {invitation.instructorStatus && (
                                                        <Badge variant="outline">
                                                            {instructorStatusLabel[invitation.instructorStatus]}
                                                        </Badge>
                                                    )}
                                                    {invitation.facultyStatus && (
                                                        <Badge variant="outline">
                                                            {facultyStatusLabel[invitation.facultyStatus]}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-sm">Mục tiêu nghiên cứu</p>
                                            <p className="text-sm whitespace-pre-wrap">
                                                {invitation.registrationObjective || 'Chưa cập nhật mục tiêu nghiên cứu'}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-sm">Sản phẩm dự kiến</p>
                                            <p className="text-sm whitespace-pre-wrap">
                                                {invitation.registrationExpectedOutput || 'Chưa cập nhật sản phẩm dự kiến'}
                                            </p>
                                        </div>

                                        {invitation.teamMembers && invitation.teamMembers.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-muted-foreground text-sm">Danh sách thành viên nhóm</p>
                                                <div className="space-y-2">
                                                    {invitation.teamMembers.map((member, index) => (
                                                        <div
                                                            key={`${member.name}-${index}`}
                                                            className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2"
                                                        >
                                                            <span className="font-medium text-sm">{member.name}</span>
                                                            <Badge variant="outline">{member.role}</Badge>
                                                            <Badge variant={statusVariant[member.invitationStatus]}>
                                                                {statusLabel[member.invitationStatus]}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {canRespond ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                onClick={() => handleRespond(invitation.registrationId, 'ACCEPTED')}
                                                disabled={respondMutation.isPending}
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Đồng ý tham gia
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleRespond(invitation.registrationId, 'REJECTED')}
                                                disabled={respondMutation.isPending}
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Từ chối
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                                            <Clock3 className="h-4 w-4" />
                                            Lời mời này đã được bạn xác nhận.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
