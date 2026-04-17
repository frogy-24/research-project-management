'use client';

import { useEffect, useMemo, useState } from 'react';
import { UsersRound, Star, MessageSquareText } from 'lucide-react';
import { useMyCouncils } from '@/hooks/useMyCouncils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const decisionLabels: Record<'PASS' | 'NEED_REVISION' | 'FAIL', string> = {
    PASS: 'Đạt',
    NEED_REVISION: 'Cần sửa đổi',
    FAIL: 'Không đạt',
};

const participationRoleLabel: Record<'OWNER' | 'TEAM_MEMBER', string> = {
    OWNER: 'Trưởng nhóm',
    TEAM_MEMBER: 'Thành viên nhóm',
};

export function StudentCouncilsClient() {
    const { data = [], isLoading } = useMyCouncils();
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [callRoundFilter, setCallRoundFilter] = useState<string>('all');

    const callRoundOptions = useMemo(() => {
        const seen = new Set<string>();

        return data
            .map((item) => ({
                id: item.council.callRoundId,
                name: item.council.callRoundName,
            }))
            .filter((round) => {
                if (seen.has(round.id)) {
                    return false;
                }

                seen.add(round.id);
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }, [data]);

    const filteredData = useMemo(() => {
        if (callRoundFilter === 'all') {
            return data;
        }

        return data.filter((item) => item.council.callRoundId === callRoundFilter);
    }, [callRoundFilter, data]);

    const selectedItem = useMemo(
        () => filteredData.find((item) => item.projectAssignmentId === selectedAssignmentId) ?? null,
        [filteredData, selectedAssignmentId],
    );

    useEffect(() => {
        if (!selectedAssignmentId) {
            return;
        }

        const stillVisible = filteredData.some((item) => item.projectAssignmentId === selectedAssignmentId);
        if (!stillVisible) {
            setSelectedAssignmentId(null);
        }
    }, [filteredData, selectedAssignmentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-3">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Đang tải danh sách hội đồng...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersRound className="h-5 w-5" />
                        Hội đồng của đề tài
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Chưa có hội đồng được công bố cho đề tài mà bạn tham gia.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersRound className="h-5 w-5" />
                        Hội đồng của đề tài
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Hiển thị {filteredData.length}/{data.length} hội đồng
                        </p>
                        <div className="w-full md:w-72">
                            <Select value={callRoundFilter} onValueChange={setCallRoundFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Lọc theo đợt đề tài" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả đợt đề tài</SelectItem>
                                    {callRoundOptions.map((round) => (
                                        <SelectItem key={round.id} value={round.id}>
                                            {round.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>STT</TableHead>
                                    <TableHead>Đề tài</TableHead>
                                    <TableHead>Hội đồng</TableHead>
                                    <TableHead>Đợt đề tài</TableHead>
                                    <TableHead>Vai trò của bạn</TableHead>
                                    <TableHead>Ngày công bố</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            Không có hội đồng nào trong đợt đã chọn.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <TableRow key={item.projectAssignmentId}>
                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                            <TableCell className="max-w-72">
                                                <p className="line-clamp-2 font-medium">{item.projectTitle}</p>
                                            </TableCell>
                                            <TableCell>{item.council.name}</TableCell>
                                            <TableCell>{item.council.callRoundName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {participationRoleLabel[item.participationRole]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(item.assignedAt).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedAssignmentId(item.projectAssignmentId)}
                                                >
                                                    Hiển thị chi tiết
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedAssignmentId(null)}>
                <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedItem && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedItem.council.name}</DialogTitle>
                                <DialogDescription>{selectedItem.council.callRoundName}</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 text-sm">
                                <div className="rounded-md border p-3">
                                    <p className="text-muted-foreground">Đề tài của bạn</p>
                                    <p className="font-medium mt-1">{selectedItem.projectTitle}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Vai trò của bạn</p>
                                        <p className="font-medium mt-1">
                                            {participationRoleLabel[selectedItem.participationRole]}
                                        </p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Ngày bảo vệ</p>
                                        <p className="font-medium mt-1">
                                            {selectedItem.council.defenseDate
                                                ? new Date(selectedItem.council.defenseDate).toLocaleDateString('vi-VN')
                                                : 'Chưa cập nhật'}
                                        </p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Số đề tài trong hội đồng</p>
                                        <p className="font-medium mt-1">{selectedItem.council.projectCount}</p>
                                    </div>
                                </div>

                                <div className="rounded-md border p-3">
                                    <p className="text-muted-foreground">Nơi bảo vệ</p>
                                    <p className="font-medium mt-1">{selectedItem.council.defenseLocation || 'Chưa cập nhật'}</p>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold">Thành viên hội đồng</h3>
                                    {selectedItem.council.members.length === 0 ? (
                                        <p className="text-muted-foreground">Chưa có dữ liệu thành viên hội đồng.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedItem.council.members.map((member) => (
                                                <div
                                                    key={member.id}
                                                    className="rounded-md border p-3 text-sm flex flex-wrap items-center gap-2"
                                                >
                                                    <Badge variant="secondary">{member.role || 'Ủy viên'}</Badge>
                                                    <span className="font-medium">{member.name}</span>
                                                    <span className="text-muted-foreground">{member.code || '-'}</span>
                                                    <span className="text-muted-foreground">{member.email || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold">Kết quả đánh giá của hội đồng</h3>
                                    {selectedItem.council.evaluations.length === 0 ? (
                                        <p className="text-muted-foreground">
                                            Hội đồng chưa công bố điểm và nhận xét cho đề tài này.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                <div className="rounded-md border p-3">
                                                    <p className="text-muted-foreground">Điểm trung bình</p>
                                                    <div className="mt-1 flex items-center gap-2 font-semibold text-primary">
                                                        <Star className="h-4 w-4" />
                                                        <span>
                                                            {selectedItem.council.averageScore?.toFixed(2) ?? '-'} / 10
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                    <p className="text-muted-foreground">Số phiếu đánh giá</p>
                                                    <p className="mt-1 font-semibold">
                                                        {selectedItem.council.evaluations.length}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border p-3">
                                                    <p className="text-muted-foreground">Trạng thái</p>
                                                    <p className="mt-1 font-semibold">Đã có kết quả từ hội đồng</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {selectedItem.council.evaluations.map((evaluation) => (
                                                    <div
                                                        key={evaluation.id}
                                                        className="rounded-md border p-3 space-y-2"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="font-medium">{evaluation.councilMember.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {evaluation.councilMember.code || '-'}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="secondary">
                                                                    {decisionLabels[evaluation.decision]}
                                                                </Badge>
                                                                <Badge variant="outline" className="bg-emerald-50">
                                                                    {evaluation.score}/10
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {evaluation.comment ? (
                                                            <div className="rounded-md bg-muted/40 p-3 text-sm">
                                                                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <MessageSquareText className="h-3.5 w-3.5" />
                                                                    <span>Nhận xét</span>
                                                                </div>
                                                                <p className="whitespace-pre-wrap">{evaluation.comment}</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">
                                                                Không có nhận xét từ thành viên này.
                                                            </p>
                                                        )}

                                                        <p className="text-xs text-muted-foreground">
                                                            Đánh giá lúc:{' '}
                                                            {new Date(evaluation.evaluatedAt).toLocaleString('vi-VN')}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
