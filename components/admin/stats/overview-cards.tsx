'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, FolderKanban, FileText, Building2, BookOpen, School, Activity, UsersRound, CalendarCheck, AlertTriangle } from 'lucide-react';
import type { StatisticsData } from '@/api/admin-statistics';

const iconMap = {
  totalUsers: Users,
  totalProjects: FolderKanban,
  totalRegistrations: FileText,
  totalProgressReports: FileText,
  totalDepartments: Building2,
  totalMajors: BookOpen,
  totalClasses: School,
  totalCallRounds: Activity,
  activeCallRounds: CalendarCheck,
  totalCouncils: UsersRound,
};

const labelMap = {
  totalUsers: 'Tổng người dùng',
  totalProjects: 'Tổng đề tài',
  totalRegistrations: 'Tổng đăng ký',
  totalProgressReports: 'Báo cáo tiến độ',
  totalDepartments: 'Khoa',
  totalMajors: 'Ngành',
  totalClasses: 'Lớp học',
  totalCallRounds: 'Đợt đăng ký',
  activeCallRounds: 'Đợt đang hoạt động',
  totalCouncils: 'Hội đồng',
};

const colorMap = {
  totalUsers: 'text-blue-600',
  totalProjects: 'text-emerald-600',
  totalRegistrations: 'text-violet-600',
  totalProgressReports: 'text-amber-600',
  totalDepartments: 'text-cyan-600',
  totalMajors: 'text-pink-600',
  totalClasses: 'text-indigo-600',
  totalCallRounds: 'text-orange-600',
  activeCallRounds: 'text-green-600',
  totalCouncils: 'text-purple-600',
};

const bgMap = {
  totalUsers: 'bg-blue-50',
  totalProjects: 'bg-emerald-50',
  totalRegistrations: 'bg-violet-50',
  totalProgressReports: 'bg-amber-50',
  totalDepartments: 'bg-cyan-50',
  totalMajors: 'bg-pink-50',
  totalClasses: 'bg-indigo-50',
  totalCallRounds: 'bg-orange-50',
  activeCallRounds: 'bg-green-50',
  totalCouncils: 'bg-purple-50',
};

export function OverviewCards({ data }: { data: StatisticsData['overview'] }) {
  const entries = Object.entries(data) as [keyof StatisticsData['overview'], number][];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {entries.map(([key, value]) => {
        const Icon = iconMap[key] ?? FileText;
        return (
          <Card key={key} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className={`p-2 rounded-lg ${bgMap[key]}`}>
                <Icon className={`h-5 w-5 ${colorMap[key]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{labelMap[key]}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
