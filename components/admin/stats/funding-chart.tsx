'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function FundingChart({
    data,
}: {
    data: {
        totalDisbursed: number;
        totalTransactions: number;
        byMonth: Array<{ month: string; amount: number; count: number }>;
    };
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Giải ngân kinh phí</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">
                            {data.totalDisbursed.toLocaleString('vi-VN')} VNĐ
                        </p>
                        <p className="text-xs text-muted-foreground">Tổng giải ngân</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{data.totalTransactions}</p>
                        <p className="text-xs text-muted-foreground">Số giao dịch</p>
                    </div>
                </div>
                {data.byMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.byMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value, name) =>
                                    name === 'amount'
                                        ? `${Number(value).toLocaleString('vi-VN')} VNĐ`
                                        : `${value} giao dịch`
                                }
                            />
                            <Legend />
                            <Bar dataKey="amount" name="Số tiền giải ngân" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="count" name="Số giao dịch" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">Chưa có dữ liệu giải ngân</p>
                )}
            </CardContent>
        </Card>
    );
}
