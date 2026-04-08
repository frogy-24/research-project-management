'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BudgetChart({ data }: { data: { totalRequested: number; totalApproved: number; avgRequested: number; avgApproved: number } }) {
  const chartData = [
    { name: 'Tổng đề xuất', value: data.totalRequested },
    { name: 'Tổng duyệt', value: data.totalApproved },
    { name: 'TB đề xuất', value: data.avgRequested },
    { name: 'TB duyệt', value: data.avgApproved },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ngân sách đề tài</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => value !== undefined && value !== null ? `${Number(value).toLocaleString('vi-VN')} VNĐ` : ''} />
            <Legend />
            <Bar dataKey="value" name="Số tiền" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
