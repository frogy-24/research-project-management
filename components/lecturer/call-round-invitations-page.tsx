'use client';

import * as React from 'react';
import { Clock, CheckCircle, XCircle, Calendar, Users, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    useCallRoundInvitationOptions,
    useCallRoundInvitations,
    useRespondToInvitation,
} from '@/hooks/useCallRoundInvitations';
import { format } from 'date-fns';

function parseValidDate(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: unknown, pattern = 'dd/MM/yyyy HH:mm'): string {
    const date = parseValidDate(value);
    if (!date) return '-';
    return format(date, pattern);
}

function InvitationStatusBadge({ status }: { status: string }) {
    if (status === 'ACCEPTED') {
        return (
            <Badge variant="default" className="gap-1 bg-emerald-500 text-white">
                <CheckCircle className="h-3 w-3" />
                Đã đồng ý
            </Badge>
        );
    }
    if (status === 'REJECTED') {
        return (
            <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Đã từ chối
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
            <Clock className="h-3 w-3" />
            Chờ phản hồi
        </Badge>
    );
}

function InvitationCard({
    invitation,
    invitationType,
}: {
    invitation: any;
    invitationType: 'INSTRUCTOR' | 'COUNCIL_MEMBER';
}) {
    const respondMutation = useRespondToInvitation();
    const [confirmDialog, setConfirmDialog] = React.useState<{
        open: boolean;
        action: 'ACCEPTED' | 'REJECTED' | 'PENDING' | null;
    }>({ open: false, action: null });

    const isPending = invitation.invitationStatus === 'PENDING';
    const isAccepted = invitation.invitationStatus === 'ACCEPTED';
    const isRejected = invitation.invitationStatus === 'REJECTED';
    const invitationDeadline = parseValidDate(invitation.callRound.invitationDeadline);
    const isExpired = isPending && invitationDeadline ? invitationDeadline.getTime() <= Date.now() : false;

    const handleConfirmAction = () => {
        if (!confirmDialog.action) return;

        respondMutation.mutate(
            {
                invitationId: invitation.id,
                invitationType,
                status: confirmDialog.action,
            },
            {
                onSuccess: () => {
                    setConfirmDialog({ open: false, action: null });
                },
            },
        );
    };

    return (
        <>
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg">{invitation.callRound.name}</CardTitle>
                            <CardDescription className="mt-1">
                                {invitationType === 'INSTRUCTOR'
                                    ? 'Vai trò: Giảng viên hướng dẫn'
                                    : 'Vai trò: Thành viên hội đồng'}
                            </CardDescription>
                        </div>
                        <InvitationStatusBadge status={invitation.invitationStatus} />
                    </div>
                </CardHeader>
                <CardContent>
                    {invitation.callRound.description && (
                        <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                            {invitation.callRound.description}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Đăng ký</p>
                                <p className="font-medium">
                                    {formatDateTime(invitation.callRound.registrationStartDate, 'dd/MM/yyyy')} -{' '}
                                    {formatDateTime(invitation.callRound.registrationEndDate, 'dd/MM/yyyy')}
                                </p>
                            </div>
                        </div>
                        {invitation.callRound.defenseDate && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Bảo vệ</p>
                                    <p className="font-medium">
                                        {formatDateTime(invitation.callRound.defenseDate, 'dd/MM/yyyy HH:mm')}
                                    </p>
                                </div>
                            </div>
                        )}
                        {invitation.callRound.invitationDeadline && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Hạn phản hồi</p>
                                    <p className="font-medium">
                                        {formatDateTime(invitation.callRound.invitationDeadline)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {isExpired && isPending && (
                        <p className="text-sm text-red-500 mb-4">
                            Đã hết hạn phản hồi. Bạn không thể thay đổi trạng thái lời mời.
                        </p>
                    )}

                    {isPending && !isExpired && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmDialog({ open: true, action: 'REJECTED' })}
                                    disabled={respondMutation.isPending}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Từ chối
                                </Button>
                                <Button
                                    onClick={() => setConfirmDialog({ open: true, action: 'ACCEPTED' })}
                                    disabled={respondMutation.isPending}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Đồng ý
                                </Button>
                            </div>
                        </>
                    )}

                    {isAccepted && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmDialog({ open: true, action: 'PENDING' })}
                                    disabled={respondMutation.isPending}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Hủy đồng ý
                                </Button>
                            </div>
                        </>
                    )}

                    {isRejected && (
                        <>
                            <Separator className="my-4" />
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmDialog({ open: true, action: 'PENDING' })}
                                    disabled={respondMutation.isPending}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Hủy từ chối
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, action: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmDialog.action === 'ACCEPTED' && 'Xác nhận đồng ý'}
                            {confirmDialog.action === 'REJECTED' && 'Xác nhận từ chối'}
                            {confirmDialog.action === 'PENDING' && 'Xác nhận hủy'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmDialog.action === 'ACCEPTED' &&
                                'Bạn có chắc chắn muốn đồng ý tham gia đợt đăng ký này? Bạn có thể hủy sau nếu cần.'}
                            {confirmDialog.action === 'REJECTED' &&
                                'Bạn có chắc chắn muốn từ chối lời mời này? Bạn có thể hủy sau nếu cần.'}
                            {confirmDialog.action === 'PENDING' &&
                                isAccepted &&
                                'Bạn có chắc chắn muốn hủy lời đồng ý? Trạng thái sẽ chuyển về "Chờ phản hồi".'}
                            {confirmDialog.action === 'PENDING' &&
                                isRejected &&
                                'Bạn có chắc chắn muốn hủy lời từ chối? Trạng thái sẽ chuyển về "Chờ phản hồi".'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialog({ open: false, action: null })}
                            disabled={respondMutation.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            disabled={respondMutation.isPending}
                            variant={confirmDialog.action === 'REJECTED' ? 'destructive' : 'default'}
                        >
                            {respondMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function LecturerCallRoundInvitations() {
    const [selectedCallRoundId, setSelectedCallRoundId] = React.useState<string>('');
    const { data: options, isLoading: isLoadingOptions } = useCallRoundInvitationOptions();
    const { data, isLoading } = useCallRoundInvitations(selectedCallRoundId, Boolean(selectedCallRoundId));

    if (isLoadingOptions) {
        return <div className="flex items-center justify-center h-96">Đang tải...</div>;
    }

    const instructorInvitations = data?.instructorInvitations || [];
    const councilMemberInvitations = data?.councilMemberInvitations || [];

    const pendingCount =
        instructorInvitations.filter((i) => i.invitationStatus === 'PENDING').length +
        councilMemberInvitations.filter((i) => i.invitationStatus === 'PENDING').length;

    return (
        <div className="container mx-auto p-6 space-y-6 flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lời mời tham gia đợt đăng ký</h1>
                    <p className="text-muted-foreground mt-1">Xem và phản hồi các lời mời từ Trưởng khoa</p>
                </div>
                {pendingCount > 0 && (
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                        <Clock className="h-4 w-4" />
                        {pendingCount} lời mời chờ phản hồi
                    </Badge>
                )}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-2 max-w-md">
                        <p className="text-sm font-medium">Lọc theo đợt đăng ký</p>
                        <Select value={selectedCallRoundId} onValueChange={setSelectedCallRoundId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn đợt đăng ký để tải lời mời" />
                            </SelectTrigger>
                            <SelectContent>
                                {options && options.length > 0 ? (
                                    options.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="no-options" disabled>
                                        Không có đợt đăng ký
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {!selectedCallRoundId ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Vui lòng chọn đợt đăng ký để xem lời mời
                    </CardContent>
                </Card>
            ) : isLoading ? (
                <div className="flex items-center justify-center h-96">Đang tải lời mời...</div>
            ) : (
                <Tabs defaultValue="all" className="mt-4 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Tất cả</TabsTrigger>
                        <TabsTrigger value="instructor">
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Giảng viên hướng dẫn
                        </TabsTrigger>
                        <TabsTrigger value="council">
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Thành viên hội đồng
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                        {instructorInvitations.length === 0 && councilMemberInvitations.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Chưa có lời mời nào
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {instructorInvitations.map((invitation) => (
                                    <InvitationCard
                                        key={invitation.id}
                                        invitation={invitation}
                                        invitationType="INSTRUCTOR"
                                    />
                                ))}
                                {councilMemberInvitations.map((invitation) => (
                                    <InvitationCard
                                        key={invitation.id}
                                        invitation={invitation}
                                        invitationType="COUNCIL_MEMBER"
                                    />
                                ))}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="instructor" className="mt-4">
                        {instructorInvitations.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Chưa có lời mời giảng viên hướng dẫn nào
                                </CardContent>
                            </Card>
                        ) : (
                            instructorInvitations.map((invitation) => (
                                <InvitationCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    invitationType="INSTRUCTOR"
                                />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="council" className="mt-4">
                        {councilMemberInvitations.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Chưa có lời mời thành viên hội đồng nào
                                </CardContent>
                            </Card>
                        ) : (
                            councilMemberInvitations.map((invitation) => (
                                <InvitationCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    invitationType="COUNCIL_MEMBER"
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
