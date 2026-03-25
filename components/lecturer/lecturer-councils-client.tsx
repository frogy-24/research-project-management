'use client';

import { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { useLecturerCouncils } from '@/hooks/useLecturerCouncils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function LecturerCouncilsClient() {
    const { data = [], isLoading } = useLecturerCouncils();
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

    const selectedItem = useMemo(
        () => data.find((item) => item.assignmentId === selectedAssignmentId) ?? null,
        [data, selectedAssignmentId],
    );

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
                        Thành viên hội đồng
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Hiện tại bạn chưa thuộc hội đồng nào.</p>
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
                        Hội đồng của tôi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>STT</TableHead>
                                    <TableHead>Tên hội đồng</TableHead>
                                    <TableHead>Đợt đề tài</TableHead>
                                    <TableHead>Vai trò</TableHead>
                                    <TableHead>Số thành viên</TableHead>
                                    <TableHead>Số đề tài</TableHead>
                                    <TableHead>Ngày tham gia</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => (
                                    <TableRow key={item.assignmentId}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-medium">{item.council.name}</p>
                                                {item.council.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {item.council.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.council.callRoundName}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{item.role || 'Thành viên'}</Badge>
                                        </TableCell>
                                        <TableCell>{item.council.memberCount}</TableCell>
                                        <TableCell>{item.council.projectCount}</TableCell>
                                        <TableCell>{new Date(item.joinedAt).toLocaleDateString('vi-VN')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedAssignmentId(item.assignmentId)}
                                            >
                                                Hiển thị chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="rounded-md border p-3">
                                        <p className="text-muted-foreground">Vai trò</p>
                                        <p className="font-medium mt-1">{selectedItem.role || 'Thành viên'}</p>
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
                                        <p className="text-muted-foreground">Số đề tài</p>
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
                                                <div key={member.id} className="rounded-md border p-3 text-sm flex flex-wrap items-center gap-2">
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
                                    <h3 className="font-semibold">Danh sách đề tài và sinh viên</h3>
                                    {selectedItem.council.projects.length === 0 ? (
                                        <p className="text-muted-foreground">Hội đồng này chưa được gán đề tài.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedItem.council.projects.map((project, projectIndex) => (
                                                <div key={project.id} className="rounded-md border p-3 space-y-2">
                                                    <p className="font-medium">
                                                        {projectIndex + 1}. {project.title}
                                                    </p>
                                                    <div className="rounded-md bg-muted/30 p-2 text-sm">
                                                        <p className="text-xs text-muted-foreground mb-1">Giảng viên hướng dẫn:</p>
                                                        {project.advisor ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium">{project.advisor.name}</span>
                                                                <span className="text-muted-foreground">{project.advisor.code || '-'}</span>
                                                                <span className="text-muted-foreground">{project.advisor.email || '-'}</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground">Chưa cập nhật</p>
                                                        )}
                                                    </div>
                                                    <div className="rounded-md bg-muted/40 p-2">
                                                        <p className="text-xs text-muted-foreground mb-2">Sinh viên thuộc đề tài:</p>
                                                        {project.students.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">Chưa có dữ liệu sinh viên.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {project.students.map((student) => (
                                                                    <div key={student.id} className="text-sm flex flex-wrap items-center gap-2">
                                                                        <Badge variant="secondary">{student.roleLabel}</Badge>
                                                                        <span className="font-medium">{student.name}</span>
                                                                        <span className="text-muted-foreground">{student.code || '-'}</span>
                                                                        <span className="text-muted-foreground">{student.email || '-'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
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
        </>
    );
}
