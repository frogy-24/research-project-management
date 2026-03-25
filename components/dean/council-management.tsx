'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    Users,
    UserPlus,
    UserMinus,
    Calendar,
    CheckCircle2,
    FileText,
    GraduationCap,
    UserCheck,
    BarChart3,
    Split,
    Loader2,
    UserCog,
    Pencil,
    Trash2,
    Eye,
    Sparkles,
} from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import {
    useCouncilMembers,
    useAssignCouncilMember,
    useRemoveCouncilMember,
    useCreateExternalCouncilMember,
} from '@/hooks/useCouncilMembers';
import { useDeanLecturers } from '@/hooks/useDeanLecturers';
import { useCallRoundStats } from '@/hooks/useCallRoundStats';
import {
    useCouncils,
    useAutoDivideCouncils,
    useCreateCouncil,
    useUpdateCouncil,
    useDeleteCouncil,
    useQuickAddCouncilsAI,
    useConfirmQuickAddCouncilsAI,
} from '@/hooks/useCouncils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import type { CouncilWithRelations } from '@/types/council.schema';
import type { CouncilMember } from '@/api/council-members';
import { Label } from '@/components/ui/label';

// Create Council Dialog Component
function CreateCouncilDialog({
    callRoundId,
    councilMembers,
    councils,
}: {
    callRoundId: string;
    councilMembers: CouncilMember[];
    councils: CouncilWithRelations[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [councilName, setCouncilName] = useState('');
    const [councilDescription, setCouncilDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Array<{ councilMemberId: string; role: string }>>([]);
    const [searchMember, setSearchMember] = useState('');

    const createCouncilMutation = useCreateCouncil();

    const roles = ['Chủ tịch', 'Thư ký', 'Ủy viên'];
    const occupiedMemberIds = new Set(councils.flatMap((council) => council.members.map((m) => m.councilMemberId)));

    const availableMembers = councilMembers
        .filter((m) => !occupiedMemberIds.has(m.councilMember.id))
        .filter((m) => !selectedMembers.some((sm) => sm.councilMemberId === m.councilMember.id))
        .filter(
            (m) =>
                m.councilMember.name.toLowerCase().includes(searchMember.toLowerCase()) ||
                m.councilMember.email.toLowerCase().includes(searchMember.toLowerCase()),
        );

    const handleAddMember = (memberId: string) => {
        if (selectedMembers.length >= 3) {
            toast.error('Hội đồng tối đa 3 thành viên');
            return;
        }

        // Auto-assign role based on order
        const roleIndex = selectedMembers.length;
        setSelectedMembers((prev) => [
            ...prev,
            {
                councilMemberId: memberId,
                role: roles[roleIndex],
            },
        ]);
    };

    const handleRemoveMember = (memberId: string) => {
        setSelectedMembers((prev) => prev.filter((m) => m.councilMemberId !== memberId));
    };

    const handleUpdateRole = (memberId: string, role: string) => {
        setSelectedMembers((prev) => prev.map((m) => (m.councilMemberId === memberId ? { ...m, role } : m)));
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
            },
        );
    };

    const getMemberInfo = (memberId: string) => {
        const member = councilMembers.find((m) => m.councilMember.id === memberId);
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
            <DialogContent className="max-w-2xl sm:max-w-1/2">
                <DialogHeader>
                    <DialogTitle>Tạo hội đồng mới</DialogTitle>
                    <DialogDescription>Nhập thông tin và chọn 3 thành viên cho hội đồng</DialogDescription>
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
                                        <div
                                            key={sm.councilMemberId}
                                            className="flex items-center gap-2 p-2 bg-muted rounded-md"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{memberInfo?.name}</p>
                                                <p className="text-xs text-muted-foreground">{memberInfo?.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Ngành:{' '}
                                                    {memberInfo?.major?.name || memberInfo?.major?.code || 'Chưa cập nhật'}
                                                </p>
                                            </div>
                                            <Select
                                                value={sm.role}
                                                onValueChange={(role) => handleUpdateRole(sm.councilMemberId, role)}
                                            >
                                                <SelectTrigger className="w-32.5">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {role}
                                                        </SelectItem>
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
                            <ScrollArea className="h-50 border rounded-md p-2">
                                {availableMembers.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        Không còn thành viên khả dụng để tạo hội đồng mới
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
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.councilMember.email}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Ngành:{' '}
                                                        {member.councilMember.major?.name ||
                                                            member.councilMember.major?.code ||
                                                            'Chưa cập nhật'}
                                                    </p>
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

function QuickAddCouncilsDialog({ callRoundId }: { callRoundId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [minProjectsPerCouncil, setMinProjectsPerCouncil] = useState(5);
    const [maxProjectsPerCouncil, setMaxProjectsPerCouncil] = useState(10);
    const [clearExisting, setClearExisting] = useState(false);
    const [previewItems, setPreviewItems] = useState<
        Array<{
            councilId: string;
            name: string;
            description?: string | null;
            projectCount: number;
            memberCount: number;
            agreeButton: { label: string; action: string; payload: { councilId: string } };
        }>
    >([]);
    const [selectedCouncilIds, setSelectedCouncilIds] = useState<string[]>([]);
    const [summary, setSummary] = useState('');

    const quickAddMutation = useQuickAddCouncilsAI(callRoundId);
    const confirmMutation = useConfirmQuickAddCouncilsAI(callRoundId);

    const handleGenerate = () => {
        if (!callRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (minProjectsPerCouncil > maxProjectsPerCouncil) {
            toast.error('Giá trị tối thiểu không được lớn hơn tối đa');
            return;
        }

        quickAddMutation.mutate(
            {
                callRoundId,
                minProjectsPerCouncil,
                maxProjectsPerCouncil,
                clearExisting,
            },
            {
                onSuccess: (result) => {
                    const items = result.client_view.items ?? [];
                    setPreviewItems(items);
                    setSelectedCouncilIds(items.map((item) => item.councilId));
                    setSummary(result.client_view.summary || 'Danh sách hội đồng đề xuất');
                    toast.success('Đã tạo danh sách hội đồng đề xuất');
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi tạo hội đồng nhanh');
                },
            },
        );
    };

    const toggleCouncilSelection = (councilId: string) => {
        setSelectedCouncilIds((prev) =>
            prev.includes(councilId) ? prev.filter((id) => id !== councilId) : [...prev, councilId],
        );
    };

    const handleConfirmSelected = () => {
        if (selectedCouncilIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 hội đồng để xác nhận');
            return;
        }

        confirmMutation.mutate(
            {
                callRoundId,
                selectedCouncilIds,
            },
            {
                onSuccess: (result) => {
                    toast.success(result.message || 'Đã xác nhận hội đồng thành công');
                    setIsOpen(false);
                    setPreviewItems([]);
                    setSelectedCouncilIds([]);
                    setSummary('');
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi xác nhận hội đồng');
                },
            },
        );
    };

    const handleConfirmSingle = (councilId: string) => {
        confirmMutation.mutate(
            {
                callRoundId,
                selectedCouncilIds: [councilId],
            },
            {
                onSuccess: (result) => {
                    toast.success(result.message || 'Đã xác nhận hội đồng');
                    setSelectedCouncilIds((prev) => prev.filter((id) => id !== councilId));
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi xác nhận hội đồng');
                },
            },
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Thêm nhanh hội đồng (AI)
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Thêm nhanh hội đồng</DialogTitle>
                    <DialogDescription>
                        Nhập điều kiện phân chia, hệ thống sẽ tạo danh sách hội đồng gợi ý và bạn bấm "Đồng ý" để xác nhận.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Số đề tài tối thiểu / hội đồng</Label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={minProjectsPerCouncil}
                                onChange={(e) => setMinProjectsPerCouncil(Number(e.target.value || 1))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Số đề tài tối đa / hội đồng</Label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={maxProjectsPerCouncil}
                                onChange={(e) => setMaxProjectsPerCouncil(Number(e.target.value || 1))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tùy chọn</Label>
                            <div className="h-10 px-3 border rounded-md flex items-center gap-2">
                                <Checkbox checked={clearExisting} onCheckedChange={(checked) => setClearExisting(Boolean(checked))} />
                                <span className="text-sm">Xóa hội đồng cũ trước khi tạo</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={handleGenerate} disabled={quickAddMutation.isPending}>
                            {quickAddMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Tạo danh sách gợi ý
                                </>
                            )}
                        </Button>
                        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
                    </div>

                    {previewItems.length > 0 && (
                        <div className="border rounded-md">
                            <div className="px-3 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
                                Danh sách hội đồng đề xuất ({previewItems.length})
                            </div>
                            <ScrollArea className="h-72">
                                <div className="p-2 space-y-2">
                                    {previewItems.map((item) => (
                                        <div key={item.councilId} className="border rounded-md p-3 flex items-start gap-3">
                                            <Checkbox
                                                checked={selectedCouncilIds.includes(item.councilId)}
                                                onCheckedChange={() => toggleCouncilSelection(item.councilId)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{item.name}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                                )}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Badge variant="secondary">{item.memberCount} thành viên</Badge>
                                                    <Badge>{item.projectCount} đề tài</Badge>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleConfirmSingle(item.councilId)}
                                                disabled={confirmMutation.isPending}
                                            >
                                                {item.agreeButton.label || 'Đồng ý'}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Đóng</Button>
                    </DialogClose>
                    <Button onClick={handleConfirmSelected} disabled={confirmMutation.isPending || selectedCouncilIds.length === 0}>
                        {confirmMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Đang xác nhận...
                            </>
                        ) : (
                            `Đồng ý (${selectedCouncilIds.length})`
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
    const [isEditCouncilDialogOpen, setIsEditCouncilDialogOpen] = useState(false);
    const [editingCouncilId, setEditingCouncilId] = useState<string | null>(null);
    const [detailCouncilId, setDetailCouncilId] = useState<string | null>(null);
    const [editCouncilName, setEditCouncilName] = useState('');
    const [editCouncilDescription, setEditCouncilDescription] = useState('');
    const [editSelectedMembers, setEditSelectedMembers] = useState<Array<{ councilMemberId: string; role: string }>>([]);
    const [editSearchMember, setEditSearchMember] = useState('');

    // Fetch call rounds của khoa
    const { data: callRoundsData, isLoading: loadingCallRounds } = useCallRounds();
    const callRounds = callRoundsData ?? [];
    const approvedCallRounds = callRounds.filter((callRound) => callRound.approvalStatus === 'APPROVED');

    // Fetch council members của call round đã chọn (with server-side pagination)
    const { data: councilData, isLoading: loadingCouncil } = useCouncilMembers(
        selectedCallRoundId,
        currentPage,
        itemsPerPage,
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
    const updateCouncilMutation = useUpdateCouncil();
    const deleteCouncilMutation = useDeleteCouncil(selectedCallRoundId);

    // Lọc giảng viên chưa có trong hội đồng
    const councilMemberIds = councilMembers.map((m) => m.councilMember.id);
    const availableLecturers = allLecturers.filter((l) => !councilMemberIds.includes(l.id));
    const filteredLecturers = availableLecturers.filter(
        (l) =>
            l.name.toLowerCase().includes(searchLecturer.toLowerCase()) ||
            (l.email && l.email.toLowerCase().includes(searchLecturer.toLowerCase())),
    );

    const handleAssignMembers = () => {
        if (!selectedCallRoundId || selectedLecturers.length === 0) return;

        // Assign từng lecturer
        selectedLecturers.forEach((lecturerId) => {
            assignMutation.mutate(
                { callRoundId: selectedCallRoundId, councilMemberId: lecturerId },
                {
                    onSuccess: () => {
                        toast.success('Đã thêm thành viên hội đồng thành công');
                    },
                    onError: () => {
                        toast.error('Lỗi khi thêm thành viên hội đồng');
                    },
                },
            );
        });

        setSelectedLecturers([]);
        setIsAddDialogOpen(false);
    };

    const handleRemoveMember = (memberId: string) => {
        if (!selectedCallRoundId) return;

        const confirmed = window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi danh sách hội đồng?');
        if (!confirmed) {
            return;
        }

        removeMutation.mutate(
            { callRoundId: selectedCallRoundId, councilMemberId: memberId },
            {
                onSuccess: () => {
                    // If removing the last row on a non-first page, move back one page
                    if (currentPage > 1 && councilMembers.length === 1) {
                        setCurrentPage((prev) => Math.max(1, prev - 1));
                    }
                    toast.success('Đã xóa thành viên khỏi hội đồng');
                },
                onError: () => {
                    toast.error('Lỗi khi xóa thành viên hội đồng');
                },
            },
        );
    };

    useEffect(() => {
        // Guard against stale page index after data changes (delete/filter)
        if (pagination && pagination.totalPages > 0 && currentPage > pagination.totalPages) {
            setCurrentPage(pagination.totalPages);
        }
    }, [pagination, currentPage]);

    useEffect(() => {
        if (!selectedCallRoundId) {
            return;
        }

        const isSelectedRoundApproved = approvedCallRounds.some((callRound) => callRound.id === selectedCallRoundId);
        if (!isSelectedRoundApproved) {
            setSelectedCallRoundId('');
            setCurrentPage(1);
        }
    }, [approvedCallRounds, selectedCallRoundId]);

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
            },
        );
    };

    const handleOpenEditCouncil = (council: CouncilWithRelations) => {
        setEditingCouncilId(council.id);
        setEditCouncilName(council.name);
        setEditCouncilDescription(council.description || '');
        setEditSelectedMembers(
            council.members.map((member) => ({
                councilMemberId: member.councilMemberId,
                role: member.role || 'Ủy viên',
            })),
        );
        setEditSearchMember('');
        setIsEditCouncilDialogOpen(true);
    };

    const handleSaveCouncilEdit = () => {
        if (!editingCouncilId) {
            return;
        }

        if (!editCouncilName.trim()) {
            toast.error('Vui lòng nhập tên hội đồng');
            return;
        }

        if (editSelectedMembers.length < 3) {
            toast.error('Vui lòng chọn đủ 3 thành viên');
            return;
        }

        updateCouncilMutation.mutate(
            {
                councilId: editingCouncilId,
                payload: {
                    name: editCouncilName.trim(),
                    description: editCouncilDescription.trim() || undefined,
                    members: editSelectedMembers,
                },
            },
            {
                onSuccess: () => {
                    toast.success('Đã cập nhật hội đồng thành công');
                    setIsEditCouncilDialogOpen(false);
                    setEditingCouncilId(null);
                    setEditCouncilName('');
                    setEditCouncilDescription('');
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.error || 'Lỗi khi cập nhật hội đồng');
                },
            },
        );
    };

    const handleDeleteCouncil = (council: CouncilWithRelations) => {
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn xóa ${council.name}?\nTất cả phân công thành viên và đề tài trong hội đồng này sẽ bị xóa.`,
        );

        if (!confirmed) {
            return;
        }

        deleteCouncilMutation.mutate(council.id, {
            onSuccess: () => {
                toast.success('Đã xóa hội đồng thành công');
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error || 'Lỗi khi xóa hội đồng');
            },
        });
    };

    const roleOptions = ['Chủ tịch', 'Thư ký', 'Ủy viên'];

    const handleAddEditMember = (memberId: string) => {
        if (editSelectedMembers.length >= 3) {
            toast.error('Hội đồng tối đa 3 thành viên');
            return;
        }

        const roleIndex = editSelectedMembers.length;
        setEditSelectedMembers((prev) => [
            ...prev,
            {
                councilMemberId: memberId,
                role: roleOptions[roleIndex],
            },
        ]);
    };

    const handleRemoveEditMember = (memberId: string) => {
        setEditSelectedMembers((prev) => prev.filter((member) => member.councilMemberId !== memberId));
    };

    const handleUpdateEditMemberRole = (memberId: string, role: string) => {
        setEditSelectedMembers((prev) =>
            prev.map((member) => (member.councilMemberId === memberId ? { ...member, role } : member)),
        );
    };

    const editingCouncil = councils?.find((council) => council.id === editingCouncilId);
    const occupiedMemberIdsInOtherCouncils = new Set(
        (councils ?? [])
            .filter((council) => council.id !== editingCouncilId)
            .flatMap((council) => council.members.map((member) => member.councilMemberId)),
    );
    const editAvailableMembers = councilMembers
        .filter((member) => !occupiedMemberIdsInOtherCouncils.has(member.councilMember.id))
        .filter((member) => !editSelectedMembers.some((selected) => selected.councilMemberId === member.councilMember.id))
        .filter(
            (member) =>
                member.councilMember.name.toLowerCase().includes(editSearchMember.toLowerCase()) ||
                member.councilMember.email.toLowerCase().includes(editSearchMember.toLowerCase()),
        );

    const getEditMemberInfo = (memberId: string) => {
        const fromCouncilMembers = councilMembers.find((member) => member.councilMember.id === memberId)?.councilMember;
        if (fromCouncilMembers) {
            return fromCouncilMembers;
        }

        const fromCurrentCouncil = editingCouncil?.members.find((member) => member.councilMemberId === memberId)?.councilMember;
        return fromCurrentCouncil;
    };

    const toggleLecturerSelection = (lecturerId: string) => {
        setSelectedLecturers((prev) =>
            prev.includes(lecturerId) ? prev.filter((id) => id !== lecturerId) : [...prev, lecturerId],
        );
    };

    const selectedCallRound = approvedCallRounds.find((cr: { id: string }) => cr.id === selectedCallRoundId);
    const detailCouncil = councils?.find((council) => council.id === detailCouncilId) ?? null;

 
    const handleCallRoundChange = (value: string) => {
        setSelectedCallRoundId(value);
        setCurrentPage(1);
    };

    const formatDate = (value?: Date | string | null) => {
        if (!value) {
            return 'Chưa cập nhật';
        }

        return new Date(value).toLocaleDateString('vi-VN');
    };

    return (
        <div className="space-y-6 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Chọn Đợt Đăng Ký
                    </CardTitle>
                    <CardDescription>Chọn đợt đăng ký để quản lý thành viên hội đồng đánh giá</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingCallRounds ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select value={selectedCallRoundId} onValueChange={handleCallRoundChange}>
                            <SelectTrigger className="w-full md:w-100">
                                <SelectValue placeholder="Chọn đợt đăng ký..." />
                            </SelectTrigger>
                            <SelectContent>
                                {approvedCallRounds.map((cr: { id: string; name: string; isActive: boolean }) => (
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
                    {!loadingCallRounds && approvedCallRounds.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Chưa có đợt đề tài nào ở trạng thái APPROVED để quản lý hội đồng.
                        </p>
                    )}
                </CardContent>
            </Card>

            {selectedCallRoundId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Thống kê Tổng quan
                        </CardTitle>
                        <CardDescription>Thông tin về đề tài và sinh viên đăng ký trong đợt này</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStats ? (
                            <div className="grid gap-4 md:grid-cols-4">
                                {[1, 2, 3, 4].map((i) => (
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

                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                Trạng thái đơn đăng ký
                                            </CardTitle>
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
                                                <Badge variant="secondary">
                                                    {stats.instructorStatusBreakdown.pending}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã chấp nhận:</span>
                                                <Badge variant="default">
                                                    {stats.instructorStatusBreakdown.accepted}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ chối:</span>
                                                <Badge variant="destructive">
                                                    {stats.instructorStatusBreakdown.rejected}
                                                </Badge>
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
                                                <Badge variant="secondary">
                                                    {stats.facultyStatusBreakdown.pending}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đã duyệt:</span>
                                                <Badge variant="default">{stats.facultyStatusBreakdown.approved}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ chối:</span>
                                                <Badge variant="destructive">
                                                    {stats.facultyStatusBreakdown.rejected}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            )}

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
                                                onChange={(e) =>
                                                    setExternalMemberForm((prev) => ({ ...prev, name: e.target.value }))
                                                }
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
                                                onChange={(e) =>
                                                    setExternalMemberForm((prev) => ({
                                                        ...prev,
                                                        email: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Số điện thoại</label>
                                            <Input
                                                placeholder="Nhập số điện thoại..."
                                                value={externalMemberForm.phone}
                                                onChange={(e) =>
                                                    setExternalMemberForm((prev) => ({
                                                        ...prev,
                                                        phone: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Đơn vị công tác</label>
                                            <Input
                                                placeholder="Nhập đơn vị công tác..."
                                                value={externalMemberForm.organization}
                                                onChange={(e) =>
                                                    setExternalMemberForm((prev) => ({
                                                        ...prev,
                                                        organization: e.target.value,
                                                    }))
                                                }
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
                                            {createExternalMutation.isPending
                                                ? 'Đang tạo...'
                                                : 'Tạo và thêm vào hội đồng'}
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
                                        <ScrollArea className="h-75 rounded-md border p-2">
                                            {loadingLecturers ? (
                                                <div className="space-y-2">
                                                    {[1, 2, 3].map((i) => (
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
                                                                onCheckedChange={() =>
                                                                    toggleLecturerSelection(lecturer.id)
                                                                }
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{lecturer.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {lecturer.email}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Ngành:{' '}
                                                                    {lecturer.major?.name ||
                                                                        lecturer.major?.code ||
                                                                        'Chưa cập nhật'}
                                                                </p>
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
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : councilMembers.length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-lg">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Chưa có thành viên nào trong hội đồng</p>
                                <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm thành viên" để bắt đầu</p>
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
                                                <TableCell className="font-medium">
                                                    {member.councilMember.name}
                                                </TableCell>
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
                                            Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{' '}
                                            {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng
                                            số {pagination.total} thành viên
                                        </p>
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                        className={
                                                            currentPage === 1
                                                                ? 'pointer-events-none opacity-50'
                                                                : 'cursor-pointer'
                                                        }
                                                    />
                                                </PaginationItem>

                                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                                                    (page) => (
                                                        <PaginationItem key={page}>
                                                            <PaginationLink
                                                                onClick={() => setCurrentPage(page)}
                                                                isActive={currentPage === page}
                                                                className="cursor-pointer"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    ),
                                                )}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() =>
                                                            setCurrentPage((p) =>
                                                                Math.min(pagination.totalPages, p + 1),
                                                            )
                                                        }
                                                        className={
                                                            currentPage === pagination.totalPages
                                                                ? 'pointer-events-none opacity-50'
                                                                : 'cursor-pointer'
                                                        }
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
                            <CardDescription>Các hội đồng đã được phân công thành viên và đề tài</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <QuickAddCouncilsDialog callRoundId={selectedCallRoundId} />
                            <CreateCouncilDialog
                                callRoundId={selectedCallRoundId}
                                councilMembers={councilMembers}
                                councils={councils ?? []}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingCouncils ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : !councils || councils.length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-lg">
                                <Split className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Chưa có hội đồng nào được tạo</p>
                                <p className="text-sm text-muted-foreground mt-1">Nhấn "Tạo hội đồng" để bắt đầu</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Tên hội đồng</TableHead>
                                        <TableHead>Thành viên</TableHead>
                                        <TableHead>Đề tài được phân công</TableHead>
                                        <TableHead className="w-30 text-center">SL thành viên</TableHead>
                                        <TableHead className="w-30 text-center">SL đề tài</TableHead>
                                        <TableHead className="w-35 text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {councils.map((council, index) => (
                                        <TableRow key={council.id}>
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell>
                                                <p className="font-medium">{council.name}</p>
                                                {council.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {council.description}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {council.members.map((member) => (
                                                        <div key={member.id} className="text-sm">
                                                            <span className="font-medium">
                                                                {member.role || 'Ủy viên'}:
                                                            </span>{' '}
                                                            {member.councilMember.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {council.projects.length === 0 ? (
                                                        <span className="text-sm text-muted-foreground">
                                                            Chưa phân công đề tài
                                                        </span>
                                                    ) : (
                                                        council.projects.map((project) => (
                                                            <div key={project.id} className="text-sm">
                                                                {project.projectRegistration.title}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{council._count.members}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge>{council._count.projects}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDetailCouncilId(council.id)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Chi tiết
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEditCouncil(council)}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" />
                                                        Sửa
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteCouncil(council)}
                                                        disabled={deleteCouncilMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Xóa
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            <Dialog open={Boolean(detailCouncil)} onOpenChange={(open) => !open && setDetailCouncilId(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    {detailCouncil && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{detailCouncil.name}</DialogTitle>
                                <DialogDescription>
                                    {(detailCouncil.callRoundName as string | undefined) || selectedCallRound?.name}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Ngày bảo vệ</p>
                                        <p className="font-medium mt-1">
                                            {formatDate(detailCouncil.defenseDate as Date | string | null | undefined)}
                                        </p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Nơi bảo vệ</p>
                                        <p className="font-medium mt-1">{detailCouncil.defenseLocation || 'Chưa cập nhật'}</p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Số thành viên</p>
                                        <p className="font-medium mt-1">{detailCouncil._count.members}</p>
                                    </div>
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Số đề tài</p>
                                        <p className="font-medium mt-1">{detailCouncil._count.projects}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-semibold">Thành viên hội đồng</h3>
                                    {detailCouncil.members.length === 0 ? (
                                        <p className="text-muted-foreground">Chưa có dữ liệu thành viên hội đồng.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {detailCouncil.members.map((member) => (
                                                <div key={member.id} className="rounded-md border p-3 flex flex-wrap items-center gap-2">
                                                    <Badge variant="secondary">{member.role || 'Ủy viên'}</Badge>
                                                    <span className="font-medium">{member.councilMember.name}</span>
                                                    <span className="text-muted-foreground">{member.councilMember.code || '-'}</span>
                                                    <span className="text-muted-foreground">{member.councilMember.email || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold">Đề tài và thành viên thực hiện</h3>
                                    {detailCouncil.projects.length === 0 ? (
                                        <p className="text-muted-foreground">Hội đồng này chưa được phân công đề tài.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {detailCouncil.projects.map((project, index) => (
                                                <div key={project.id} className="rounded-md border p-3 space-y-2">
                                                    <p className="font-medium">{index + 1}. {project.projectRegistration.title}</p>
                                                    <div className="rounded-md bg-muted/30 p-2 text-sm">
                                                        <p className="text-xs text-muted-foreground mb-1">Giảng viên hướng dẫn:</p>
                                                        {project.projectRegistration.instructor ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium">
                                                                    {project.projectRegistration.instructor.name}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    {project.projectRegistration.instructor.code || '-'}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    {project.projectRegistration.instructor.email || '-'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground">Chưa cập nhật</p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-md bg-muted/40 p-2">
                                                        <p className="text-xs text-muted-foreground mb-2">Sinh viên thuộc đề tài:</p>
                                                        {project.projectRegistration.students &&
                                                        project.projectRegistration.students.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {project.projectRegistration.students.map((student) => (
                                                                    <div
                                                                        key={student.id}
                                                                        className="text-sm flex flex-wrap items-center gap-2"
                                                                    >
                                                                        <Badge variant="secondary">{student.roleLabel}</Badge>
                                                                        <span className="font-medium">{student.name}</span>
                                                                        <span className="text-muted-foreground">
                                                                            {student.code || '-'}
                                                                        </span>
                                                                        <span className="text-muted-foreground">
                                                                            {student.email || '-'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground">Chưa có dữ liệu sinh viên.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isEditCouncilDialogOpen} onOpenChange={setIsEditCouncilDialogOpen}>
                <DialogContent className="max-w-2xl sm:max-w-1/2">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa hội đồng</DialogTitle>
                        <DialogDescription>Cập nhật tên, mô tả và thành viên hội đồng</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>
                                Tên hội đồng <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={editCouncilName}
                                onChange={(e) => setEditCouncilName(e.target.value)}
                                placeholder="Nhập tên hội đồng"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mô tả</Label>
                            <Input
                                value={editCouncilDescription}
                                onChange={(e) => setEditCouncilDescription(e.target.value)}
                                placeholder="Nhập mô tả (tùy chọn)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Thành viên đã chọn ({editSelectedMembers.length}/3){' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            {editSelectedMembers.length === 0 ? (
                                <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
                                    Chưa chọn thành viên nào
                                </div>
                            ) : (
                                <div className="space-y-2 border rounded-md p-2">
                                    {editSelectedMembers.map((member) => {
                                        const memberInfo = getEditMemberInfo(member.councilMemberId);
                                        return (
                                            <div
                                                key={member.councilMemberId}
                                                className="flex items-center gap-2 p-2 bg-muted rounded-md"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{memberInfo?.name || 'Không xác định'}</p>
                                                    <p className="text-xs text-muted-foreground">{memberInfo?.email || '-'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Ngành:{' '}
                                                        {memberInfo && 'major' in memberInfo
                                                            ? memberInfo.major?.name || memberInfo.major?.code || 'Chưa cập nhật'
                                                            : 'Chưa cập nhật'}
                                                    </p>
                                                </div>
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(role) =>
                                                        handleUpdateEditMemberRole(member.councilMemberId, role)
                                                    }
                                                >
                                                    <SelectTrigger className="w-32.5">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roleOptions.map((role) => (
                                                            <SelectItem key={role} value={role}>
                                                                {role}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveEditMember(member.councilMemberId)}
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {editSelectedMembers.length < 3 && (
                            <div className="space-y-2">
                                <Label>Chọn thêm thành viên</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Tìm kiếm thành viên..."
                                        value={editSearchMember}
                                        onChange={(e) => setEditSearchMember(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <ScrollArea className="h-50 border rounded-md p-2">
                                    {editAvailableMembers.length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground py-4">
                                            Không còn thành viên khả dụng để thêm
                                        </p>
                                    ) : (
                                        <div className="space-y-1">
                                            {editAvailableMembers.map((member) => (
                                                <div
                                                    key={member.councilMember.id}
                                                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                                                    onClick={() => handleAddEditMember(member.councilMember.id)}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{member.councilMember.name}</p>
                                                        <p className="text-xs text-muted-foreground">{member.councilMember.email}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Ngành:{' '}
                                                            {member.councilMember.major?.name ||
                                                                member.councilMember.major?.code ||
                                                                'Chưa cập nhật'}
                                                        </p>
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
                        <Button onClick={handleSaveCouncilEdit} disabled={updateCouncilMutation.isPending}>
                            {updateCouncilMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
