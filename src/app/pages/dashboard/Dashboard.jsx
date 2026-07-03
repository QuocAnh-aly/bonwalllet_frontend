import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  X,
  MousePointerClick,
  Wallet,
  Landmark,
  PiggyBank,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/dashboardApi";
import { piggyBankApi } from "../../api/piggyBankApi";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { PageLayout } from "../../components/layout/PageLayout";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CHART_COLORS = [
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#10b981",
  "#6366f1",
  "#8b5cf6",
];

// Map a backend journal entry into the shape used by the recent-transactions list.
// typeId: 4=Revenue, 5=Expense. No matching expense/revenue detail => transfer.
function mapRecentTransaction(t) {
  const details = t.details || [];
  const expenseDetail = details.find((d) => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find((d) => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome = !!revenueDetail;

  let categoryName = "Chưa phân loại";
  if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail)
    categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer) categoryName = "Chuyển khoản";

  // Distinct account types touched by this entry, used for the
  // Assets / Liabilities / Savings cross-filter. 1=Assets 2=Liabilities 3=Savings(Equity) 4=Revenue 5=Expense.
  const accountTypeIds = [
    ...new Set(details.map((d) => d.typeId).filter(Boolean)),
  ];

  return {
    id: t.journalId,
    description: t.description,
    amount: t.totalAmount,
    categoryName,
    transactionDate: t.transactionDate,
    isIncome,
    isTransfer,
    accountTypeIds,
  };
}

function SkeletonCard({ gradient }) {
  return (
    <div
      className={`rounded-2xl p-6 animate-pulse ${gradient ? "bg-purple-300" : "bg-card border border-border"}`}>
      <div
        className={`h-4 rounded mb-4 w-1/2 ${gradient ? "bg-purple-400" : "bg-muted"}`}
      />
      <div
        className={`h-10 rounded mb-2 w-3/4 ${gradient ? "bg-purple-400" : "bg-muted"}`}
      />
      <div
        className={`h-3 rounded w-1/3 ${gradient ? "bg-purple-400" : "bg-muted"}`}
      />
    </div>
  );
}

function SkeletonChart() {
  return <div className="h-[300px] bg-muted rounded-xl animate-pulse" />;
}

