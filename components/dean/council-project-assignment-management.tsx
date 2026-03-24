'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Search } from 'lucide-react';
import { useCallRounds } from '@/hooks/useCallRounds';
import {
    useAssignProjectsToCouncil,
    useCouncilProjectAssignments,
} from '@/hooks/useCouncilProjectAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CouncilProjectAssignmentManagement() {
    const [selectedCallRoundId, setSelectedCallRoundId] = useState('');
    const [selectedCouncilId, setSelectedCouncilId] = useState('');
    const [search, setSearch] = useState('');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

    const { data: callRounds = [], isLoading: loadingCallRounds } = useCallRounds();
    const approvedCallRounds = useMemo(
        () => callRounds.filter((callRound) => callRound.approvalStatus === 'APPROVED'),
        [callRounds],
    );
    const { data, isLoading } = useCouncilProjectAssignments(selectedCallRoundId);
    const assignMutation = useAssignProjectsToCouncil();

    const councils = data?.councils ?? [];
    const approvedProjects = data?.approvedProjects ?? [];

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
        }
    }, [approvedCallRounds, selectedCallRoundId]);

    const handleToggleProject = (projectId: string) => {
        setSelectedProjectIds((prev) =>
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
                                    disabled={assignMutation.isPending || !selectedCouncilId || selectedProjectIds.length === 0}
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
                                            <TableHead>Tên đề tài</TableHead>
                                            <TableHead>Sinh viên</TableHead>
                                            <TableHead className="text-right">Trạng thái</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedProjects.map((project) => (
                                            <TableRow key={project.id}>
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
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
