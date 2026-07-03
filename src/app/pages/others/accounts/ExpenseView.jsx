import {
  ShoppingCart,
  ArrowDownRight,
  Search,
  PieChart,
  BarChart3,
  RefreshCw,
  TrendingDown,
  Receipt,
  Calendar,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from "recharts";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { transactionApi } from "../../../api/transactionApi";
import { useSettings } from "../../../context/SettingsContext";
import { PageLayout } from "../../../components/layout/PageLayout";
import { TransactionDetailModal } from "../../../components/modals/TransactionDetailModal";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f43f5e"];

const PRESETS = [
  { key: "today",     label: "Hôm nay" },
  { key: "week",      label: "Tuần này" },
  { key: "month",     label: "Tháng này" },
  { key: "lastMonth", label: "Tháng trước" },
];

function getRange(key) {
  const now = new Date();
  switch (key) {
    case "today":     return { from: startOfDay(now),  to: endOfDay(now) };
    case "week":      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "lastMonth": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    default:          return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

function mapTx(t) {
  const details = t.details || [];
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const categoryName = expenseDetail?.accountName || "Chưa phân loại";
  const sourceAccount = details.find(d => d.credit > 0)?.accountName || "—";
  return { ...t, categoryName, sourceAccount };
}

function SkeletonStatCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="w-10 h-10 rounded-xl bg-muted" />
      </div>
      <div className="h-8 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  );
}

function SkeletonChartCard() {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border animate-pulse">
      <div className="h-4 bg-muted rounded w-40 mb-1" />
      <div className="h-3 bg-muted rounded w-56 mb-6" />
      <div className="h-[200px] bg-muted/50 rounded-xl" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, gradient }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 ${gradient || "bg-card border border-border"}`}>
      {gradient && (
        <>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16 pointer-events-none" />
        </>
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-semibold uppercase tracking-wider ${gradient ? "text-white/70" : "text-muted-foreground"}`}>
            {label}
          </span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient ? "bg-white/15" : "bg-muted"}`}>
            <Icon size={20} className={gradient ? "text-white" : "text-primary"} />
          </div>
        </div>
        <p className={`text-3xl font-bold tracking-tight ${gradient ? "text-white" : "text-card-foreground"}`}>
          {value}
        </p>
        <p className={`text-sm mt-1 ${gradient ? "text-white/70" : "text-muted-foreground"}`}>
          {sublabel}
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, fmt }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-0.5">{data?.date || payload[0].name}</p>
      {data?.count != null && (
        <p className="text-muted-foreground mb-0.5">{data.count} giao dịch</p>
      )}
      <p className="text-red-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
}

export function ExpenseView() {
  const { fmt } = useSettings();
  const [allTx, setAllTx] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const { from: rangeFrom, to: rangeTo } = useMemo(() => {
    if (preset === "custom") return {
      from: customFrom ? startOfDay(new Date(customFrom)) : null,
      to: customTo ? endOfDay(new Date(customTo)) : null,
    };
    return getRange(preset);
  }, [preset, customFrom, customTo]);

  const loadData = useCallback(async (silent = false) => {
    if (!rangeFrom || !rangeTo) return;
    try {
      silent ? setIsRefreshing(true) : setIsLoading(true);
      const data = await transactionApi.getByRange(rangeFrom.toISOString(), rangeTo.toISOString());
      setAllTx((data || []).map(mapTx));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const expenses = useMemo(() => allTx.filter(t => {
    const details = t.details || [];
    const hasExpense = details.some(d => d.typeId === 5 && d.debit > 0);
    const hasRevenue = details.some(d => d.typeId === 4 && d.credit > 0);
    return hasExpense && !hasRevenue;
  }), [allTx]);

  const totalExpense = expenses.reduce((s, t) => s + t.totalAmount, 0);
  const avgExpense = expenses.length > 0 ? totalExpense / expenses.length : 0;

  const categoryData = useMemo(() => {
    const map = new Map();
    expenses.forEach(t => map.set(t.categoryName, (map.get(t.categoryName) || 0) + t.totalAmount));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const dailyData = useMemo(() => {
    const map = new Map();   // rawDate → { amount, count }
    expenses.forEach(t => {
      const key = t.transactionDate?.slice(0, 10);
      if (key) {
        const entry = map.get(key) || { amount: 0, count: 0 };
        entry.amount += t.totalAmount;
        entry.count += 1;
        map.set(key, entry);
      }
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rawDate, { amount, count }]) => ({
        date: format(new Date(rawDate), "dd/MM"),
        rawDate,
        amount,
        count,
      }));
  }, [expenses]);

  const activeIndex = useMemo(() =>
    selectedCategories.length > 0 ? categoryData.findIndex(c => c.name === selectedCategories[0]) : -1,
    [selectedCategories, categoryData]
  );

  const filtered = useMemo(() =>
    expenses
      .filter(t => {
        const matchesSearch = (t.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
        if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryName)) return false;
        if (selectedDate) {
          const txDate = t.transactionDate?.slice(0, 10);
          if (txDate !== selectedDate) return false;
        }
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
    [expenses, searchTerm, selectedCategories, selectedDate]
  );

  const tooltip = (props) => <ChartTooltip {...props} fmt={fmt} />;

  if (isLoading) {
    return (
      <PageLayout
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
              <ShoppingCart size={20} className="text-white" />
            </div>
            <span>Chi tiêu</span>
          </div>
        }
        subtitle={<span className="ml-[52px]">Xem tổng quan các khoản chi — theo dõi thói quen chi tiêu của bạn</span>}
      >
        {/* Skeleton: time presets */}
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full" />
          ))}
        </div>

        {/* Skeleton: 3 summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        {/* Skeleton: 2 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChartCard />
          <SkeletonChartCard />
        </div>

        {/* Skeleton: table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-pulse">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <div className="h-10 bg-muted rounded-lg max-w-sm" />
          </div>
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 h-4 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <span>Chi tiêu</span>
        </div>
      }
      subtitle={
        <span className="ml-[52px]">Xem tổng quan các khoản chi — theo dõi thói quen chi tiêu của bạn</span>
      }
      actions={
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="p-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          title="Làm mới"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      }
    >
      <div className="animate-fadeIn">
      {/* ════════════════════ TIME PRESETS ════════════════════ */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => { setPreset(p.key); setShowCustom(false); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              preset === p.key ? "bg-red-500 text-white border-red-500 shadow-sm" : "border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
            }`}>
            {p.label}
          </button>
        ))}
        <button onClick={() => { setPreset("custom"); setShowCustom(true); }}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            preset === "custom" ? "bg-red-500 text-white border-red-500 shadow-sm" : "border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
          }`}>
          <Calendar size={14} className="inline mr-1" />Tùy chỉnh
        </button>
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-card" />
            <span className="text-muted-foreground text-sm">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-card" />
          </div>
        )}
      </div>

      {/* ════════════════════ SUMMARY CARDS ════════════════════ */}
      {!isLoading && expenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon={TrendingDown}
            label="Tổng chi tiêu"
            value={fmt(totalExpense)}
            sublabel={`${expenses.length} giao dịch`}
            gradient="bg-gradient-to-br from-red-600 to-red-800"
          />
          <StatCard
            icon={Receipt}
            label="Trung bình / giao dịch"
            value={fmt(avgExpense)}
            sublabel={`${categoryData.length} danh mục chi tiêu`}
          />
          <StatCard
            icon={BarChart3}
            label="Danh mục chi nhiều nhất"
            value={categoryData.length > 0 ? categoryData[0].name : "—"}
            sublabel={categoryData.length > 0 ? fmt(categoryData[0].value) : ""}
          />
        </div>
      )}

      {/* ════════════════════ CHARTS ROW ════════════════════ */}
      {!isLoading && expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Donut — by category */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              <PieChart size={15} className="text-red-500" />
              Chi tiêu theo danh mục
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Phân bổ chi tiêu theo từng danh mục</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                      activeIndex={activeIndex}
                      activeShape={{
                        outerRadius: 95,
                        stroke: PIE_COLORS[activeIndex >= 0 ? activeIndex % PIE_COLORS.length : 0],
                        strokeWidth: 3,
                      }}
                      onClick={(entry) => {
                        setSelectedCategories(prev =>
                          prev.includes(entry.name)
                            ? prev.filter(n => n !== entry.name)
                            : [...prev, entry.name]
                        );
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {categoryData.map((item, i) => (
                        <Cell
                          key={item.name}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          opacity={selectedCategories.length > 0
                            ? (selectedCategories.includes(item.name) ? 1 : 0.3)
                            : 0.85}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={tooltip} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-2 max-h-[200px] overflow-y-auto">
                {categoryData.map((item, i) => {
                  const isActive = selectedCategories.includes(item.name);
                  const pct = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0;
                  return (
                    <div
                      key={item.name}
                      onClick={() => setSelectedCategories(prev =>
                        prev.includes(item.name)
                          ? prev.filter(n => n !== item.name)
                          : [...prev, item.name]
                      )}
                      className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-300 dark:ring-red-700"
                          : selectedCategories.length > 0
                            ? "opacity-40 hover:opacity-70 hover:bg-muted"
                            : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${isActive ? "scale-150" : ""}`} style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className={`text-xs truncate transition-all ${isActive ? "text-foreground font-bold" : "text-foreground font-medium"}`}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                        <span className="text-sm font-bold transition-all text-card-foreground">{fmt(item.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bar — by day */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              <BarChart3 size={15} className="text-red-500" />
              Chi tiêu theo ngày
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Biến động chi tiêu hằng ngày</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ left: 0, right: 8, top: 4 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : `${v}`} />
                  <Tooltip content={tooltip} />
                  <Bar
                    dataKey="amount"
                    name="Chi tiêu"
                    fill="#ef4444"
                    radius={[6,6,0,0]}
                    onClick={(data) => {
                      if (data?.rawDate) {
                        setSelectedDate(prev => prev === data.rawDate ? null : data.rawDate);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                    shape={(props) => {
                      const isActive = props?.payload?.rawDate === selectedDate;
                      return (
                        <Rectangle
                          {...props}
                          radius={[6,6,0,0]}
                          fill={isActive ? "#b91c1c" : "#ef4444"}
                          stroke={isActive ? "#7f1d1d" : "none"}
                          strokeWidth={isActive ? 2 : 0}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ SEARCH & TABLE ════════════════════ */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm mô tả hoặc danh mục..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-card"
              />
            </div>
            {selectedCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategories(prev => prev.filter(n => n !== cat))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shrink-0"
              >
                <span>Danh mục: {cat}</span>
                <span className="ml-0.5 text-red-500 hover:text-red-700">&times;</span>
              </button>
            ))}
            {selectedCategories.length > 0 && (
              <button
                onClick={() => setSelectedCategories([])}
                className="text-xs text-red-500 hover:text-red-600 underline underline-offset-2 shrink-0"
              >
                Xóa tất cả
              </button>
            )}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors shrink-0"
              >
                <span>Ngày: {format(new Date(selectedDate), "dd/MM/yyyy")}</span>
                <span className="ml-0.5 text-orange-500 hover:text-orange-700">&times;</span>
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart size={48} className="mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-medium text-muted-foreground">
              {selectedCategories.length > 0
                ? `Không có khoản chi nào cho ${selectedCategories.length} danh mục đã chọn`
                : selectedDate
                  ? `Không có khoản chi nào vào ngày ${format(new Date(selectedDate), "dd/MM/yyyy")}`
                  : "Không có khoản chi nào"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCategories.length > 0
                ? <button onClick={() => setSelectedCategories([])} className="text-red-500 hover:text-red-600 underline underline-offset-2">Xóa bộ lọc</button>
                : selectedDate
                  ? <button onClick={() => setSelectedDate(null)} className="text-orange-500 hover:text-orange-600 underline underline-offset-2">Xóa bộ lọc</button>
                  : "Thử thay đổi khoảng thời gian"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/50">
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Mô tả</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Danh mục</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Từ ví</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Ngày</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.journalId} onClick={() => setDetailTarget(t)} className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <ArrowDownRight size={14} className="text-red-500" />
                        </div>
                        <span className="font-medium text-sm text-card-foreground truncate max-w-[200px]">
                          {t.description || <span className="italic text-muted-foreground">Không có mô tả</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        {t.categoryName}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-sm text-muted-foreground">{t.sourceAccount}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-sm whitespace-nowrap">
                      <span className="text-red-600">-{fmt(t.totalAmount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {expenses.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/30 text-right text-xs text-muted-foreground">
            {filtered.length !== expenses.length
              ? `Hiển thị ${filtered.length}/${expenses.length} giao dịch`
              : `${expenses.length} giao dịch chi tiêu`}
          </div>
        )}
      </div>
      </div>

      <TransactionDetailModal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        transaction={detailTarget}
      />
    </PageLayout>
  );
}
