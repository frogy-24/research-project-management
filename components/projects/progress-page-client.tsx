'use client';

import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useAuthSession } from '@/hooks/useAuth';
import { ProgressReportPanel } from '@/components/projects/progress-report-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ProgressPageClient({ filterType }: { filterType?: 'LEADER' | 'INSTRUCTOR' }) {
    const { data: session } = useAuthSession();
    const { data: projects = [], isLoading } = useProjects();
    const [selectedProjectId, setSelectedProjectId] = useState('');

    if (isLoading) return <p className="animate-pulse text-muted-foreground p-4">Đang tải...</p>;

    const filteredProjects = projects.filter((p) => {
        if (!filterType || !session) return true;
        if (filterType === 'LEADER') return p.leaderId === session.userId;
        if (filterType === 'INSTRUCTOR') return p.instructorId === session.userId;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="space-y-2 max-w-md">
                <Label>Chọn đề tài</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                        <SelectValue
                            placeholder={
                                filteredProjects.length === 0 ? 'Không có đề tài nào' : '-- Vui lòng chọn đề tài --'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedProjectId ? (
                <ProgressReportPanel projectId={selectedProjectId} />
            ) : (
                <div className="p-8 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground opacity-50">
                    {filteredProjects.length === 0
                        ? 'Không có đề tài nào trong danh sách.'
                        : 'Vui lòng chọn đề tài để tải thông tin báo cáo.'}
                </div>
            )}
        </div>
    );
}
