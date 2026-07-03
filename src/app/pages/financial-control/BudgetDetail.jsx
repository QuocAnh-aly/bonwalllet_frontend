import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Wallet, Target,
  AlertTriangle, CheckCircle2, XCircle, Pencil, Trash2,
  Receipt, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { useNotifications } from "../../context/NotificationContext";
import { budgetApi } from "../../api/budgetApi";
import { transactionApi } from "../../api/transactionApi";
import { useSettings } from "../../context/SettingsContext";
import { PageLayout } from "../../components/layout/PageLayout";
import { shouldShowToast } from "../../utils/toastOnce";
import { confirmDialog } from "../../utils/confirmDialog";
import { EditBudgetModal } from "../../components/modals/EditBudgetModal";
import { ICON_MAP as iconMap, COLOR_MAP as colorMap } from "../../utils/icons";

const PERIOD_LABELS = {
  monthly: "Hàng tháng",
  weekly:  "Hàng tuần",
  yearly:  "Hàng năm",
  custom:  "Tùy chỉnh",
};

function StatusBadge({ percentage }) {
  if (percentage > 100)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle size={12} /> Vượt hạn mức
      </span>
    );
  if (percentage >= 80)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={12} /> Cảnh báo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle2 size={12} /> Ổn định
    </span>
  );
}

function buildChartData(transactions) {
  if (!transactions?.length) return [];
  const byDay = {};
  transactions.forEach(t => {
    if (!t.transactionDate) return;
    const key = format(parseISO(t.transactionDate), "dd/MM");
    byDay[key] = (byDay[key] ?? 0) + (t.totalAmount ?? 0);
  });
  return Object.entries(byDay)
    .sort(([a], [b]) => {
      const [da, ma] = a.split("/").map(Number);
      const [db, mb] = b.split("/").map(Number);
      return ma !== mb ? ma - mb : da - db;
    })
    .map(([day, amount]) => ({ day, amount }));
}

const PIE_PALETTE = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ec4899",
  "#eab308", "#06b6d4", "#ef4444", "#6366f1", "#64748b",
];

function buildPieData(transactions, keyField) {
  if (!transactions?.length) return [];
  const acc = {};
  transactions.forEach(t => {
    const k = t[keyField] || "Khác";
    acc[k] = (acc[k] ?? 0) + (t.totalAmount ?? 0);
  });
  return Object.entries(acc)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({ name, value, color: PIE_PALETTE[i % PIE_PALETTE.length] }));
}

function buildCumulativeData(transactions) {
  if (!transactions?.length) return [];
  const sorted = [...transactions]
    .filter(t => t.transactionDate)
    .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  let running = 0;
  const map = new Map();
  sorted.forEach(t => {
    running += t.totalAmount ?? 0;
    const key = format(parseISO(t.transactionDate), "dd/MM");
    map.set(key, running);
  });
  return [...map.entries()].map(([day, cumulative]) => ({ day, cumulative }));
}

const ChartTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">Ngày {label}</p>
      <p className="text-purple-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
};

const PieTooltip = ({ active, payload, fmt, total }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-0.5">{d.name}</p>
      <p className="text-muted-foreground">
        <span className="font-bold text-card-foreground">{fmt(d.value)}</span>
        <span className="text-muted-foreground ml-1">({pct}%)</span>
      </p>
    </div>
  );
};

const CumulativeTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">Ngày {label}</p>
      <p className="text-muted-foreground">Đã chi lũy kế: <span className="font-bold text-card-foreground">{fmt(payload[0].value)}</span></p>
    </div>
  );
};

