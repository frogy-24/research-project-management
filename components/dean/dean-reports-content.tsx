'use client';

import { useState, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, FileSpreadsheet, FileText, DollarSign, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { yearReportApi } from '@/api/year-reports';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { exportYearDisbursementsToExcel, exportYearRegistrationsToExcel } from '@/lib/export-year-report-excel';
import { toast } from 'sonner';

export function DeanReportsContent() {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);
    const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
    const [open, setOpen] = useState(false);
    const [isExportingDisb, setIsExportingDisb] = useState(false);
    const [isExportingReg, setIsExportingReg] = useState(false);

    const handleYearToggle = (year: number) => {
        setSelectedYears((prev) =>
            prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => b - a),
        );
    };

    const handleRemoveYear = (year: number) => {
        setSelectedYears((prev) => prev.filter((y) => y !== year));
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Báo cáo thống kê</h1>
                    <p className="text-muted-foreground mt-2">Thống kê đề tài và giải ngân theo năm</p>
                </div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="min-w-[240px] justify-between">
                            Chọn năm
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0">
                        <Command>
                            <CommandList>
                                <CommandEmpty>Không có kết quả.</CommandEmpty>
                                <CommandGroup>
                                    {yearOptions.map((year) => (
                                        <CommandItem key={year} onSelect={() => handleYearToggle(year)}>
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    selectedYears.includes(year) ? 'opacity-100' : 'opacity-0',
                                                )}
                                            />
                                            {year}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedYears.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Vui lòng chọn ít nhất một năm để xem thống kê
                    </CardContent>
                </Card>
            ) : (
                <YearReportSection
                    years={selectedYears}
                    onRemoveYear={handleRemoveYear}
                    onExportDisbursements={async () => {
                        setIsExportingDisb(true);
                        try {
                            await exportYearDisbursementsToExcel(selectedYears);
                            toast.success('Xuất Excel giải ngân thành công');
                        } catch {
                            toast.error('Lỗi khi xuất Excel');
                        } finally {
                            setIsExportingDisb(false);
                        }
                    }}
                    onExportRegistrations={async () => {
                        setIsExportingReg(true);
                        try {
                            await exportYearRegistrationsToExcel(selectedYears);
                            toast.success('Xuất Excel đăng ký thành công');
                        } catch {
                            toast.error('Lỗi khi xuất Excel');
                        } finally {
                            setIsExportingReg(false);
                        }
                    }}
                    isExportingDisb={isExportingDisb}
                    isExportingReg={isExportingReg}
                />
            )}
        </div>
    );
}