export function Dashboard() {
  const { user } = useAuth();
  const { fmt, fmtShort } = useSettings();
  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalSavings: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    netCashFlow: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [overspentCategories, setOverspentCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [piggyBanks, setPiggyBanks] = useState([]);
  // Cross-filter applied when the user clicks a chart element.
  // { kind: 'category' | 'flow', value, label }
  const [activeFilter, setActiveFilter] = useState(null);

  const now = new Date();
  const currentMonthLabel = format(now, "MMMM yyyy", { locale: vi });

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setHasError(false);

      // Pull the summary plus a deeper slice of recent transactions in parallel,
      // so the chart cross-filter has enough rows to be useful (read-only, no DB writes).
      const [data, recentRaw, piggyRaw] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getRecentTransactions(50).catch(() => null),
        piggyBankApi.getAll().catch(() => null),
      ]);

      setSummary({
        totalBalance: data.totalBalance ?? 0,
        totalAssets: data.totalAssets ?? 0,
        totalLiabilities: data.totalLiabilities ?? 0,
        totalSavings: data.totalSavings ?? 0,
        monthlyIncome: data.monthlyIncome ?? 0,
        monthlyExpense: data.monthlyExpense ?? 0,
        netCashFlow: data.netCashFlow ?? 0,
      });

      const trend = (data.monthlyTrend?.points || []).map((p) => ({
        month: p.month,
        income: p.income,
        expenses: p.expense,
        net:      (p.income ?? 0) - (p.expense ?? 0),
      }));
      setMonthlyTrend(trend);

      const spending = (data.spendingByCategory || []).map((s) => ({
        name: s.accountName || s.categoryName || "Khác",
        amount: s.amount,
        pct: s.percentage ?? 0,
      }));
      setCategorySpending(spending);

      const recentSource =
        Array.isArray(recentRaw) && recentRaw.length > 0
          ? recentRaw
          : data.recentTransactions || [];
      setRecentTransactions(recentSource.map(mapRecentTransaction));

      const goals = (Array.isArray(piggyRaw) ? piggyRaw : []).map((g) => {
        const saved = g.currentAmount ?? 0;
        const target = g.targetAmount ?? 0;
        return {
          id: g.budgetId,
          name: g.title || "Mục tiêu",
          saved,
          target,
          pct: Math.min(
            g.percentage ?? (target > 0 ? (saved / target) * 100 : 0),
            100,
          ),
        };
      });
      setPiggyBanks(goals);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tổng quan:", error);
      setHasError(true);
      toast.error("Không thể tải dữ liệu tổng quan");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const netPositive = summary.netCashFlow >= 0;

  // Net cash-flow per month, derived from the income/expense trend (no extra request).
  const netTrend = useMemo(
    () =>
      monthlyTrend.map((p) => ({
        month: p.month,
        net: (p.income ?? 0) - (p.expenses ?? 0),
      })),
    [monthlyTrend],
  );

  // Assets / savings / debt side-by-side comparison for the net-worth breakdown chart.
  const financialComposition = useMemo(
    () => [
      {
        name: "Tài sản",
        typeId: 1,
        value: summary.totalAssets,
        fill: "#10b981",
      },
      {
        name: "Tiết kiệm",
        typeId: 3,
        value: summary.totalSavings,
        fill: "#8b5cf6",
      },
      {
        name: "Nợ",
        typeId: 2,
        value: summary.totalLiabilities,
        fill: "#ef4444",
      },
    ],
    [summary.totalAssets, summary.totalSavings, summary.totalLiabilities],
  );

  const hasCompositionData =
    summary.totalAssets > 0 ||
    summary.totalSavings > 0 ||
    summary.totalLiabilities > 0;

  const savingsSaved = piggyBanks.reduce((s, g) => s + g.saved, 0);
  const savingsTarget = piggyBanks.reduce((s, g) => s + g.target, 0);
  const savingsPct =
    savingsTarget > 0 ? Math.min((savingsSaved / savingsTarget) * 100, 100) : 0;

  // Recent transactions narrowed by the active chart cross-filter.
  const filteredTransactions = useMemo(() => {
    if (!activeFilter) return recentTransactions;
    if (activeFilter.kind === "category")
      return recentTransactions.filter(
        (t) => t.categoryName === activeFilter.value,
      );
    if (activeFilter.kind === "flow") {
      if (activeFilter.value === "income")
        return recentTransactions.filter((t) => t.isIncome);
      if (activeFilter.value === "expense")
        return recentTransactions.filter((t) => !t.isIncome && !t.isTransfer);
      if (activeFilter.value === "transfer")
        return recentTransactions.filter((t) => t.isTransfer);
    }
    if (activeFilter.kind === "accountType")
      return recentTransactions.filter((t) =>
        t.accountTypeIds?.includes(activeFilter.value),
      );
    return recentTransactions;
  }, [recentTransactions, activeFilter]);

  // Toggle a filter off if the same element is clicked again.
  const applyFilter = useCallback((next) => {
    setActiveFilter((prev) =>
      prev && prev.kind === next.kind && prev.value === next.value
        ? null
        : next,
    );
  }, []);

  const filterByCategory = useCallback(
    (name) => {
      if (!name) return;
      applyFilter({
        kind: "category",
        value: name,
        label: `Danh mục: ${name}`,
      });
    },
    [applyFilter],
  );

  const filterByFlow = useCallback(
    (value, label) => {
      applyFilter({ kind: "flow", value, label });
    },
    [applyFilter],
  );

  const filterByAccountType = useCallback(
    (value, label) => {
      applyFilter({ kind: "accountType", value, label });
    },
    [applyFilter],
  );

  // Convenience flags for highlighting the active card/chart element.
  const isFlowActive = (v) =>
    activeFilter?.kind === "flow" && activeFilter.value === v;
  const isTypeActive = (v) =>
    activeFilter?.kind === "accountType" && activeFilter.value === v;

  if (isLoading) {
    return (
      <PageLayout title="Tổng quan" subtitle="Đang tải dữ liệu...">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCard gradient />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <SkeletonChart />
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border">
            <SkeletonChart />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="h-6 bg-muted rounded w-48 mb-6 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 border-b border-border last:border-0">
              <div className="w-12 h-12 rounded-full bg-accent animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/3 mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout title="Tổng quan" subtitle="Không thể tải dữ liệu">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground mb-4">
            Không thể tải dữ liệu tổng quan.
          </p>
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Tổng quan"
      subtitle={`Chào mừng trở lại${user?.userName ? `, ${user.userName}` : ""}! Đây là tổng quan tài chính tháng ${currentMonthLabel}`}
      actions={
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          title="Làm mới">
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          <span className="capitalize">{currentMonthLabel}</span>
        </button>
      }>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-purple-100 text-xs sm:text-sm">
              Tổng số dư
            </span>
            <TrendingUp size={18} className="text-purple-200" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 truncate">
            {fmt(summary.totalBalance)}
          </p>
          <p className="text-purple-100 text-xs sm:text-sm">
            Trên tất cả tài khoản
          </p>
        </div>

        <button
          type="button"
          onClick={() => filterByFlow("income", "Dòng tiền: Thu nhập")}
          className={`text-left bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors hover:border-green-300 ${isFlowActive("income") ? "border-green-500 ring-1 ring-green-500/40" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Thu nhập
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/15 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-card-foreground mb-1 sm:mb-2 truncate">
            {fmt(summary.monthlyIncome)}
          </p>
          <p className="text-green-600 text-xs sm:text-sm">Tháng này</p>
        </button>

        <button
          type="button"
          onClick={() => filterByFlow("expense", "Dòng tiền: Chi tiêu")}
          className={`text-left bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors hover:border-red-300 ${isFlowActive("expense") ? "border-red-500 ring-1 ring-red-500/40" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Chi tiêu
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <ArrowDownRight size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-card-foreground mb-1 sm:mb-2 truncate">
            {fmt(summary.monthlyExpense)}
          </p>
          <p
            className={`text-xs sm:text-sm font-medium ${netPositive ? "text-green-600" : "text-red-500"}`}>
            Dòng tiền ròng: {netPositive ? "+" : ""}
            {fmt(summary.netCashFlow)}
          </p>
        </button>
      </div>

      {/* Net-worth breakdown cards: assets, debt, savings — each acts as a cross-filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <button
          type="button"
          onClick={() => filterByAccountType(1, "Tài khoản: Tài sản")}
          className={`text-left bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors hover:border-emerald-300 ${isTypeActive(1) ? "border-emerald-500 ring-1 ring-emerald-500/40" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Tài sản
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Wallet size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-card-foreground mb-1 sm:mb-2 truncate">
            {fmt(summary.totalAssets)}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Tổng giá trị tài sản
          </p>
        </button>

        <button
          type="button"
          onClick={() => filterByAccountType(2, "Tài khoản: Nợ phải trả")}
          className={`text-left bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors hover:border-red-300 ${isTypeActive(2) ? "border-red-500 ring-1 ring-red-500/40" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Nợ phải trả
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <Landmark size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2 truncate">
            {fmt(summary.totalLiabilities)}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Tổng dư nợ hiện tại
          </p>
        </button>

        <button
          type="button"
          onClick={() => filterByAccountType(3, "Tài khoản: Tiết kiệm")}
          className={`text-left bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-colors hover:border-purple-300 ${isTypeActive(3) ? "border-purple-500 ring-1 ring-purple-500/40" : "border-border"}`}>
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Lợn tiết kiệm
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/15 flex items-center justify-center">
              <PiggyBank size={16} className="text-purple-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-purple-600 mb-1 sm:mb-2 truncate">
            {fmt(summary.totalSavings)}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {piggyBanks.length > 0
              ? `${piggyBanks.length} mục tiêu đang tiết kiệm`
              : "Đã để dành"}
          </p>
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-bold text-card-foreground">
              Thu nhập và Chi tiêu
            </h2>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <MousePointerClick size={13} /> Nhấp cột để lọc
            </span>
          </div>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={fmtShort}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-card-foreground)",
                  }}
                  formatter={(value, name) => [
                    fmt(value),
                    name === "income" ? "Thu nhập" : "Chi tiêu",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "income" ? "Thu nhập" : "Chi tiêu"
                  }
                />
                <Bar
                  dataKey="income"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  className="cursor-pointer"
                  fillOpacity={
                    activeFilter?.kind === "flow" &&
                    activeFilter.value !== "income"
                      ? 0.35
                      : 1
                  }
                  onClick={() => filterByFlow("income", "Dòng tiền: Thu nhập")}
                />
                <Bar
                  dataKey="expenses"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                  className="cursor-pointer"
                  fillOpacity={
                    activeFilter?.kind === "flow" &&
                    activeFilter.value !== "expense"
                      ? 0.35
                      : 1
                  }
                  onClick={() => filterByFlow("expense", "Dòng tiền: Chi tiêu")}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Không có dữ liệu xu hướng
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-bold text-card-foreground">
              Chi tiêu theo danh mục
            </h2>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <MousePointerClick size={13} /> Nhấp để lọc
            </span>
          </div>
          {categorySpending.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="amount"
                    nameKey="name">
                    {categorySpending.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      color: "var(--color-card-foreground)",
                    }}
                    formatter={(value) => [fmt(value), "Số tiền"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categorySpending.slice(0, 5).map((s, i) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-muted-foreground truncate max-w-[140px]">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {s.pct.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-foreground">
                        {fmt(s.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Không có dữ liệu chi tiêu
            </div>
          )}
        </div>
      </div>

      {/* Net cash-flow trend */}
      <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-card-foreground">
            Dòng tiền ròng theo tháng
          </h2>
          <span className="text-xs text-muted-foreground">
            Thu nhập − Chi tiêu
          </span>
        </div>
        {netTrend.some((p) => p.net !== 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={netTrend}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="month"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 12 }}
                tickFormatter={fmtShort}
              />
              <ReferenceLine
                y={0}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-card-foreground)",
                }}
                formatter={(value) => [fmt(value), "Dòng tiền ròng"]}
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#netGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground">
            Không có dữ liệu dòng tiền
          </div>
        )}
      </div>

      {/* Net worth composition + savings goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Financial composition: assets vs savings vs debt */}
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-bold text-card-foreground">
              Cơ cấu tài chính
            </h2>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <MousePointerClick size={13} /> Nhấp để lọc
            </span>
          </div>
          {hasCompositionData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={financialComposition}
                layout="vertical"
                margin={{ left: 8, right: 16 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  type="number"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={fmtShort}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 13 }}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-card-foreground)",
                  }}
                  formatter={(value) => [fmt(value), "Số tiền"]}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  barSize={28}
                  className="cursor-pointer"
                  onClick={(d) =>
                    d?.payload &&
                    filterByAccountType(
                      d.payload.typeId,
                      `Tài khoản: ${d.payload.name}`,
                    )
                  }>
                  {financialComposition.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      fillOpacity={
                        activeFilter?.kind === "accountType" &&
                        activeFilter.value !== entry.typeId
                          ? 0.35
                          : 1
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground">
              Chưa có dữ liệu tài sản
            </div>
          )}
        </div>

        {/* Savings goals progress */}
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-bold text-card-foreground">
              Tiến độ lợn tiết kiệm
            </h2>
            <Link
              to="/piggy-banks"
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
              Xem tất cả
              <ExternalLink size={14} />
            </Link>
          </div>
          {piggyBanks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <PiggyBank size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Chưa có lợn tiết kiệm nào.
              </p>
              <Link
                to="/piggy-banks"
                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                Tạo mục tiêu đầu tiên
              </Link>
            </div>
          ) : (
            <>
              {savingsTarget > 0 && (
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Tổng tiến độ</span>
                    <span className="font-semibold text-foreground">
                      {fmt(savingsSaved)} / {fmt(savingsTarget)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${savingsPct}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {piggyBanks.slice(0, 4).map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-card-foreground truncate max-w-[55%]">
                        {g.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {fmt(g.saved)} / {fmt(g.target)} · {g.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${g.pct >= 100 ? "bg-emerald-500" : "bg-purple-500"}`}
                        style={{ width: `${Math.max(g.pct, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Net cash flow over time */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Dòng tiền ròng theo tháng</h2>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={fmtShort} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                formatter={(value) => [fmt(value), "Dòng tiền ròng"]}
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#netFlowGradient)"
                name="Dòng tiền ròng"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">Không có dữ liệu dòng tiền</div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-card-foreground">
            Giao dịch gần đây
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Xem tất cả
            <ExternalLink size={14} />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Không có giao dịch gần đây
          </p>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Không có giao dịch nào khớp với bộ lọc.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTransactions.map((t) => {
              const iconBg = t.isTransfer
                ? "bg-blue-500/10"
                : t.isIncome
                  ? "bg-green-500/15"
                  : "bg-red-500/10";
              const Icon = t.isTransfer
                ? ArrowLeftRight
                : t.isIncome
                  ? ArrowUpRight
                  : ArrowDownRight;
              const iconCls = t.isTransfer
                ? "text-blue-400"
                : t.isIncome
                  ? "text-green-400"
                  : "text-red-400";
              const amtCls = t.isTransfer
                ? "text-blue-400"
                : t.isIncome
                  ? "text-green-400"
                  : "text-foreground";
              const amtPrefix = t.isIncome ? "+" : t.isTransfer ? "" : "-";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-4 hover:bg-muted px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <Icon size={18} className={iconCls} />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground text-sm">
                        {t.description || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.categoryName} ·{" "}
                        {t.transactionDate
                          ? format(new Date(t.transactionDate), "dd/MM/yyyy")
                          : ""}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${amtCls}`}>
                    {amtPrefix}
                    {fmt(Math.abs(t.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
