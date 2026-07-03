import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { transactionApi } from '../../api/transactionApi';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'sonner';
import { Briefcase } from 'lucide-react';

const PIE_COLORS = ['#22c55e', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#eab308', '#ec4899'];

function mapTransaction(t) {
  const details = t.details || [];
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome = !!revenueDetail;
  let categoryName = 'Chưa phân loại';
  if (expenseDetail) categoryName = expenseDetail.accountName || 'Chi tiêu';
  else if (revenueDetail) categoryName = revenueDetail.accountName || 'Thu nhập';
  else if (isTransfer) categoryName = 'Chuyển khoản';
  return { ...t, categoryName, isIncome, isTransfer };
}

export function AccountCharts() {
  const { fmt } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [cashFlow, setCashFlow] = useState({ totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  // Current month range
  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }, []);

  const monthLabel = useMemo(() => {
    return format(dateRange.from, 'MMMM yyyy', { locale: vi });
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [txData, cfData] = await Promise.all([
        transactionApi.getByRange(dateRange.from.toISOString(), dateRange.to.toISOString()),
        transactionApi.getCashFlow(dateRange.from.toISOString(), dateRange.to.toISOString()),
      ]);
      setTransactions((txData || []).map(mapTransaction));
      setCashFlow({
        totalIncome:  cfData.totalIncome  ?? 0,
        totalExpense: cfData.totalExpense ?? 0,
        netCashFlow:  cfData.netCashFlow  ?? 0,
      });
    } catch {
      setTransactions([]);
      setHasError(true);
      toast.error('Không thể tải dữ liệu biểu đồ');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Compute chart data from real transactions ────────────────────────────

  const { balanceData, changesData, incomeData, expenseData, incomeList, expenseList } = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    );

    // Balance over time — running cumulative total
    let runningBalance = 0;
    const balanceMap = new Map();
    sorted.forEach(t => {
      const amount = t.isIncome ? t.totalAmount : (t.isTransfer ? 0 : -t.totalAmount);
      runningBalance += amount;
      const dateKey = t.transactionDate.slice(0, 10);
      balanceMap.set(dateKey, runningBalance);
    });
    const balanceData = [...balanceMap.entries()].map(([date, balance]) => ({
      date: format(new Date(date), 'dd/MM'),
      balance: Math.round(balance * 100) / 100,
    }));

    // Changes — each transaction as a coloured bar
    const changesData = sorted.map(t => ({
      date: format(new Date(t.transactionDate), 'dd/MM'),
      change: t.isIncome ? t.totalAmount : (t.isTransfer ? 0 : -t.totalAmount),
      fill: t.isIncome ? '#22c55e' : '#ef4444',
      description: t.description,
    }));

    // Income by source — pie
    const incomeBySource = new Map();
    transactions.filter(t => t.isIncome).forEach(t => {
      const name = t.categoryName;
      incomeBySource.set(name, (incomeBySource.get(name) || 0) + t.totalAmount);
    });
    const incomeData = [...incomeBySource.entries()].map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));

    // Expense by category — pie
    const expenseByCategory = new Map();
    transactions.filter(t => !t.isIncome && !t.isTransfer).forEach(t => {
      const name = t.categoryName;
      expenseByCategory.set(name, (expenseByCategory.get(name) || 0) + t.totalAmount);
    });
    const expenseData = [...expenseByCategory.entries()].map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));

    const incomeList = transactions.filter(t => t.isIncome);
    const expenseList = transactions.filter(t => !t.isIncome && !t.isTransfer);

    return { balanceData, changesData, incomeData, expenseData, incomeList, expenseList };
  }, [transactions]);

  const totalIncomeVal = incomeList.reduce((s, t) => s + t.totalAmount, 0);
  const totalExpenseVal = expenseList.reduce((s, t) => s + t.totalAmount, 0);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card p-6 rounded-2xl border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4" />
            <div className="h-[200px] bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (hasError && transactions.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card p-6 rounded-2xl border border-border">
            <h3 className="font-semibold text-foreground mb-2">—</h3>
            <p className="text-xs text-muted-foreground">Không có dữ liệu</p>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Không thể tải dữ liệu
            </div>
          </div>
        ))}
      </div>
    );
  }

  const RangeToggle = () => (
    <div className="flex border border-border rounded-md overflow-hidden text-xs">
      <button
        className={`px-3 py-1 font-medium ${timeRange === 'day' ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground hover:bg-muted'}`}
        onClick={() => setTimeRange('day')}
      >
        Ngày
      </button>
      <button
        className={`px-3 py-1 font-medium border-l border-r border-border ${timeRange === 'week' ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground hover:bg-muted'}`}
        onClick={() => setTimeRange('week')}
      >
        Tuần
      </button>
      <button
        className={`px-3 py-1 font-medium ${timeRange === 'month' ? 'text-emerald-600 bg-emerald-50' : 'text-muted-foreground'}`}
        onClick={() => setTimeRange('month')}
        disabled
      >
        Tháng
      </button>
    </div>
  );

  const hasData = transactions.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Số dư tài khoản */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Số dư tài khoản</h3>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <RangeToggle />
        </div>
        <div className="h-[250px] w-full">
          {hasData && balanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(val) => fmt(val)} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)' }}
                  formatter={(value) => [fmt(value), 'Số dư']}
                />
                <Area type="stepAfter" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Chưa có giao dịch
            </div>
          )}
        </div>
      </div>

      {/* Biến động */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Biến động</h3>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <RangeToggle />
        </div>
        <div className="h-[250px] w-full">
          {hasData && changesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={changesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} tickFormatter={(val) => fmt(val)} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-card-foreground)' }}
                  cursor={{ fill: 'var(--color-muted)' }}
                  formatter={(value, name, props) => [fmt(Math.abs(value)), props.payload?.description || 'Giao dịch']}
                />
                <Bar dataKey="change" barSize={4} radius={[2, 2, 0, 0]}>
                  {changesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Chưa có giao dịch
            </div>
          )}
        </div>
      </div>

      {/* Thu nhập trong kỳ */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Thu nhập trong kỳ</h3>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        {hasData && incomeData.length > 0 ? (
          <>
            <div className="flex justify-center items-center h-[180px]">
              <div className="relative h-[160px] w-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {incomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                      formatter={(value, name) => [fmt(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {incomeData.length === 1 && (
                  <div className="absolute top-1/2 left-0 -translate-x-[110%] -translate-y-1/2 flex items-center">
                    <span className="text-emerald-500 font-bold text-sm mr-2 whitespace-nowrap">100%</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white relative z-10 border-[3px] border-white shadow-sm">
                      <Briefcase size={12} />
                    </div>
                    <div className="w-6 h-[2px] bg-border absolute left-full top-1/2 -translate-y-1/2 -z-10" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 space-y-3 px-4">
              {incomeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-foreground text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {((item.value / totalIncomeVal) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold text-emerald-500 text-sm">{fmt(item.value)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-sm font-semibold text-foreground">Tổng thu nhập</span>
                <span className="font-bold text-emerald-500">+{fmt(totalIncomeVal)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            Chưa có khoản thu nào
          </div>
        )}
      </div>

      {/* Chi tiêu trong kỳ */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Chi tiêu trong kỳ</h3>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        {hasData && expenseData.length > 0 ? (
          <>
            <div className="flex justify-center items-center h-[180px]">
              <div className="relative h-[160px] w-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                      formatter={(value, name) => [fmt(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 space-y-3 px-4">
              {expenseData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-foreground text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {((item.value / totalExpenseVal) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold text-red-500 text-sm">{fmt(item.value)}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-sm font-semibold text-foreground">Tổng chi tiêu</span>
                <span className="font-bold text-red-500">-{fmt(totalExpenseVal)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            Chưa có khoản chi nào
          </div>
        )}
      </div>
    </div>
  );
}