function PieCard({ title, data, total, fmt }) {
  if (!data?.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <p className="text-sm font-bold text-foreground mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="var(--color-card)" strokeWidth={2} />)}
          </Pie>
          <Tooltip content={<PieTooltip fmt={fmt} total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5 max-h-32 overflow-auto">
        {data.slice(0, 5).map(d => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground truncate">{d.name}</span>
            </div>
            <span className="font-semibold text-foreground shrink-0 ml-2">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function mapTransactionForBudget(t, budgetAccountId) {
  const details = t.details || [];
  const debitDetail  = details.find(d => d.debit  > 0);
  const creditDetail = details.find(d => d.credit > 0);
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome   = !!revenueDetail;
  return {
    journalId:       t.journalId,
    transactionDate: t.transactionDate,
    description:     t.description,
    totalAmount:     t.totalAmount,
    sourceAccount:   creditDetail?.accountName || "—",
    destAccount:     debitDetail?.accountName  || "—",
    isIncome,
    isTransfer,
    matchesBudget:   details.some(d => d.accountId === budgetAccountId),
  };
}

export function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();

  const [budget,       setBudget]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [editOpen,     setEditOpen]     = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await budgetApi.getExpenseBudgetById(id);
      setBudget(data);

      // Show warning toast if budget is over or near limit (session-deduplicated)
      if (data) {
        const pct = data.percentage ?? (data.targetAmount > 0 ? (data.currentAmount / data.targetAmount) * 100 : 0);
        if (pct > 100) {
          const toastKey = `budget-over:${id}`;
          if (shouldShowToast(toastKey)) {
            toast.error(`"${data.title}" đã vượt hạn mức!`, {
              description: `Đã chi ${fmt(data.currentAmount)} trên ${fmt(data.targetAmount)}`,
              duration: 6000,
            });
            addNotification({
              type: 'error',
              title: '⚠️ Vượt hạn mức ngân sách',
              message: `"${data.title}" đã chi ${fmt(data.currentAmount)}/${fmt(data.targetAmount)}`,
              link: `/budgets/${id}`,
            });
          }
        } else if (pct >= 80) {
          const toastKey = `budget-warn:${id}`;
          if (shouldShowToast(toastKey)) {
            toast.warning(`"${data.title}" sắp đạt hạn mức`, {
              description: `Đã dùng ${pct.toFixed(1)}% (${fmt(data.currentAmount)}/${fmt(data.targetAmount)})`,
              duration: 5000,
            });
            addNotification({
              type: 'warning',
              title: '⚠️ Ngân sách sắp hết',
              message: `"${data.title}" đã dùng ${pct.toFixed(1)}% (${fmt(data.currentAmount)}/${fmt(data.targetAmount)})`,
              link: `/budgets/${id}`,
            });
          }
        }
      }

      if (data?.budgetId) {
        try {
          // Chỉ lấy các giao dịch đã được GÁN cho đúng ngân sách này (theo budget_id),
          // không phải mọi giao dịch của danh mục — vì một danh mục có thể có nhiều
          // ngân sách.
          const txs = await transactionApi.getByBudget(data.budgetId);
          const mapped = (txs || []).map(t => mapTransactionForBudget(t, data.accountId));
          setTransactions(mapped);
        } catch {
          setTransactions([]);
        }
      }
    } catch {
      toast.error("Không thể tải dữ liệu ngân sách");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const { addNotification } = useNotifications();

  const handleUpdate = async (budgetId, payload) => {
    try {
      await budgetApi.updateExpenseBudget(budgetId, payload);
      await load();
      setEditOpen(false);
      toast.success("Đã cập nhật ngân sách!");
      addNotification({ type: 'success', title: 'Đã cập nhật ngân sách', message: `"${budget?.title}" đã được cập nhật`, link: `/budgets/${id}` });
    } catch {
      toast.error("Không thể cập nhật ngân sách");
      addNotification({ type: 'error', title: 'Lỗi cập nhật ngân sách', message: 'Không thể cập nhật ngân sách' });
    }
  };

  const handleDelete = async () => {
    if (!await confirmDialog(`Xóa ngân sách "${budget?.title}"?`)) return;
    try {
      await budgetApi.deleteBudget(id);
      toast.success(`Đã xóa "${budget?.title}".`);
      addNotification({ type: 'success', title: 'Đã xóa ngân sách', message: `"${budget?.title}" đã được xóa` });
      navigate("/budgets");
    } catch {
      toast.error("Không thể xóa ngân sách");
      addNotification({ type: 'error', title: 'Lỗi xóa ngân sách', message: 'Không thể xóa ngân sách' });
    }
  };

  const chartData    = useMemo(() => buildChartData(transactions), [transactions]);
  const sourcePie    = useMemo(() => buildPieData(transactions, "sourceAccount"), [transactions]);
  const cumulative   = useMemo(() => buildCumulativeData(transactions), [transactions]);
  const totalSpent   = useMemo(() => transactions.reduce((s, t) => s + (t.totalAmount ?? 0), 0), [transactions]);
  const avgSpend = useMemo(() => {
    if (!transactions.length) return 0;
    return totalSpent / transactions.length;
  }, [transactions, totalSpent]);
  const maxSpend = useMemo(() => {
    if (!transactions.length) return 0;
    return Math.max(...transactions.map(t => t.totalAmount ?? 0));
  }, [transactions]);

  if (isLoading) {
    return (
      <PageLayout title="Chi tiết ngân sách">
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  if (!budget) {
    return (
      <PageLayout title="Chi tiết ngân sách">
        <div className="py-16 text-center text-muted-foreground">
          <TrendingUp size={48} className="mx-auto mb-3 text-slate-200" />
          <p>Không tìm thấy ngân sách</p>
          <button onClick={() => navigate("/budgets")} className="mt-3 text-purple-600 text-sm hover:underline">
            ← Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  const Icon    = iconMap[budget.iconName] || iconMap.Coffee;
  const colors  = colorMap[budget.color]   || colorMap.orange;
  const spent   = budget.currentAmount ?? 0;
  const target  = budget.targetAmount  ?? 0;
  const pct     = budget.percentage ?? (target > 0 ? Math.min((spent / target) * 100, 100) : 0);
  const pctClamped = Math.min(pct, 100);
  const remaining  = target - spent;
  const isOver    = pct > 100;
  const isWarning = pct >= 80 && !isOver;

  const heroGrad = isOver
    ? "from-red-500 to-red-700"
    : isWarning
      ? "from-amber-500 to-orange-600"
      : "from-purple-600 to-purple-800";

  const budgetForModal = {
    id:        budget.budgetId,
    name:      budget.title,
    budget:    target,
    periodType: budget.periodType,
    startDate: budget.startDate,
    endDate:   budget.endDate,
  };

  return (
    <PageLayout
      title="Chi tiết ngân sách"
      subtitle="Theo dõi mức độ chi tiêu và lịch sử giao dịch của ngân sách"
      actions={
        <>
          <button onClick={() => navigate("/budgets")}
            className="flex items-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </button>
          <button onClick={() => setEditOpen(true)}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Sửa">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa">
            <Trash2 size={18} />
          </button>
        </>
      }
    >
      {/* Identity row */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon size={24} className={colors.text} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-card-foreground leading-tight">{budget.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge percentage={pct} />
            {budget.periodType && (
              <span className="text-xs text-muted-foreground">{PERIOD_LABELS[budget.periodType] || budget.periodType}</span>
            )}
            {!budget.isActive && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-semibold">Tắt</span>
            )}
          </div>
        </div>
      </div>

      {/* Hero progress */}
      <div className={`bg-gradient-to-br ${heroGrad} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1">Đã chi tiêu</p>
            <p className="text-4xl font-bold">{fmt(spent)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Hạn mức</p>
            <p className="text-xl font-semibold">{fmt(target)}</p>
          </div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full mb-2">
          <div className="h-3 bg-card rounded-full transition-all duration-700"
            style={{ width: `${pctClamped}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/85">
          <span>{pct.toFixed(1)}% đã dùng</span>
          <span>{isOver ? `Vượt ${fmt(Math.abs(remaining))}` : `Còn lại ${fmt(remaining)}`}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Hạn mức</p>
            <Target size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{fmt(target)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Đã chi</p>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{fmt(spent)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">{isOver ? "Vượt mức" : "Còn lại"}</p>
            <Wallet size={16} className="text-muted-foreground" />
          </div>
          <p className={`text-xl font-bold ${isOver ? "text-red-600" : "text-card-foreground"}`}>
            {fmt(Math.abs(remaining))}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Số giao dịch</p>
            <Receipt size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{transactions.length}</p>
          {avgSpend > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">TB {fmt(avgSpend)}</p>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Chu kỳ</p>
            <p className="font-semibold text-foreground">
              {PERIOD_LABELS[budget.periodType] || budget.periodType || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Bắt đầu</p>
            <p className="font-semibold text-foreground">
              {budget.startDate ? format(parseISO(budget.startDate), "dd/MM/yyyy", { locale: vi }) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Kết thúc</p>
            <p className="font-semibold text-foreground">
              {budget.endDate ? format(parseISO(budget.endDate), "dd/MM/yyyy", { locale: vi }) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tài khoản</p>
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Wallet size={13} className="text-muted-foreground" />
              {budget.accountName || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Daily spending bar chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Biểu đồ chi tiêu theo ngày</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Cao nhất: <span className="font-semibold text-foreground">{fmt(maxSpend)}</span></span>
              <span>TB: <span className="font-semibold text-foreground">{fmt(avgSpend)}</span></span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="amount" fill={colors.pie} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cumulative spending vs target */}
      {cumulative.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Chi tiêu lũy kế so với hạn mức</p>
            <span className="text-xs text-muted-foreground">
              Đã dùng <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cumulative} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<CumulativeTooltip fmt={fmt} />} />
              {target > 0 && (
                <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: `Hạn mức ${fmt(target)}`, fill: "#ef4444", fontSize: 11, position: "insideTopRight" }} />
              )}
              <Line type="monotone" dataKey="cumulative" stroke={colors.pie} strokeWidth={2.5}
                dot={{ r: 3, fill: colors.pie, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Source distribution */}
      {sourcePie.length > 0 && (
        <div className="mb-6">
          <PieCard title="Chi tiêu theo tài khoản nguồn" data={sourcePie} total={totalSpent} fmt={fmt} />
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giao dịch trong ngân sách</p>
          <span className="text-xs text-muted-foreground">{transactions.length} giao dịch</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-muted-foreground">
            <Receipt size={36} className="mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào trong ngân sách này</p>
            <p className="text-xs mt-1 text-muted-foreground">Thêm giao dịch chi tiêu vào danh mục để bắt đầu theo dõi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                <th className="px-4 md:px-6 py-3 font-semibold">Ngày</th>
                <th className="px-4 md:px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-4 md:px-6 py-3 font-semibold hidden md:table-cell">Nguồn</th>
                <th className="px-4 md:px-6 py-3 font-semibold hidden md:table-cell">Đích</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...transactions]
                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                .map(t => {
                  const TxIcon = t.isTransfer ? ArrowLeftRight : t.isIncome ? ArrowUpRight : ArrowDownRight;
                  const txCls  = t.isTransfer ? "text-blue-500" : t.isIncome ? "text-green-600" : "text-red-500";
                  const amtCls = t.isTransfer ? "text-blue-600" : t.isIncome ? "text-green-600" : "text-red-500";
                  return (
                    <tr key={t.journalId} className="hover:bg-muted">
                      <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground">
                        {t.transactionDate
                          ? format(parseISO(t.transactionDate), "dd/MM/yyyy", { locale: vi })
                          : "—"}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <TxIcon size={14} className={txCls} />
                          <span>{t.description || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground hidden md:table-cell">{t.sourceAccount}</td>
                      <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground hidden md:table-cell">{t.destAccount}</td>
                      <td className={`px-4 md:px-6 py-3 text-sm font-bold text-right ${amtCls}`}>
                        {t.isIncome ? "+" : t.isTransfer ? "" : "-"}{fmt(t.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {editOpen && (
        <EditBudgetModal budget={budgetForModal} onClose={() => setEditOpen(false)} onSave={handleUpdate} />
      )}
    </PageLayout>
  );
}
