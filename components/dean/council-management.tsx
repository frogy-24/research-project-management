'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Users, UserPlus, UserMinus, Calendar, CheckCircle2, FileText, GraduationCap, UserCheck, BarChart3, Split, Loader2, UserCog } from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import { useCouncilMembers, useAssignCouncilMember, useRemoveCouncilMember, useCreateExternalCouncilMember } from '@/hooks/useCouncilMembers';
import { useDeanLecturers } from '@/hooks/useDeanLecturers';
import { useCallRoundStats } from '@/hooks/useCallRoundStats';
import { useCouncils, useAutoDivideCouncils, useCreateCouncil } from '@/hooks/useCouncils';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { CouncilMemberAssignment } from '@/types/council.schema';
import { Label } from '@/components/ui/label';

// Create Council Dialog Component
function CreateCouncilDialog({ callRoundId, councilMembers }: { callRoundId: string; councilMembers: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [councilName, setCouncilName] = useState('');
    const [councilDescription, setCouncilDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Array<{ councilMemberId: string; role: string }>>([]);
    const [searchMember, setSearchMember] = useState('');
    
    const createCouncilMutation = useCreateCouncil();

    const roles = ['Chủ tịch', 'Thư ký', 'Ủy viên'];

    const availableMembers = councilMembers.filter(m => 
        !selectedMembers.some(sm => sm.councilMemberId === m.councilMember.id)
    ).filter(m => 
        m.councilMember.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.councilMember.email.toLowerCase().includes(searchMember.toLowerCase())
    );

    const handleAddMember = (memberId: string) => {
        if (selectedMembers.length >= 3) {
            toast.error('Hội đồng tối đa 3 thành viên');
            return;
        }
        
        // Auto-assign role based on order
        const roleIndex = selectedMembers.length;
        setSelectedMembers(prev => [...prev, {
            councilMemberId: memberId,
            role: roles[roleIndex]
        }]);
    };

    const handleRemoveMember = (memberId: string) => {
        setSelectedMembers(prev => prev.filter(m => m.councilMemberId !== memberId));
    };

    const handleUpdateRole = (memberId: string, role: string) => {
        setSelectedMembers(prev => prev.map(m => 
            m.councilMemberId === memberId ? { ...m, role } : m
        ));
    };

    const handleCreate = () => {
        if (!councilName.trim()) {
            toast.error('Vui lòng nhập tên hội đồng');
            return;
        }
        if (selectedMembers.length < 3) {
            toast.error('Vui lòng chọn đủ 3 thành viên');
            return;
        }

        createCouncilMutation.mutate(
            {
                callRoundId,
                name: councilName,
                description: councilDescription || undefined,
                members: selectedMembers,
            },
            {
                onSuccess: () => {
                    toast.success('Đã tạo hội đồng thành công');
                    setIsOpen(false);
                    setCouncilName('');
                    setCouncilDescription('');
                    setSelectedMembers([]);
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi tạo hội đồng');
                },
            }
        );
    };

    const getMemberInfo = (memberId: string) => {
        const member = councilMembers.find(m => m.councilMember.id === memberId);
        return member?.councilMember;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo hội đồng
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Tạo hội đồng mới</DialogTitle>
                    <DialogDescription>
                        Nhập thông tin và chọn 3 thành viên cho hội đồng
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Council Info */}
                    <div className="space-y-2">
                        <Label>
                            Tên hội đồng <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            placeholder="VD: Hội đồng 1"
                            value={councilName}
                            onChange={(e) => setCouncilName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Mô tả</Label>
                        <Input
                            placeholder="Mô tả hội đồng (tùy chọn)"
                            value={councilDescription}
                            onChange={(e) => setCouncilDescription(e.target.value)}
                        />
                    </div>

                    {/* Selected Members */}
                    <div className="space-y-2">
                        <Label>
                            Thành viên đã chọn ({selectedMembers.length}/3) <span className="text-destructive">*</span>
                        </Label>
                        {selectedMembers.length === 0 ? (
                            <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
                                Chưa chọn thành viên nào
                            </div>
                        ) : (
                            <div className="space-y-2 border rounded-md p-2">
                                {selectedMembers.map((sm) => {
                                    const memberInfo = getMemberInfo(sm.councilMemberId);
                                    return (
                                        <div key={sm.councilMemberId} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{memberInfo?.name}</p>
                                                <p className="text-xs text-muted-foreground">{memberInfo?.email}</p>
                                            </div>
                                            <Select value={sm.role} onValueChange={(role) => handleUpdateRole(sm.councilMemberId, role)}>
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map(role => (
                                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMember(sm.councilMemberId)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Available Members */}
                    {selectedMembers.length < 3 && (
                        <div className="space-y-2">
                            <Label>Chọn thành viên</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm thành viên..."
                                    value={searchMember}
                                    onChange={(e) => setSearchMember(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <ScrollArea className="h-[200px] border rounded-md p-2">
                                {availableMembers.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        Không tìm thấy thành viên
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {availableMembers.map((member) => (
                                            <div
                                                key={member.councilMember.id}
                                                className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                                                onClick={() => handleAddMember(member.councilMember.id)}
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">{member.councilMember.name}</p>
                                                    <p className="text-xs text-muted-foreground">{member.councilMember.email}</p>
                                                </div>
                                                <Button variant="ghost" size="sm">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Hủy</Button>
                    </DialogClose>
                    <Button
                        onClick={handleCreate}
                        disabled={createCouncilMutation.isPending || selectedMembers.length < 3 || !councilName.trim()}
                    >
                        {createCouncilMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Đang tạo...
                            </>
                        ) : (
                            'Tạo hội đồng'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CouncilManagement() {
    const [selectedCallRoundId, setSelectedCallRoundId] = useState<string>('');
    const [searchLecturer, setSearchLecturer] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isCreateExternalDialogOpen, setIsCreateExternalDialogOpen] = useState(false);
    const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [externalMemberForm, setExternalMemberForm] = useState({
        name: '',
        email: '',
        phone: '',
        organization: '',
    });

    // Fetch call rounds của khoa
    const { data: callRoundsData, isLoading: loadingCallRounds } = useCallRounds();
    const callRounds = callRoundsData ?? [];

    // Fetch council members của call round đã chọn (with server-side pagination)
    const { data: councilData, isLoading: loadingCouncil } = useCouncilMembers(
        selectedCallRoundId,
        currentPage,
        itemsPerPage
    );
    const councilMembers = councilData?.data ?? [];
    const pagination = councilData?.pagination;

    // Fetch statistics for selected call round
    const { data: stats, isLoading: loadingStats } = useCallRoundStats(selectedCallRoundId || null);

    // Fetch councils for selected call round
    const { data: councils, isLoading: loadingCouncils } = useCouncils(selectedCallRoundId);

    // Fetch giảng viên trong khoa để thêm vào hội đồng
    const { data: lecturersData, isLoading: loadingLecturers } = useDeanLecturers();
    const allLecturers = lecturersData?.data ?? [];

    // Mutations
    const assignMutation = useAssignCouncilMember();
    const removeMutation = useRemoveCouncilMember();
    const createExternalMutation = useCreateExternalCouncilMember();
    const autoDivideMutation = useAutoDivideCouncils(selectedCallRoundId || '');

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

    const handleCreateExternalMember = () => {
        if (!selectedCallRoundId) return;
        
        // Validation
        if (!externalMemberForm.name.trim()) {
            toast.error('Vui lòng nhập họ tên');
            return;
        }
        if (!externalMemberForm.email.trim()) {
            toast.error('Vui lòng nhập email');
            return;
        }
        
        createExternalMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                ...externalMemberForm,
            },
            {
                onSuccess: () => {
                    toast.success('Đã tạo và thêm thành viên thành công');
                    setIsCreateExternalDialogOpen(false);
                    setExternalMemberForm({ name: '', email: '', phone: '', organization: '' });
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi tạo thành viên');
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

    // Reset to page 1 when changing call round
    const handleCallRoundChange = (value: string) => {
        setSelectedCallRoundId(value);
        setCurrentPage(1);
    };

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
                            onValueChange={handleCallRoundChange}
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

            {/* Statistics Card */}
            {selectedCallRoundId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Thống kê Tổng quan
                        </CardTitle>
                        <CardDescription>
                            Thông tin về đề tài và sinh viên đăng ký trong đợt này
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="grid gap-4 md:grid-cols-4">
                                {[1, 2, 3, 4].map(i => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        ) : stats ? (
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <Card className="border-primary/20 bg-primary/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <FileText className="h-5 w-5 text-primary" />
                                                <span className="text-2xl font-bold">{stats.totalRegistrations}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Tổng đề tài đăng ký</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-blue-500/20 bg-blue-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <GraduationCap className="h-5 w-5 text-blue-600" />
                                                <span className="text-2xl font-bold">{stats.totalStudents}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Sinh viên đăng ký</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-green-500/20 bg-green-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <UserCheck className="h-5 w-5 text-green-600" />
                                                <span className="text-2xl font-bold">{stats.totalInstructors}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Giảng viên hướng dẫn</p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-purple-500/20 bg-purple-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <Users className="h-5 w-5 text-purple-600" />
                                                <span className="text-2xl font-bold">{stats.totalCouncilMembers}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Thành viên hội đồng</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Status Breakdown */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Trạng thái đơn đăng ký</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Chờ duyệt:</span>
                                                <Badge variant="secondary">{stats.statusBreakdown.pending}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã duyệt:</span>
                                                <Badge variant="default">{stats.statusBreakdown.approved}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ chối:</span>
                                                <Badge variant="destructive">{stats.statusBreakdown.rejected}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã hủy:</span>
                                                <Badge variant="outline">{stats.statusBreakdown.canceled}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Trạng thái giảng viên</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Chờ phản hồi:</span>
                                                <Badge variant="secondary">{stats.instructorStatusBreakdown.pending}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã chấp nhận:</span>
                                                <Badge variant="default">{stats.instructorStatusBreakdown.accepted}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ chối:</span>
                                                <Badge variant="destructive">{stats.instructorStatusBreakdown.rejected}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Duyệt khoa</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Chờ duyệt:</span>
                                                <Badge variant="secondary">{stats.facultyStatusBreakdown.pending}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã duyệt:</span>
                                                <Badge variant="default">{stats.facultyStatusBreakdown.approved}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ chối:</span>
                                                <Badge variant="destructive">{stats.facultyStatusBreakdown.rejected}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            )}

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
                                {selectedCallRound?.name} - {pagination?.total || 0} thành viên
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={isCreateExternalDialogOpen} onOpenChange={setIsCreateExternalDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <UserCog className="h-4 w-4 mr-2" />
                                        Tạo thành viên mới
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>Tạo thành viên mới</DialogTitle>
                                        <DialogDescription>
                                            Nhập thông tin để tạo thành viên hội đồng từ bên ngoài khoa
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Họ tên <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                placeholder="Nhập họ tên..."
                                                value={externalMemberForm.name}
                                                onChange={(e) => setExternalMemberForm(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Email <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                type="email"
                                                placeholder="Nhập email..."
                                                value={externalMemberForm.email}
                                                onChange={(e) => setExternalMemberForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Số điện thoại</label>
                                            <Input
                                                placeholder="Nhập số điện thoại..."
                                                value={externalMemberForm.phone}
                                                onChange={(e) => setExternalMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Đơn vị công tác</label>
                                            <Input
                                                placeholder="Nhập đơn vị công tác..."
                                                value={externalMemberForm.organization}
                                                onChange={(e) => setExternalMemberForm(prev => ({ ...prev, organization: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Hủy</Button>
                                        </DialogClose>
                                        <Button
                                            onClick={handleCreateExternalMember}
                                            disabled={createExternalMutation.isPending}
                                        >
                                            {createExternalMutation.isPending ? 'Đang tạo...' : 'Tạo và thêm vào hội đồng'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
                        </div>
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
                            <div className="space-y-4">
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
                                                <TableCell className="text-muted-foreground">
                                                    {((pagination?.page || 1) - 1) * itemsPerPage + index + 1}
                                                </TableCell>
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
                                
                                {/* Pagination */}
                                {pagination && pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} thành viên
                                        </p>
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                    />
                                                </PaginationItem>
                                                
                                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            onClick={() => setCurrentPage(page)}
                                                            isActive={currentPage === page}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                
                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                                        className={currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Councils List - Show councils divided from members */}
            {selectedCallRoundId && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Split className="h-5 w-5" />
                                Danh sách Hội đồng ({councils?.length || 0} hội đồng)
                            </CardTitle>
                            <CardDescription>
                                Các hội đồng đã được phân công thành viên và đề tài
                            </CardDescription>
                        </div>
                        <CreateCouncilDialog 
                            callRoundId={selectedCallRoundId}
                            councilMembers={councilMembers}
                        />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {councils?.map((council) => (
                                <Card key={council.id} className="border-2">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{council.name}</CardTitle>
                                                {council.description && (
                                                    <CardDescription className="mt-1">
                                                        {council.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge variant="secondary">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {council._count.members} thành viên
                                                </Badge>
                                                <Badge variant="default">
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    {council._count.projects} đề tài
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Members */}
                                        {council.members.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    Thành viên hội đồng
                                                </h4>
                                                <div className="space-y-2">
                                                    {council.members.map((member) => (
                                                        <div
                                                            key={member.id}
                                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className="font-normal">
                                                                    {member.role}
                                                                </Badge>
                                                                <div>
                                                                    <p className="font-medium text-sm">
                                                                        {member.councilMember.name}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {member.councilMember.email}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Projects */}
                                        {council.projects.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    Đề tài được phân công
                                                </h4>
                                                <div className="space-y-2">
                                                    {council.projects.map((project) => (
                                                        <div
                                                            key={project.id}
                                                            className="p-3 rounded-md border bg-background"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-sm">
                                                                        {project.projectRegistration.title}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Sinh viên: {project.projectRegistration.user.name} ({project.projectRegistration.user.code})
                                                                    </p>
                                                                </div>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {project.projectRegistration.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
