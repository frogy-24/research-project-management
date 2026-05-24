'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ProgressReportChart({ data }: { data: { byWeek: Array<{ week: number; count: number }>; avgScore: number; overdueTotal: number; total: number } }) {
  const chartData = data.byWeek.slice(0, 20);

  const summaryData = [
    { name: 'Tổng báo cáo', value: data.total },
    { name: 'Điểm TB', value: data.avgScore || 0 },
    { name: 'Quá hạn', value: data.overdueTotal },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Báo cáo tiến độ theo tuần</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{data.total}</p>
            <p className="text-xs text-muted-foreground">Tổng báo cáo</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">{data.avgScore ? data.avgScore.toFixed(1) : 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Điểm trung bình</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{data.overdueTotal}</p>
            <p className="text-xs text-muted-foreground">Báo cáo quá hạn</p>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: 'Tuần', position: 'insideBottom', offset: -5 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${Number(value ?? 0)} báo cáo`} />
              <Legend />
              <Bar dataKey="count" name="Số báo cáo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Chưa có dữ liệu báo cáo theo tuần</p>
        )}
      </CardContent>
    </Card>
  );
}
