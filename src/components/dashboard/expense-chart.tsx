'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpenseData {
  category: string;
  amount: number;
  count: number;
  color: string;
}

interface MonthlyData {
  month: string;
  expense: number;
  revenue: number;
}

interface ExpenseChartProps {
  expenseData: ExpenseData[];
  monthlyData: MonthlyData[];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'
];

export function ExpenseChart({ expenseData, monthlyData }: ExpenseChartProps) {
  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 支出内訳円グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>支出内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* 凡例 */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {expenseData.map((item, index) => (
              <div key={item.category} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.category}</span>
                <span className="ml-auto font-semibold">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 月次推移棒グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>月次推移</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'expense' ? '支出' : '収入'
                ]} 
              />
              <Bar dataKey="expense" fill="#FF6B6B" name="支出" />
              <Bar dataKey="revenue" fill="#4ECDC4" name="収入" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}