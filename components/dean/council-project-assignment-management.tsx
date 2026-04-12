'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Link2, Search, Trash2 } from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import {
    useAssignProjectsToCouncil,
    useCouncilProjectAssignments,
    useFinalizeCouncilProjectAssignments,
    useUnassignProjectsFromCouncil,
    useUpdateCouncilDefenseLocation,
} from '@/hooks/useCouncilProjectAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function CouncilProjectAssignmentManagement() {
    const [selectedCallRoundId, setSelectedCallRoundId] = useState('');
    const [selectedCouncilId, setSelectedCouncilId] = useState('');
    const [search, setSearch] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [selectedAssignedProjectIds, setSelectedAssignedProjectIds] = useState<string[]>([]);
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [defenseLocationInput, setDefenseLocationInput] = useState('');

    const { data: callRounds = [], isLoading: loadingCallRounds } = useCallRounds();
    const approvedCallRounds = useMemo(
        () => callRounds.filter((callRound) => callRound.approvalStatus === 'APPROVED'),
        [callRounds],
    );
    const { data, isLoading } = useCouncilProjectAssignments(selectedCallRoundId);
    const assignMutation = useAssignProjectsToCouncil();
    const unassignMutation = useUnassignProjectsFromCouncil();
    const finalizeMutation = useFinalizeCouncilProjectAssignments();
    const updateDefenseLocationMutation = useUpdateCouncilDefenseLocation();

    const councils = data?.councils ?? [];
    const approvedProjects = data?.approvedProjects ?? [];
    const isFinalized = data?.isFinalized ?? false;

    const unassignedProjects = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return approvedProjects
            .filter((project) => !project.councilAssignment)
            .filter((project) => {
                if (!keyword) return true;
                return (
                    project.title.toLowerCase().includes(keyword) ||
                    project.user.name.toLowerCase().includes(keyword) ||
                    (project.user.code || '').toLowerCase().includes(keyword)
                );
            });
    }, [approvedProjects, search]);

    const assignedProjects = useMemo(() => {
        if (!selectedCouncilId) return [];
        return approvedProjects.filter((project) => project.councilAssignment?.councilId === selectedCouncilId);
    }, [approvedProjects, selectedCouncilId]);

    const selectedCouncil = councils.find((council) => council.id === selectedCouncilId);

    useEffect(() => {
        if (!selectedCallRoundId) {
            return;
        }

        const isSelectedRoundApproved = approvedCallRounds.some((callRound) => callRound.id === selectedCallRoundId);
        if (!isSelectedRoundApproved) {
            setSelectedCallRoundId('');
            setSelectedCouncilId('');
            setSelectedProjectIds([]);
            setSelectedAssignedProjectIds([]);
        }
    }, [approvedCallRounds, selectedCallRoundId]);

    useEffect(() => {
        setDefenseLocationInput(selectedCouncil?.defenseLocation ?? '');
    }, [selectedCouncil?.id, selectedCouncil?.defenseLocation]);

    const handleToggleProject = (projectId: string) => {
        setSelectedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    };

    const handleToggleAssignedProject = (projectId: string) => {
        setSelectedAssignedProjectIds((prev) =>
            prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
        );
    };

    const handleAssign = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }
        if (!selectedCouncilId) {
            toast.error('Vui lòng chọn hội đồng');
            return;
        }
        if (selectedProjectIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 đề tài');
            return;
        }

        if (isFinalized) {
            toast.error('Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.');
            return;
        }

        assignMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                councilId: selectedCouncilId,
                projectRegistrationIds: selectedProjectIds,
            },
            {
                onSuccess: () => {
                    toast.success('Gán đề tài vào hội đồng thành công');
                    setSelectedProjectIds([]);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể gán đề tài';
                    toast.error(message);
                },
            },
        );
    };

    const handleUnassign = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (selectedAssignedProjectIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 đề tài đã gán để bỏ gán');
            return;
        }

        if (isFinalized) {
            toast.error('Đợt này đã hoàn tất phân công. Không thể chỉnh sửa.');
            return;
        }

        const confirmed = window.confirm('Bạn có chắc chắn muốn bỏ gán các đề tài đã chọn?');
        if (!confirmed) {
            return;
        }

        unassignMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                projectRegistrationIds: selectedAssignedProjectIds,
            },
            {
                onSuccess: () => {
                    toast.success('Đã bỏ gán đề tài khỏi hội đồng');
                    setSelectedAssignedProjectIds([]);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể bỏ gán đề tài';
                    toast.error(message);
                },
            },
        );
    };

    const handleFinalizeAll = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        if (isFinalized) {
            toast.success('Đợt này đã hoàn tất phân công.');
            return;
        }

        finalizeMutation.mutate(
            { callRoundId: selectedCallRoundId },
            {
                onSuccess: () => {
                    toast.success('Đã hoàn tất phân công toàn bộ đợt đăng ký');
                    setIsFinalizeDialogOpen(false);
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể hoàn tất phân công';
                    toast.error(message);
                },
            },
        );
    };

    const handleSaveDefenseLocation = () => {
        if (!selectedCallRoundId) {
            toast.error('Vui lòng chọn đợt đăng ký');
            return;
        }

        updateDefenseLocationMutation.mutate(
            {
                callRoundId: selectedCallRoundId,
                defenseLocation: defenseLocationInput,
            },
            {
                onSuccess: () => {
                    toast.success('Đã lưu nơi bảo vệ');
                },
                onError: (error: unknown) => {
                    const message =
                        typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: string }).message)
                            : 'Không thể lưu nơi bảo vệ';
                    toast.error(message);
                },
            },
        );
    };

    return (
        <div className="space-y-6 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Gán Đề Tài Vào Hội Đồng
                    </CardTitle>
                    <CardDescription>
                        Chọn đợt đăng ký, chọn hội đồng và gán các đề tài đã được duyệt vào hội đồng đó.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingCallRounds ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select
                            value={selectedCallRoundId}
                            onValueChange={(value) => {
                                setSelectedCallRoundId(value);
                                setSelectedCouncilId('');
                                setSelectedProjectIds([]);
                                setSelectedAssignedProjectIds([]);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-100">
                                <SelectValue placeholder="Chọn đợt đăng ký" />
                            </SelectTrigger>
                            <SelectContent>
                                {approvedCallRounds.map((round) => (
                                    <SelectItem key={round.id} value={round.id}>
                                        {round.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!loadingCallRounds && approvedCallRounds.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Chưa có đợt đề tài nào ở trạng thái APPROVED để gán đề tài vào hội đồng.
                        </p>
                    )}

                    {selectedCallRoundId && (
                        <Select
                            value={selectedCouncilId}
                            onValueChange={(value) => {
                                setSelectedCouncilId(value);
                                setSelectedProjectIds([]);
                                setSelectedAssignedProjectIds([]);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-100">
                                <SelectValue placeholder="Chọn hội đồng" />
                            </SelectTrigger>
                            <SelectContent>
                                {councils.map((council) => (
                                    <SelectItem key={council.id} value={council.id}>
                                        {council.name} ({council._count.projects} đề tài)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {selectedCallRoundId && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={isFinalized ? 'default' : 'secondary'}>
                                {isFinalized ? 'Đã hoàn tất phân công' : 'Đang xếp ảo (chưa công bố)'}
                            </Badge>
                            <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        disabled={finalizeMutation.isPending || isLoading || isFinalized}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        {finalizeMutation.isPending ? 'Đang xác nhận...' : 'Hoàn tất xác nhận tất cả'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Hoàn tất xác nhận tất cả?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Sau khi xác nhận, hội đồng, giảng viên và thành viên mới nhìn thấy dữ liệu.
                                            Bạn sẽ không thể chỉnh sửa phân công của đợt này.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={finalizeMutation.isPending}>Hủy</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleFinalizeAll}
                                            disabled={finalizeMutation.isPending}
                                        >
                                            {finalizeMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}

                    {selectedCouncilId && selectedCouncil && (
                        <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                            <p className="text-xs text-muted-foreground">Nơi bảo vệ</p>
                            <div className="flex flex-col md:flex-row gap-2">
                                <Input
                                    value={defenseLocationInput}
                                    onChange={(event) => setDefenseLocationInput(event.target.value)}
                                    placeholder="Nhập nơi bảo vệ..."
                                    disabled={updateDefenseLocationMutation.isPending}
                                />
                                <Button
                                    type="button"
                                    onClick={handleSaveDefenseLocation}
                                    disabled={updateDefenseLocationMutation.isPending}
                                >
                                    {updateDefenseLocationMutation.isPending ? 'Đang lưu...' : 'Lưu nơi bảo vệ'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Thông tin này áp dụng cho các hội đồng trong đợt đăng ký đã chọn.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedCallRoundId && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Đề tài chưa gán hội đồng</CardTitle>
                            <CardDescription>
                                Chọn các đề tài để gán vào hội đồng đã chọn.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm theo tên đề tài, sinh viên..."
                                    className="pl-10"
                                />
                            </div>

                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : unassignedProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6 border rounded-md border-dashed">
                                    Không còn đề tài chưa gán.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-100 overflow-y-auto pr-1">
                                    {unassignedProjects.map((project) => (
                                        <label
                                            key={project.id}
                                            className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                                        >
                                            <Checkbox
                                                checked={selectedProjectIds.includes(project.id)}
                                                onCheckedChange={() => handleToggleProject(project.id)}
                                                disabled={isFinalized}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="font-medium text-sm">{project.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    SV: {project.user.name} ({project.user.code || 'N/A'})
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Đã chọn {selectedProjectIds.length} đề tài</p>
                                <Button
                                    onClick={handleAssign}
                                    disabled={
                                        assignMutation.isPending ||
                                        !selectedCouncilId ||
                                        selectedProjectIds.length === 0 ||
                                        isFinalized
                                    }
                                >
                                    {assignMutation.isPending ? 'Đang gán...' : 'Gán vào hội đồng'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Đề tài của hội đồng đã chọn</CardTitle>
                            <CardDescription>
                                {selectedCouncil
                                    ? `${selectedCouncil.name} hiện có ${selectedCouncil._count.projects} đề tài`
                                    : 'Chọn hội đồng để xem danh sách đề tài đã gán'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!selectedCouncilId ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                                    Chưa chọn hội đồng.
                                </p>
                            ) : assignedProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                                    Hội đồng này chưa có đề tài nào.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Tên đề tài</TableHead>
                                            <TableHead>Sinh viên</TableHead>
                                            <TableHead className="text-right">Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedProjects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedAssignedProjectIds.includes(project.id)}
                                                        onCheckedChange={() => handleToggleAssignedProject(project.id)}
                                                        disabled={isFinalized}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{project.title}</TableCell>
                                                <TableCell>{project.user.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="default">Đã gán</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {!!selectedCouncilId && assignedProjects.length > 0 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Đã chọn {selectedAssignedProjectIds.length} đề tài để bỏ gán
                                    </p>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleUnassign}
                                        disabled={
                                            unassignMutation.isPending ||
                                            selectedAssignedProjectIds.length === 0 ||
                                            isFinalized
                                        }
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {unassignMutation.isPending ? 'Đang bỏ gán...' : 'Bỏ gán đề tài đã chọn'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
