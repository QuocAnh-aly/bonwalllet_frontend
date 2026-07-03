import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Wallet, Target,
  ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  Receipt, PieChart, Activity, DollarSign,
  Calendar, RefreshCw, Pencil, Trash2, Landmark,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { format, parseISO, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { accountApi } from "../../../api/accountApi";
import { transactionApi } from "../../../api/transactionApi";
import { useSettings } from "../../../context/SettingsContext";
import { PageLayout } from "../../../components/layout/PageLayout";
import { ICON_MAP as iconMap } from "../../../utils/icons";
import PaginationBar from "../../../components/ui/navigation/PaginationBar";
import { EditAccountModal } from "../../../components/modals/EditAccountModal";
import { confirmDialog } from "../../../utils/confirmDialog";
import { useNotifications } from "../../../context/NotificationContext";

const PIE_PALETTE = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ec4899",
  "#eab308", "#06b6d4", "#ef4444", "#6366f1", "#64748b",
];

const TYPE_GRADIENTS = {
  1: { from: "#3b82f6", to: "#1d4ed8", label: "Tài sản" },
  2: { from: "#ef4444", to: "#b91c1c", label: "Nợ" },
  4: { from: "#22c55e", to: "#15803d", label: "Thu nhập" },
  5: { from: "#f97316", to: "#c2410c", label: "Chi phí" },
};

const RANGE_PRESETS = [
  { key: "7d",   label: "7 ngày" },
  { key: "30d",  label: "30 ngày" },
  { key: "3m",   label: "3 tháng" },
  { key: "6m",   label: "6 tháng" },
  { key: "1y",   label: "1 năm" },
  { key: "all",  label: "Tất cả" },
];

function mapTransactionForAccount(t, accountId) {
  const details = t.details || [];
  const debitDetail  = details.find(d => d.accountId === accountId);
  const creditDetail = details.find(d => d.accountId !== accountId);

  // Determine if this account is on debit side (inflow) or credit side (outflow)
  const isInflow = !!debitDetail;
  const isOutflow = !debitDetail;

  // Find the counterparty detail (the other side of the transaction)
  const otherDetail = isInflow
    ? details.find(d => d.accountId !== accountId && d.credit > 0)
    : details.find(d => d.accountId !== accountId && d.debit > 0);

  // Determine transaction type
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const liabilityDetail = details.find(d => d.typeId === 2);
  const isTransfer = !expenseDetail && !revenueDetail && !liabilityDetail;
  const isIncome   = !!revenueDetail;
  const isExpense  = !!expenseDetail;
  const isRepayment = !!liabilityDetail && isInflow;

  // Counterparty name
  let counterpartyName = otherDetail?.accountName || "—";

  return {
    journalId:       t.journalId,
    transactionDate: t.transactionDate,
    description:     t.description,
    totalAmount:     t.totalAmount,
    isInflow,
    isOutflow,
    isIncome,
    isExpense,
    isTransfer,
    isRepayment,
    counterpartyName,
  };
}

function buildDailyData(transactions) {
  if (!transactions?.length) return [];
  const byDay = {};
  transactions.forEach(t => {
    if (!t.transactionDate) return;
    const key = format(parseISO(t.transactionDate), "dd/MM");
    if (!byDay[key]) byDay[key] = { day: key, inflow: 0, outflow: 0 };
    if (t.isInflow) byDay[key].inflow += t.totalAmount ?? 0;
    else            byDay[key].outflow += t.totalAmount ?? 0;
  });
  return Object.entries(byDay)
    .sort(([a], [b]) => {
      const [da, ma] = a.split("/").map(Number);
      const [db, mb] = b.split("/").map(Number);
      return ma !== mb ? ma - mb : da - db;
    })
    .map(([, v]) => v);
}

function buildCumulativeData(transactions, initialBalance = 0) {
  if (!transactions?.length) return [];
  const sorted = [...transactions]
    .filter(t => t.transactionDate)
    .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
  let running = initialBalance;
  const map = new Map();
  sorted.forEach(t => {
    const delta = t.isInflow ? (t.totalAmount ?? 0) : -(t.totalAmount ?? 0);
    running += delta;
    const key = format(parseISO(t.transactionDate), "dd/MM");
    map.set(key, running);
  });
  return [...map.entries()].map(([day, balance]) => ({ day, balance }));
}

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

const BarTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">Ngày {label}</p>
      {payload.map((p, i) => (
        <p key={i} className={p.dataKey === "inflow" ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
          {p.dataKey === "inflow" ? "Thu: " : "Chi: "}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltipInner = ({ active, payload, fmt, total }) => {
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
      <p className="text-muted-foreground">
        Số dư: <span className="font-bold text-card-foreground">{fmt(payload[0].value)}</span>
      </p>
    </div>
  );
};

function PieCard({ title, data, total, fmt }) {
  if (!data?.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <p className="text-sm font-bold text-foreground mb-3">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <RePieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="var(--color-card)" strokeWidth={2} />)}
          </Pie>
          <RechartsTooltip content={<PieTooltipInner fmt={fmt} total={total} />} />
        </RePieChart>
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

export function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();
  const { addNotification } = useNotifications();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [editingAccount, setEditingAccount] = useState(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start;
    switch (rangePreset) {
      case "7d":  start = startOfDay(subDays(now, 7)); break;
      case "30d": start = startOfDay(subDays(now, 30)); break;
      case "3m":  start = startOfDay(subMonths(now, 3)); break;
      case "6m":  start = startOfDay(subMonths(now, 6)); break;
      case "1y":  start = startOfDay(subMonths(now, 12)); break;
      case "all": start = startOfDay(new Date(2020, 0, 1)); break;
      case "custom":
        start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 30));
        return { from: start, to: customTo ? endOfDay(new Date(customTo)) : end };
      default:    start = startOfDay(subDays(now, 30));
    }
    return { from: start, to: end };
  }, [rangePreset, customFrom, customTo]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const accountData = await accountApi.getById(id);
      setAccount(accountData);

      const { from, to } = getDateRange();
      const txs = await transactionApi.getByRangeAndAccount(
        parseInt(id),
        from.toISOString(),
        to.toISOString(),
      );
      const mapped = (txs || []).map(t => mapTransactionForAccount(t, parseInt(id)));
      setTransactions(mapped);
    } catch {
      toast.error("Không thể tải dữ liệu tài khoản");
    } finally {
      setIsLoading(false);
    }
  }, [id, getDateRange]);

  useEffect(() => { load(); setTxPage(1); }, [load]);

  const handleEdit = useCallback(async (data) => {
    try {
      await accountApi.update(id, data);
      toast.success("Đã cập nhật tài khoản!");
      setEditingAccount(null);
      addNotification({ type: 'success', title: 'Đã cập nhật tài khoản', message: `"${account?.name}" đã được cập nhật` });
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật tài khoản");
    }
  }, [id, account, load, addNotification]);

  const handleDelete = useCallback(async () => {
    if (!await confirmDialog(`Xóa tài khoản "${account?.name}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      await accountApi.delete(id);
      toast.success(`Đã xóa "${account?.name}".`);
      addNotification({ type: 'success', title: 'Đã xóa tài khoản', message: `"${account?.name}" đã được xóa` });
      navigate(account?.typeId === 2 ? "/accounts/liabilities" : account?.typeId === 4 ? "/accounts/income" : "/accounts/asset");
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(msg || `Không thể xóa "${account?.name}". Tài khoản có thể đang được sử dụng trong giao dịch hoặc ngân sách.`);
    }
  }, [id, account, navigate, addNotification]);

  const accountId = parseInt(id);
  const grad = account ? (TYPE_GRADIENTS[account.typeId] || TYPE_GRADIENTS[1]) : TYPE_GRADIENTS[1];
  const Icon = account?.iconName ? (iconMap[account.iconName] || Wallet) : Wallet;
  const balance = account?.balance ?? 0;

  // Stats
  const totalInflow   = useMemo(() => transactions.filter(t => t.isInflow).reduce((s, t) => s + (t.totalAmount ?? 0), 0), [transactions]);
  const totalOutflow  = useMemo(() => transactions.filter(t => t.isOutflow).reduce((s, t) => s + (t.totalAmount ?? 0), 0), [transactions]);
  const netChange     = totalInflow - totalOutflow;
  const txCount       = transactions.length;

  // Chart data
  const dailyData     = useMemo(() => buildDailyData(transactions), [transactions]);
  const cumulative    = useMemo(() => buildCumulativeData(transactions, balance - netChange), [transactions, balance, netChange]);
  const sourcePie     = useMemo(() => buildPieData(transactions.filter(t => t.isInflow), "counterpartyName"), [transactions]);
  const destPie       = useMemo(() => buildPieData(transactions.filter(t => t.isOutflow), "counterpartyName"), [transactions]);
  const maxInflow     = useMemo(() => Math.max(...dailyData.map(d => d.inflow), 0), [dailyData]);
  const maxOutflow    = useMemo(() => Math.max(...dailyData.map(d => d.outflow), 0), [dailyData]);
  const avgInflow     = useMemo(() => txCount > 0 ? totalInflow / txCount : 0, [totalInflow, txCount]);
  const avgOutflow    = useMemo(() => txCount > 0 ? totalOutflow / txCount : 0, [totalOutflow, txCount]);

  // Pagination
  const sortedTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
    [transactions],
  );
  const txTotalPages = useMemo(() => Math.max(1, Math.ceil(sortedTransactions.length / txPageSize)), [sortedTransactions, txPageSize]);
  const paginatedTx  = useMemo(() =>
    sortedTransactions.slice((txPage - 1) * txPageSize, txPage * txPageSize),
    [sortedTransactions, txPage, txPageSize],
  );

  if (isLoading) {
    return (
      <PageLayout title="Chi tiết tài khoản">
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-2xl animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  if (!account) {
    return (
      <PageLayout title="Chi tiết tài khoản">
        <div className="py-16 text-center text-muted-foreground">
          <Wallet size={48} className="mx-auto mb-3 text-slate-200" />
          <p>Không tìm thấy tài khoản</p>
          <button onClick={() => navigate("/accounts/asset")} className="mt-3 text-purple-600 text-sm hover:underline">
            ← Quay lại
          </button>
        </div>
      </PageLayout>
    );
  }

  const isPositive = balance >= 0;
  const isAsset = account.typeId === 1;
  const isLiability = account.typeId === 2;
  const isRevenue = account.typeId === 4;
  const isExpense = account.typeId === 5;

  return (
    <PageLayout
      title="Chi tiết tài khoản"
      subtitle="Phân tích toàn bộ luồng tiền ra vào của tài khoản"
      actions={
        <>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </button>
          <button onClick={() => setEditingAccount(account)}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="Sửa">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
            title="Xóa">
            <Trash2 size={18} />
          </button>
        </>
      }
    >
      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white mb-6 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)` }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16 pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
                {grad.label}
              </p>
              <h2 className="text-2xl font-bold leading-tight">{account.name}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Icon size={26} className="text-white" />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium mb-1">Số dư hiện tại</p>
              <p className="text-4xl font-bold tracking-tight">
                {isPositive ? "" : "-"}{fmt(Math.abs(balance))}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-semibold bg-white/15 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {account.currencyCode || "VND"}
                </span>
                {account.initialBalance !== undefined && account.initialBalance !== balance && (
                  <span className={`text-[10px] font-semibold ${balance >= account.initialBalance ? "text-green-300" : "text-red-300"}`}>
                    {balance >= account.initialBalance ? "↑" : "↓"} {fmt(Math.abs(balance - account.initialBalance))} so với ban đầu
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Mã số</p>
              <p className="text-sm font-mono tracking-widest text-white/60">
                {account.cardNumber || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date range filter */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground mr-1">Khoảng thời gian:</span>
          <div className="flex flex-wrap gap-1">
            {RANGE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setRangePreset(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  rangePreset === p.key
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted border border-transparent hover:border-border"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setRangePreset("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rangePreset === "custom"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted border border-transparent hover:border-border"
              }`}
            >
              Tùy chỉnh
            </button>
          </div>
          {rangePreset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={load}
                className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                title="Áp dụng"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Tổng thu</p>
            <ArrowUpRight size={16} className="text-green-500" />
          </div>
          <p className="text-xl font-bold text-green-600">{fmt(totalInflow)}</p>
          {txCount > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">TB {fmt(avgInflow)}/gd</p>}
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Tổng chi</p>
            <ArrowDownRight size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-500">{fmt(totalOutflow)}</p>
          {txCount > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">TB {fmt(avgOutflow)}/gd</p>}
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Chênh lệch</p>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <p className={`text-xl font-bold ${netChange >= 0 ? "text-green-600" : "text-red-500"}`}>
            {netChange >= 0 ? "+" : ""}{fmt(netChange)}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Số giao dịch</p>
            <Receipt size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{txCount}</p>
        </div>
      </div>

      {/* Daily bar chart */}
      {dailyData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Dòng tiền theo ngày</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Thu cao: <span className="font-semibold text-foreground">{fmt(maxInflow)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Chi cao: <span className="font-semibold text-foreground">{fmt(maxOutflow)}</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <RechartsTooltip content={<BarTooltip fmt={fmt} />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="inflow" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cumulative balance trend */}
      {cumulative.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Biến động số dư</p>
            <span className={`text-xs font-semibold ${netChange >= 0 ? "text-green-600" : "text-red-500"}`}>
              {netChange >= 0 ? "+" : ""}{fmt(netChange)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cumulative} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <RechartsTooltip content={<CumulativeTooltip fmt={fmt} />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1}
                label={{ value: "0", fill: "#94a3b8", fontSize: 10, position: "insideTopLeft" }} />
              <Line type="monotone" dataKey="balance" stroke={grad.from} strokeWidth={2.5}
                dot={{ r: 3, fill: grad.from, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie charts row */}
      {(sourcePie.length > 0 || destPie.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {sourcePie.length > 0 && (
            <PieCard title="Nguồn tiền đến" data={sourcePie} total={totalInflow} fmt={fmt} />
          )}
          {destPie.length > 0 && (
            <PieCard title="Tiền đi đến đâu" data={destPie} total={totalOutflow} fmt={fmt} />
          )}
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giao dịch</p>
          <span className="text-xs text-muted-foreground">{txCount} giao dịch</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-muted-foreground">
            <Receipt size={36} className="mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có giao dịch nào trong khoảng thời gian này</p>
            <p className="text-xs mt-1 text-muted-foreground">Thử chọn khoảng thời gian khác hoặc thêm giao dịch mới</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                <th className="px-4 md:px-6 py-3 font-semibold">Ngày</th>
                <th className="px-4 md:px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-4 md:px-6 py-3 font-semibold hidden md:table-cell">Đối tác</th>
                <th className="px-4 md:px-6 py-3 font-semibold hidden md:table-cell">Loại</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTx.map(t => {
                  const TxIcon = t.isTransfer ? ArrowLeftRight : t.isInflow ? ArrowUpRight : ArrowDownRight;
                  const txCls  = t.isTransfer ? "text-blue-500" : t.isInflow ? "text-green-600" : "text-red-500";
                  const amtCls = t.isTransfer ? "text-blue-600" : t.isInflow ? "text-green-600" : "text-red-500";
                  let typeLabel = "Chuyển khoản";
                  if (t.isIncome) typeLabel = "Thu nhập";
                  else if (t.isExpense) typeLabel = "Chi tiêu";
                  else if (t.isRepayment) typeLabel = "Trả nợ";
                  else if (t.isTransfer) typeLabel = "Chuyển khoản";

                  return (
                    <tr key={t.journalId} className="hover:bg-muted transition-colors">
                      <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {t.transactionDate
                          ? format(parseISO(t.transactionDate), "dd/MM/yyyy", { locale: vi })
                          : "—"}
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <TxIcon size={14} className={txCls} />
                          <span className="truncate max-w-[200px]">{t.description || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {t.counterpartyName}
                      </td>
                      <td className="px-4 md:px-6 py-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.isIncome ? "bg-green-100 text-green-700" :
                          t.isExpense ? "bg-red-100 text-red-700" :
                          t.isRepayment ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className={`px-4 md:px-6 py-3 text-sm font-bold text-right whitespace-nowrap ${amtCls}`}>
                        {t.isInflow ? "+" : "-"}{fmt(t.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          </div>
          {txTotalPages > 1 && (
            <div className="px-6 py-3 border-t border-border">
              <PaginationBar
                currentPage={txPage}
                totalPages={txTotalPages}
                totalCount={sortedTransactions.length}
                pageSize={txPageSize}
                onPageChange={(p) => { setTxPage(p); window.scrollTo({ top: document.querySelector('.overflow-x-auto')?.offsetTop - 100, behavior: 'smooth' }); }}
                onPageSizeChange={(newSize) => { setTxPageSize(newSize); setTxPage(1); }}
              />
            </div>
          )}
          </>
        )}
      </div>

      {editingAccount && (
        <EditAccountModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={handleEdit}
          account={{
            ...editingAccount,
            id: editingAccount.accountId,
          }}
          typeId={editingAccount.typeId}
        />
      )}
    </PageLayout>
  );
}
