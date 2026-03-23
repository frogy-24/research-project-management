'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Users, UserPlus, UserMinus, Calendar, CheckCircle2 } from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import { useCouncilMembers, useAssignCouncilMember, useRemoveCouncilMember } from '@/hooks/useCouncilMembers';
import { useDeanLecturers } from '@/hooks/useDeanLecturers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CouncilManagement() {
    const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>('');
    const [searchLecturer, setSearchLecturer] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);

    // Fetch call rounds của khoa
    const { data: callRoundsData, isLoading: loadingCallRounds } = useCallRounds();
    const callRounds = callRoundsData ?? [];

    // Fetch council members của call round đã chọn
    const { data: councilData, isLoading: loadingCouncil } = useCouncilMembers(selectedCallRoundId);
    const councilMembers = councilData?.data ?? [];

    // Fetch giảng viên trong khoa để thêm vào hội đồng
    const { data: lecturersData, isLoading: loadingLecturers } = useDeanLecturers();
    const allLecturers = lecturersData?.data ?? [];

    // Mutations
    const assignMutation = useAssignCouncilMember();
    const removeMutation = useRemoveCouncilMember();

    // Lọc giảng viên chưa có trong hội đồng
    const councilMemberIds = councilMembers.map(m => m.councilMember.id);
    const availableLecturers = allLecturers.filter(l => !councilMemberIds.includes(l.id));
    const filteredLecturers = availableLecturers.filter(l =>
        l.name.toLowerCase().includes(searchLecturer.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchLecturer.toLowerCase()))
    );

    const handleAssignMembers = () => {
        if (!selectedCallRoundId || selectedLecturers.length === 0) return;

        // Assign từng lecturer
        selectedLecturers.forEach(lecturerId => {
            assignMutation.mutate(
                { callRoundId: selectedCallRoundId, councilMemberId: lecturerId },
                {
                    onSuccess: () => {
                        toast.success('Đã thêm thành viên hội đồng thành công');
                    },
                    onError: () => {
                        toast.error('Lỗi khi thêm thành viên hội đồng');
                    },
                }
            );
        });

        setSelectedLecturers([]);
        setIsAddDialogOpen(false);
    };

    const handleRemoveMember = (memberId: string) => {
        if (!selectedCallRoundId) return;

        removeMutation.mutate(
            { callRoundId: selectedCallRoundId, councilMemberId: memberId },
            {
                onSuccess: () => {
                    toast.success('Đã xóa thành viên khỏi hội đồng');
                },
                onError: () => {
                    toast.error('Lỗi khi xóa thành viên hội đồng');
                },
            }
        );
    };

    const toggleLecturerSelection = (lecturerId: string) => {
        setSelectedLecturers(prev =>
            prev.includes(lecturerId)
                ? prev.filter(id => id !== lecturerId)
                : [...prev, lecturerId]
        );
    };

    const selectedCallRound = callRounds.find((cr: { id: string }) => cr.id === selectedCallRoundId);

    return (
        <div className="space-y-6">
            {/* Select Call Round */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Chọn Đợt Đăng Ký
                    </CardTitle>
                    <CardDescription>
                        Chọn đợt đăng ký để quản lý thành viên hội đồng đánh giá
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingCallRounds ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select
                            value={selectedCallRoundId}
                            onValueChange={setSelectedCallRoundId}
                        >
                            <SelectTrigger className="w-full md:w-[400px]">
                                <SelectValue placeholder="Chọn đợt đăng ký..." />
                            </SelectTrigger>
                            <SelectContent>
                                {callRounds.map((cr: { id: string; name: string; isActive: boolean }) => (
                                    <SelectItem key={cr.id} value={cr.id}>
                                        <div className="flex items-center gap-2">
                                            <span>{cr.name}</span>
                                            <Badge variant={cr.isActive ? 'default' : 'secondary'} className="text-xs">
                                                {cr.isActive ? 'Đang mở' : 'Đã đóng'}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {/* Council Members */}
            {selectedCallRoundId && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Thành viên Hội đồng
                            </CardTitle>
                            <CardDescription>
                                {selectedCallRound?.name} - {councilMembers.length} thành viên
                            </CardDescription>
                        </div>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Thêm thành viên
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Thêm thành viên Hội đồng</DialogTitle>
                                    <DialogDescription>
                                        Chọn giảng viên để thêm vào hội đồng đánh giá
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Tìm kiếm giảng viên..."
                                            value={searchLecturer}
                                            onChange={(e) => setSearchLecturer(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <ScrollArea className="h-[300px] rounded-md border p-2">
                                        {loadingLecturers ? (
                                            <div className="space-y-2">
                                                {[1, 2, 3].map(i => (
                                                    <Skeleton key={i} className="h-12 w-full" />
                                                ))}
                                            </div>
                                        ) : filteredLecturers.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-4">
                                                Không có giảng viên nào
                                            </p>
                                        ) : (
                                            <div className="space-y-1">
                                                {filteredLecturers.map((lecturer) => (
                                                    <div
                                                        key={lecturer.id}
                                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                                        onClick={() => toggleLecturerSelection(lecturer.id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedLecturers.includes(lecturer.id)}
                                                            onCheckedChange={() => toggleLecturerSelection(lecturer.id)}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{lecturer.name}</p>
                                                            <p className="text-xs text-muted-foreground">{lecturer.email}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                    {selectedLecturers.length > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            Đã chọn: {selectedLecturers.length} giảng viên
                                        </p>
                                    )}
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Hủy</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleAssignMembers}
                                        disabled={selectedLecturers.length === 0 || assignMutation.isPending}
                                    >
                                        {assignMutation.isPending ? 'Đang thêm...' : 'Thêm vào hội đồng'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {loadingCouncil ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : councilMembers.length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-lg">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    Chưa có thành viên nào trong hội đồng
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Nhấn "Thêm thành viên" để bắt đầu
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Họ tên</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Ngày thêm</TableHead>
                                        <TableHead className="text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {councilMembers.map((member, index) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{member.councilMember.name}</TableCell>
                                            <TableCell>{member.councilMember.email}</TableCell>
                                            <TableCell>
                                                {new Date(member.createdAt).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveMember(member.councilMember.id)}
                                                    disabled={removeMutation.isPending}
                                                >
                                                    <UserMinus className="h-4 w-4 mr-1" />
                                                    Xóa
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