function YearReportSection({
    years,
    onRemoveYear,
    onExportDisbursements,
    onExportRegistrations,
    isExportingDisb,
    isExportingReg,
}: {
    years: number[];
    onRemoveYear: (year: number) => void;
    onExportDisbursements: () => void;
    onExportRegistrations: () => void;
    isExportingDisb: boolean;
    isExportingReg: boolean;
}) {
    const queries = useQueries({
        queries: years.map((year) => ({
            queryKey: ['year-report', year],
            queryFn: () => yearReportApi.getYearDetail(year),
            enabled: !!year,
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const data = queries.map((q) => q.data).filter(Boolean);

    const aggregated = useMemo(() => {
        const totalRegs = data.reduce((sum, d: any) => sum + (d?.totalRegistrations || 0), 0);
        const totalApproved = data.reduce((sum, d: any) => sum + (d?.approvedRegistrations || 0), 0);
        const totalDisbursed = data.reduce((sum, d: any) => sum + (d?.totalDisbursed || 0), 0);
        const totalDisbursements = data.reduce((sum, d: any) => sum + (d?.disbursementCount || 0), 0);
        return { totalRegs, totalApproved, totalDisbursed, totalDisbursements };
    }, [data]);

    const chartData = data
        .map((d: any) => ({
            year: d.year,
            'Đăng ký': d.totalRegistrations || 0,
            'Đã duyệt': d.approvedRegistrations || 0,
        }))
        .sort((a, b) => a.year - b.year);

    const disbursementChartData = data
        .map((d: any) => ({
            year: d.year,
            'Số tiền giải ngân': d.totalDisbursed || 0,
        }))
        .sort((a, b) => a.year - b.year);

    const allRegistrations = data.flatMap((d: any) => d.registrations || []);
    const allDisbursements = data.flatMap((d: any) => d.disbursements || []);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[400px]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {years.map((year) => (
                    <Badge key={year} variant="secondary" className="px-3 py-1">
                        {year}
                        <button onClick={() => onRemoveYear(year)} className="ml-2">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng đăng ký</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregated.totalRegs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregated.totalApproved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng giải ngân</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                                maximumFractionDigits: 0,
                            }).format(aggregated.totalDisbursed)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Số lượt giải ngân</CardTitle>
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aggregated.totalDisbursements}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Biểu đồ đăng ký đề tài</CardTitle>
                    <CardDescription>Số lượng đăng ký theo năm</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Đăng ký" stroke="#2563EB" />
                            <Line type="monotone" dataKey="Đã duyệt" stroke="#10B981" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Danh sách đăng ký</CardTitle>
                        <CardDescription>Tổng: {allRegistrations.length} bản ghi</CardDescription>
                    </div>
                    <Button onClick={onExportRegistrations} disabled={isExportingReg || allRegistrations.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Xuất Excel
                    </Button>
                </CardHeader>
                <CardContent>
                    {allRegistrations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Không có dữ liệu</p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Năm</th>
                                            <th className="px-4 py-3 text-left font-medium">Tên đề tài</th>
                                            <th className="px-4 py-3 text-left font-medium">Chủ nhiệm</th>
                                            <th className="px-4 py-3 text-center font-medium">Trạng thái</th>
                                            <th className="px-4 py-3 text-center font-medium">Kết quả</th>
                                            <th className="px-4 py-3 text-right font-medium">Kinh phí</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allRegistrations.map((r: any, idx: number) => (
                                            <tr key={`${r.year}-${r.id}-${idx}`} className="hover:bg-muted/50">
                                                <td className="px-4 py-3">{r.year}</td>
                                                <td className="px-4 py-3 max-w-md truncate font-medium">{r.title}</td>
                                                <td className="px-4 py-3">{r.ownerName || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline">{r.status || '—'}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {r.result ? (
                                                        <Badge>{r.result}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {r.budget ? new Intl.NumberFormat('vi-VN').format(r.budget) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Biểu đồ giải ngân</CardTitle>
                    <CardDescription>Tổng số tiền giải ngân theo năm</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={disbursementChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                            <Tooltip formatter={(v) => new Intl.NumberFormat('vi-VN').format(Number(v ?? 0))} />
                            <Legend />
                            <Bar dataKey="Số tiền giải ngân" fill="#2563EB" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Danh sách giải ngân</CardTitle>
                        <CardDescription>Tổng: {allDisbursements.length} bản ghi</CardDescription>
                    </div>
                    <Button onClick={onExportDisbursements} disabled={isExportingDisb || allDisbursements.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Xuất Excel
                    </Button>
                </CardHeader>
                <CardContent>
                    {allDisbursements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Không có dữ liệu</p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Năm</th>
                                            <th className="px-4 py-3 text-left font-medium">Đề tài</th>
                                            <th className="px-4 py-3 text-left font-medium">Đợt</th>
                                            <th className="px-4 py-3 text-right font-medium">Số tiền</th>
                                            <th className="px-4 py-3 text-center font-medium">Trạng thái</th>
                                            <th className="px-4 py-3 text-center font-medium">Ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allDisbursements.map((d: any, idx: number) => (
                                            <tr key={`${d.year}-${d.id}-${idx}`} className="hover:bg-muted/50">
                                                <td className="px-4 py-3">{d.year}</td>
                                                <td className="px-4 py-3 max-w-md truncate font-medium">
                                                    {d.projectTitle || '—'}
                                                </td>
                                                <td className="px-4 py-3">{d.callRoundName || '—'}</td>
                                                <td className="px-4 py-3 text-right font-medium">
                                                    {new Intl.NumberFormat('vi-VN').format(d.amount || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline">{d.status || '—'}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {d.date ? new Date(d.date).toLocaleDateString('vi-VN') : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
