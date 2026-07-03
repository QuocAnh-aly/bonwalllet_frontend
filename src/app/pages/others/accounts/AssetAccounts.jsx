import {
  Landmark,
  Wallet as WalletIcon,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Copy,
  Check,
  Search,
  SortAsc,
  RefreshCw,
  Users,
  PiggyBank,
  Eye,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  Plus,
  Pencil,
  Trash2,
  Smartphone,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { accountApi } from "../../../api/accountApi";
import { transactionApi } from "../../../api/transactionApi";
import { useSettings } from "../../../context/SettingsContext";
import PaginationBar from "../../../components/ui/navigation/PaginationBar";
import { PageLayout } from "../../../components/layout/PageLayout";
import { AccountFormModal } from "../../../components/modals/AccountFormModal";
import { EditAccountModal } from "../../../components/modals/EditAccountModal";
import { DeleteWalletModal } from "../../../components/modals/DeleteWalletModal";

function mapTransaction(t) {
  const details = t.details || [];
  const expenseDetail = details.find((d) => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find((d) => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome = !!revenueDetail;
  let categoryName = "Chưa phân loại";
  if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail) categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer) categoryName = "Chuyển khoản";
  return { ...t, categoryName, isIncome, isTransfer };
}

const iconMap = {
  Landmark,
  WalletIcon,
  CreditCard,
  TrendingUp,
  Users,
  PiggyBank,
  Smartphone,
  Wallet: WalletIcon,
};

const PIE_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316",
  "#ec4899", "#10b981", "#f59e0b", "#6366f1",
  "#ef4444", "#14b8a6",
];
const fallbackGradients = [
  { from: "#3b82f6", to: "#1d4ed8" },
  { from: "#22c55e", to: "#15803d" },
  { from: "#a855f7", to: "#7e22ce" },
  { from: "#f97316", to: "#c2410c" },
  { from: "#10b981", to: "#047857" },
  { from: "#64748b", to: "#475569" },
];

function mapAccount(acc, index) {
  const grad =
    acc.gradientFrom && acc.gradientTo
      ? { from: acc.gradientFrom, to: acc.gradientTo }
      : fallbackGradients[index % fallbackGradients.length];
  return {
    id: acc.accountId,
    name: acc.name,
    type: acc.typeName || "Tài sản",
    typeId: acc.typeId,
    balance: acc.balance ?? 0,
    initialBalance: acc.initialBalance ?? 0,
    icon: iconMap[acc.iconName] || Landmark,
    iconName: acc.iconName || "Landmark",
    color: acc.color || "blue",
    gradientFrom: grad.from,
    gradientTo: grad.to,
    cardNumber: acc.cardNumber || "",
    currencyCode: acc.currencyCode || "VND",
    isActive: acc.isActive,
    isSavingsWallet: acc.isSavingsWallet ?? false,
    createdAt: acc.createdAt,
  };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-white/20 transition-colors"
      title="Sao chép"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, sublabelColor = "text-muted-foreground", gradient, onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-6 ${gradient ? gradient : "bg-card border border-border"} ${onClick ? "cursor-pointer hover:shadow-lg transition-all" : ""}`}
    >
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
        <p className={`text-sm mt-1 ${sublabelColor} ${gradient ? "text-white/70" : ""}`}>
          {sublabel}
        </p>
      </div>
    </Comp>
  );
}

export function AssetAccounts() {
  const navigate = useNavigate();
  const { fmt, fmtShort } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({ totalAssets: 0, totalLiabilities: 0, totalSavings: 0, netWorth: 0 });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [recentTxs, setRecentTxs] = useState([]);
  const [txWalletFilter, setTxWalletFilter] = useState("all");
  const [selectedAccountName, setSelectedAccountName] = useState(null);
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);
  const [displayAccounts, setDisplayAccounts] = useState([]);
  const [accountTotalCount, setAccountTotalCount] = useState(0);
  const [accountTotalPages, setAccountTotalPages] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txTotalCount, setTxTotalCount] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  // Range selection: { start: { monthIndex, year, label }, end: { ... } } | null
  // Click = set single month; Shift+click = extend range
  const [selectedRange, setSelectedRange] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);

  const fetchWallets = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      const data = await accountApi.getSummary({
        page: accountPage,
        pageSize: accountPageSize,
        search: search || undefined,
        sortBy: sortBy !== 'default' ? sortBy : undefined
      });
      setSummary({
        totalAssets: data.totalAssets ?? 0,
        totalLiabilities: data.totalLiabilities ?? 0,
        totalSavings: data.totalSavings ?? 0,
        netWorth: data.netWorth ?? 0,
      });
      const allMapped = (data.allAccounts || []).map(mapAccount);
      setAccounts(allMapped);
      const paginatedMapped = (data.accounts || []).map(mapAccount);
      setDisplayAccounts(paginatedMapped);
      setAccountTotalCount(data.totalCount ?? 0);
      setAccountTotalPages(data.totalPages ?? 1);
      setBalanceHistory(buildBalanceHistory(allMapped));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu ví:", error);
      toast.error("Không thể tải dữ liệu ví");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accountPage, accountPageSize, search, sortBy]);

  useEffect(() => { setAccountPage(1); }, [search, sortBy]);

  const fetchTransactions = useCallback(async () => {
    try {
      const txData = await transactionApi.getAll({ page: txPage, pageSize: txPageSize });
      const txItems = (txData.items || txData || []).map(mapTransaction);
      setRecentTxs(txItems);
      setTxTotalCount(txData.totalCount ?? txItems.length);
      setTxTotalPages(txData.totalPages ?? 1);
    } catch { /* silent */ }
  }, [txPage, txPageSize]);

  const handleCreateAsset = useCallback(async (data) => {
    try {
      await accountApi.create(data);
      toast.success("Đã thêm tài sản mới");
      setShowCreateModal(false);
      fetchWallets();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tạo tài sản");
    }
  }, [fetchWallets]);

  const handleEditAsset = useCallback(async (id, data) => {
    try {
      await accountApi.update(id, data);
      toast.success("Đã cập nhật tài sản");
      setEditingAccount(null);
      fetchWallets();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật tài sản");
    }
  }, [fetchWallets]);

  const handleDeleteAsset = useCallback((account) => {
    setDeletingAccount(account);
  }, []);

  const handleConfirmDelete = useCallback(async (opts) => {
    if (!deletingAccount) return;
    try {
      await accountApi.delete(deletingAccount.id, opts);
      toast.success(`Đã xóa "${deletingAccount.name}".`);
      setDeletingAccount(null);
      fetchWallets();
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(msg || `Không thể xóa "${deletingAccount.name}".`);
      throw error; // giữ modal mở khi lỗi
    }
  }, [deletingAccount, fetchWallets]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  function buildBalanceHistory(accs) {
    const months = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
    const now = new Date();
    const total = accs.reduce((s, a) => s + Math.max(0, a.balance), 0);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ratio = (i + 1) / 6;
      return {
        month: months[d.getMonth()],
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        balance: Math.round(total * ratio),
      };
    });
  }

  const totalAssets = summary.totalAssets + summary.totalSavings;

  const pieData = useMemo(() =>
    accounts.filter((a) => a.typeId === 1 && a.balance > 0).map((a) => ({ id: a.id, name: a.name, value: a.balance })),
    [accounts]
  );
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const chartData = useMemo(() => {
    return balanceHistory.map((point) => ({
      ...point,
      txCount: recentTxs.filter((t) => {
        const d = new Date(t.transactionDate);
        return d.getMonth() === point.monthIndex && d.getFullYear() === point.year;
      }).length,
    }));
  }, [balanceHistory, recentTxs]);

  const assetCount = accounts.filter(a => a.typeId === 1 && a.balance > 0).length;
  const positiveAccounts = accounts.filter((a) => a.balance > 0);

  // Which asset accounts have transactions in the selected range?
  const activeInRange = useMemo(() => {
    if (!selectedRange) return null; // null = don't dim anything
    const sIdx = selectedRange.start.monthIndex + selectedRange.start.year * 12;
    const eIdx = selectedRange.end.monthIndex + selectedRange.end.year * 12;
    const min = Math.min(sIdx, eIdx);
    const max = Math.max(sIdx, eIdx);
    const activeSet = new Set();
    for (const tx of recentTxs) {
      const d = new Date(tx.transactionDate);
      const txIdx = d.getMonth() + d.getFullYear() * 12;
      if (txIdx >= min && txIdx <= max) {
        for (const detail of (tx.details || [])) {
          activeSet.add(String(detail.accountId));
        }
      }
    }
    return activeSet;
  }, [selectedRange, recentTxs]);

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tx-row-enter {
          animation: fadeSlideIn 0.35s ease-out both;
        }
        .tx-row-enter:nth-child(1) { animation-delay: 0ms; }
        .tx-row-enter:nth-child(2) { animation-delay: 30ms; }
        .tx-row-enter:nth-child(3) { animation-delay: 60ms; }
        .tx-row-enter:nth-child(4) { animation-delay: 90ms; }
        .tx-row-enter:nth-child(5) { animation-delay: 120ms; }
        .tx-row-enter:nth-child(6) { animation-delay: 150ms; }
        .tx-row-enter:nth-child(7) { animation-delay: 180ms; }
        .tx-row-enter:nth-child(8) { animation-delay: 210ms; }
        .tx-row-enter:nth-child(9) { animation-delay: 240ms; }
        .tx-row-enter:nth-child(10) { animation-delay: 270ms; }
        .tx-filter-badge {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md">
            <WalletIcon size={20} className="text-white" />
          </div>
          <span>Quản lý ví & Tài sản</span>
        </div>
      }
      subtitle={
        <span className="ml-[52px]">Tổng quan tài chính cá nhân — theo dõi tài sản, số dư và biến động</span>
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Thêm tài sản</span>
          </button>
          <button
            onClick={() => fetchWallets(true)}
            disabled={isRefreshing}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      {/* ════════════════════ SUMMARY CARDS ════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon={TrendingUp}
          label="Giá trị ròng"
          value={fmt(summary.netWorth)}
          sublabel={`${accounts.length} tài khoản`}
          gradient="bg-gradient-to-br from-purple-600 to-purple-800"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Tổng tài sản"
          value={fmt(totalAssets)}
          sublabel={`${assetCount} tài khoản dương`}
          sublabelColor="text-green-600"
        />
        <StatCard
          icon={ArrowDownRight}
          label="Nợ"
          value={fmt(summary.totalLiabilities)}
          sublabel={`${accounts.filter((a) => a.balance < 0).length} tài khoản nợ`}
          sublabelColor="text-red-500"
          onClick={() => navigate("/accounts/liabilities")}
        />
      </div>

      {/* ════════════════════ CHARTS ROW ════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Balance Trend */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-base font-bold text-card-foreground mb-1 flex items-center gap-2">
            <Activity size={18} className="text-purple-500" />
            Xu hướng số dư
          </h2>
          <p className="text-xs text-muted-foreground mb-5">Biến động tài sản 6 tháng gần nhất</p>
          <ResponsiveContainer width="100%" height={240}>              <AreaChart
                data={chartData}
                onMouseMove={(state) => {
                  if (state?.activePayload) {
                    setHoveredMonth(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredMonth(null)}
              >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} tickFormatter={fmtShort} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
                formatter={(val, name, props) => [fmt(val), "Số dư"]}
                labelFormatter={(label, payload) => {
                  if (!payload || !payload.length) return label;
                  const p = payload[0].payload;
                  return `${label}  ·  ${p.txCount} giao dịch`;
                }}
              />
              <Area
                key={`area-${selectedRange ? `${selectedRange.start.monthIndex}-${selectedRange.start.year}-${selectedRange.end.monthIndex}-${selectedRange.end.year}` : 'all'}`}
                type="monotone"
                dataKey="balance"
                stroke="#9333ea"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorBalance)"
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload) return null;
                  const idx = payload.monthIndex + payload.year * 12;
                  const startIdx = selectedRange ? selectedRange.start.monthIndex + selectedRange.start.year * 12 : -1;
                  const endIdx   = selectedRange ? selectedRange.end.monthIndex   + selectedRange.end.year   * 12 : -1;
                  const inRange = selectedRange && idx >= Math.min(startIdx, endIdx) && idx <= Math.max(startIdx, endIdx);
                  const isStart = selectedRange && idx === startIdx;
                  const isEnd   = selectedRange && idx === endIdx;
                  return (
                    <circle
                      key={`dot-${payload.year}-${payload.monthIndex}`}
                      cx={cx}
                      cy={cy}
                      r={isStart || isEnd ? 9 : inRange ? 7 : 4}
                      fill={isStart || isEnd ? "#a855f7" : inRange ? "#c084fc" : "#9333ea"}
                      stroke={isStart || isEnd ? "#d8b4fe" : inRange ? "#e9d5ff" : "#fff"}
                      strokeWidth={isStart || isEnd ? 3 : inRange ? 2.5 : 2}
                      style={{ cursor: "pointer", transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                      onClick={(e) => {
                        const clicked = { monthIndex: payload.monthIndex, year: payload.year, label: payload.month };
                        if (e.shiftKey && selectedRange) {
                          // Shift+click: extend range to clicked month
                          setSelectedRange({ start: selectedRange.start, end: clicked });
                        } else if (
                          selectedRange &&
                          idx === Math.min(startIdx, endIdx) &&
                          idx === Math.max(startIdx, endIdx)
                        ) {
                          // Click on single selected month → clear
                          setSelectedRange(null);
                        } else if (selectedRange) {
                          // Already have a range, re-start fresh
                          setSelectedRange({ start: clicked, end: clicked });
                        } else {
                          // First selection
                          setSelectedRange({ start: clicked, end: clicked });
                        }
                      }}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* ═══ Hover Summary Bar ═══ */}
          {(() => {
            const point = hoveredMonth || chartData[chartData.length - 1];
            if (!point) return null;
            const idx = chartData.findIndex(
              (d) => d.monthIndex === point.monthIndex && d.year === point.year
            );
            const prevBalance = idx > 0 ? chartData[idx - 1].balance : point.balance;
            const netChange = point.balance - prevBalance;
            const netPct = prevBalance !== 0 ? ((netChange / prevBalance) * 100) : 0;
            const isPositive = netChange > 0;
            const isNegative = netChange < 0;
            return (
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-card-foreground">
                    {point.month} {point.year}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-card-foreground">{point.txCount || 0}</span> giao dịch
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-purple-500" />
                    <span className="font-semibold text-card-foreground">{fmt(point.balance)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-semibold ${isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
                    {isPositive ? (
                      <ArrowUpRight size={14} />
                    ) : isNegative ? (
                      <ArrowDownRight size={14} />
                    ) : (
                      <Activity size={14} className="rotate-90" />
                    )}
                    <span>{isPositive ? "+" : isNegative ? "" : "±"}{fmt(Math.abs(netChange))}</span>
                    <span className="text-xs opacity-60">
                      ({netPct >= 0 ? "+" : ""}{netPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Asset Breakdown Pie */}
        {pieData.length > 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-base font-bold text-card-foreground mb-1 flex items-center gap-2">
              <PieChart size={18} className="text-purple-500" />
              Cơ cấu tài sản
            </h2>
            <p className="text-xs text-muted-foreground mb-2">Phân bổ theo từng tài khoản</p>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={210}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    activeIndex={txWalletFilter !== "all" ? pieData.findIndex(d => String(d.id) === txWalletFilter) : undefined}
                    activeShape={{ outerRadius: 105, stroke: "#fff", strokeWidth: 3 }}
                    onClick={(entry) => {
                      const idStr = String(entry.id);
                      if (txWalletFilter === idStr) {
                        setTxWalletFilter("all");
                        setSelectedAccountName(null);
                      } else {
                        setTxWalletFilter(idStr);
                        setSelectedAccountName(entry.name);
                      }
                    }}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={entry.id || i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                    }}
                    formatter={(val, name) => [fmt(val), name]}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2 max-h-[170px] overflow-y-auto scrollbar-thin">
              {pieData.map((d, i) => {
                const isActive = String(d.id) === txWalletFilter && txWalletFilter !== "all";
                const hasRangeActivity = !activeInRange || activeInRange.has(String(d.id));
                const dimmed = selectedRange && !hasRangeActivity && !isActive;
                return (
                <div
                  key={d.name}
                  onClick={() => {
                    const idStr = String(d.id);
                    if (txWalletFilter === idStr) {
                      setTxWalletFilter("all");
                      setSelectedAccountName(null);
                    } else {
                      setTxWalletFilter(idStr);
                      setSelectedAccountName(d.name);
                    }
                  }}
                  className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${isActive ? "bg-purple-100 dark:bg-purple-900/30 ring-1 ring-purple-300 dark:ring-purple-600" : "hover:bg-muted"} ${dimmed ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${dimmed ? "grayscale" : ""}`} style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className={`truncate transition-all duration-300 ${dimmed ? "text-muted-foreground/50" : isActive ? "text-purple-700 dark:text-purple-300 font-semibold" : "text-muted-foreground"}`}>
                      {d.name}
                      {dimmed && <span className="ml-1.5 text-[10px] opacity-60">(không có giao dịch)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`transition-all duration-300 ${dimmed ? "text-muted-foreground/50" : "text-muted-foreground"}`}>{pieTotal > 0 ? ((d.value / pieTotal) * 100).toFixed(1) : 0}%</span>
                    <span className={`font-semibold transition-all duration-300 ${dimmed ? "text-foreground/50" : "text-foreground"}`}>{fmtShort(d.value)}</span>
                  </div>
                </div>
              );})}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6 border border-border flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <BarChart3 size={36} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có dữ liệu tài sản</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════ BALANCE DISTRIBUTION ════════════════════ */}
      {positiveAccounts.length > 1 && totalAssets > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
            <Percent size={15} className="text-purple-500" />
            Phân bổ số dư
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Tỉ lệ tài sản giữa các tài khoản</p>
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4 shadow-inner">
            {positiveAccounts.map((a, i) => (
              <div
                key={a.id}
                className="h-full rounded-full transition-all duration-300 hover:opacity-80"
                style={{
                  width: `${(a.balance / totalAssets) * 100}%`,
                  background: `linear-gradient(90deg, ${a.gradientFrom}, ${a.gradientTo})`,
                  minWidth: "6px",
                }}
                title={`${a.name}: ${fmt(a.balance)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {positiveAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ background: a.gradientFrom }} />
                <span className="font-medium text-foreground">{a.name}</span>
                <span className="opacity-60">{((a.balance / totalAssets) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════ SEARCH & SORT ════════════════════ */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài khoản..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
            />
          </div>
          <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 bg-card w-full sm:w-auto">
            <SortAsc size={15} className="text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm text-foreground bg-transparent focus:outline-none py-2.5 pr-1 cursor-pointer"
            >
              <option value="default">Mặc định</option>
              <option value="balance-desc">Số dư (Cao → Thấp)</option>
              <option value="balance-asc">Số dư (Thấp → Cao)</option>
              <option value="name">Tên A→Z</option>
            </select>
          </div>
        </div>
      )}

      {/* ════════════════════ ACCOUNT CARDS ════════════════════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 mb-8 bg-card rounded-2xl border border-dashed border-border">
          <WalletIcon size={56} className="text-muted-foreground mb-4 opacity-30" />
          <p className="text-muted-foreground font-medium text-lg">
            {search ? "Không tìm thấy tài khoản phù hợp" : "Chưa có tài khoản"}
          </p>
          {!search && (
            <p className="text-muted-foreground text-sm mt-1">Thêm tài khoản từ trang giao dịch để bắt đầu theo dõi</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            {displayAccounts.map((account) => {
              const Icon = account.icon;
              const isPositive = account.balance >= 0;
              return (
                <div
                  key={account.id}
                  onClick={() => navigate(`/accounts/${account.id}/detail`)}
                  className="relative overflow-hidden rounded-2xl p-6 text-white group shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${account.gradientFrom} 0%, ${account.gradientTo} 100%)`,
                  }}
                >
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-white opacity-[0.02] rounded-full pointer-events-none" />

                  <div className="relative">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
                          {account.type}
                        </p>
                        <h3 className="text-xl font-bold leading-tight">{account.name}</h3>
                      </div>
                      <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                        <Icon size={24} className="text-white" />
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mb-4">
                      <p className="text-white/60 text-xs mb-1 font-medium">Số dư hiện tại</p>
                      <p className="text-3xl font-bold tracking-tight">
                        {isPositive ? "" : "-"}
                        {fmt(Math.abs(account.balance))}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-semibold bg-white/15 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {account.currencyCode}
                        </span>
                        {account.initialBalance !== undefined && account.initialBalance !== account.balance && (
                          <span className={`text-[10px] font-semibold ${account.balance >= account.initialBalance ? "text-green-300" : "text-red-300"}`}>
                            {account.balance >= account.initialBalance ? "+" : "-"}
                            {fmt(Math.abs(account.balance - account.initialBalance))} so với ban đầu
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card number + badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm tracking-widest text-white/60 font-mono">
                          {account.cardNumber || "—"}
                        </span>
                        {account.cardNumber && <CopyButton text={account.cardNumber} />}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/accounts/${account.id}/detail`);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-all backdrop-blur-sm"
                          title="Phân tích"
                        >
                          <Activity size={13} />
                        </button>
                        {account.isSavingsWallet ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/piggy-banks");
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 text-[11px] font-semibold transition-all backdrop-blur-sm"
                            title="Quản lý ở trang Lợn tiết kiệm"
                          >
                            <PiggyBank size={13} /> Lợn tiết kiệm
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAccount(account);
                              }}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-all backdrop-blur-sm"
                              title="Sửa"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAsset(account);
                              }}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-400/40 text-white/70 hover:text-red-200 transition-all backdrop-blur-sm"
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                            isPositive ? "bg-white/20 text-white" : "bg-black/20 text-white/80"
                          }`}
                        >
                          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {isPositive ? "Tài sản" : "Nợ"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {accountTotalPages > 1 && (
            <div className="mb-8">
              <PaginationBar
                currentPage={accountPage}
                totalPages={accountTotalPages}
                totalCount={accountTotalCount}
                pageSize={accountPageSize}
                onPageChange={(p) => { setAccountPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onPageSizeChange={(newSize) => { setAccountPageSize(newSize); setAccountPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* ════════════════════ ACCOUNT DETAILS TABLE ════════════════════ */}
      {accounts.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border bg-muted/50 flex items-center gap-2">
            <Eye size={16} className="text-purple-500" />
            <h2 className="text-sm font-bold text-card-foreground">Chi tiết tài khoản</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Tên tài khoản</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Loại</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold text-center whitespace-nowrap">Tiền tệ</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Số dư ban đầu</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Số dư hiện tại</th>
                  <th className="px-4 sm:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Thay đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((acc) => {
                  const diff = acc.balance - acc.initialBalance;
                  const diffPct = acc.initialBalance !== 0 ? ((diff / acc.initialBalance) * 100).toFixed(1) : null;
                  return (
                    <tr key={acc.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${acc.gradientFrom}, ${acc.gradientTo})` }}
                          >
                            <acc.icon size={16} />
                          </div>
                          <span className="font-semibold text-card-foreground">{acc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">{acc.type}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 rounded-full text-xs font-semibold">{acc.currencyCode}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right text-muted-foreground font-medium whitespace-nowrap">{fmt(acc.initialBalance)}</td>
                      <td className="px-4 sm:px-6 py-4 text-right font-bold text-card-foreground whitespace-nowrap">{fmt(acc.balance)}</td>
                      <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold text-sm ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {diff >= 0 ? "+" : "-"}{fmt(Math.abs(diff))}
                            {diffPct !== null && (
                              <span className="text-xs font-normal ml-1 opacity-60">({diffPct}%)</span>
                            )}
                          </span>
                          {acc.isSavingsWallet ? (
                            <button
                              onClick={() => navigate("/piggy-banks")}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-purple-600 hover:bg-purple-50 text-xs font-semibold transition-colors opacity-0 group-hover:opacity-100"
                              title="Quản lý ở trang Lợn tiết kiệm"
                            >
                              <PiggyBank size={13} /> Lợn tiết kiệm
                            </button>
                          ) : (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingAccount(acc)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Sửa"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteAsset(acc)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════ RECENT TRANSACTIONS ════════════════════ */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity size={16} className="text-purple-500" />
            <h2 className="text-sm font-bold text-card-foreground">Lịch sử giao dịch gần nhất</h2>
            {/* Combined filter badges */}
            {selectedRange && selectedAccountName && (
              <button
                onClick={() => {
                  setSelectedRange(null);
                  setTxWalletFilter("all");
                  setSelectedAccountName(null);
                }}
                className="tx-filter-badge inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-100 to-rose-100 dark:from-purple-900/40 dark:to-rose-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold hover:from-purple-200 hover:to-rose-200 dark:hover:from-purple-900/60 dark:hover:to-rose-900/60 shrink-0 ring-1 ring-purple-300/50 dark:ring-purple-600/50"
              >
                {(() => {
                  const s = selectedRange.start;
                  const e = selectedRange.end;
                  const sIdx = s.monthIndex + s.year * 12;
                  const eIdx = e.monthIndex + e.year * 12;
                  const rangeLabel = sIdx === eIdx
                    ? `${s.label} ${s.year}`
                    : `${s.label} ${s.year} → ${e.label} ${e.year}`;
                  return <span>Tài khoản: {selectedAccountName} · {rangeLabel}</span>;
                })()}
                <span className="ml-2 text-purple-500 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-200">&times;</span>
              </button>
            )}
            {selectedRange && !selectedAccountName && (
              <button
                onClick={() => setSelectedRange(null)}
                className="tx-filter-badge inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/60 shrink-0"
              >
                {(() => {
                  const s = selectedRange.start;
                  const e = selectedRange.end;
                  const sIdx = s.monthIndex + s.year * 12;
                  const eIdx = e.monthIndex + e.year * 12;
                  if (sIdx === eIdx) {
                    return <span>Tháng: {s.label} {s.year}</span>;
                  }
                  const first = sIdx < eIdx ? s : e;
                  const last  = sIdx < eIdx ? e : s;
                  return <span>Tháng {first.label} {first.year} → {last.label} {last.year}</span>;
                })()}
                <span className="ml-1 text-purple-500 hover:text-purple-700">&times;</span>
              </button>
            )}
            {selectedAccountName && !selectedRange && (
              <button
                onClick={() => {
                  setTxWalletFilter("all");
                  setSelectedAccountName(null);
                }}
                className="tx-filter-badge inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-semibold hover:bg-rose-200 dark:hover:bg-rose-900/60 shrink-0"
              >
                <span>Tài khoản: {selectedAccountName}</span>
                <span className="ml-1 text-rose-500 hover:text-rose-700">&times;</span>
              </button>
            )}
          </div>
          <select
            value={txWalletFilter}
            onChange={(e) => setTxWalletFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card cursor-pointer"
          >
            <option value="all">Tất cả ví</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
                <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Mô tả</th>
                <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Danh mục</th>
                <th className="px-4 sm:px-6 py-3.5 font-semibold whitespace-nowrap">Ngày</th>
                <th className="px-4 sm:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTxs
                .filter((t) => {
                  if (txWalletFilter !== "all") {
                    const matchesWallet = (t.details || []).some((d) => String(d.accountId) === txWalletFilter);
                    if (!matchesWallet) return false;
                  }
                  if (selectedRange) {
                    const d = new Date(t.transactionDate);
                    const txIdx = d.getMonth() + d.getFullYear() * 12;
                    const sIdx = selectedRange.start.monthIndex + selectedRange.start.year * 12;
                    const eIdx = selectedRange.end.monthIndex + selectedRange.end.year * 12;
                    const min = Math.min(sIdx, eIdx);
                    const max = Math.max(sIdx, eIdx);
                    if (txIdx < min || txIdx > max) return false;
                  }
                  return true;
                })
                .map((t) => {
                  const iconBg = t.isTransfer ? "bg-blue-500/10" : t.isIncome ? "bg-green-500/15" : "bg-red-500/10";
                  const TxIcon = t.isTransfer ? ArrowLeftRight : t.isIncome ? ArrowUpRight : ArrowDownRight;
                  const iconCls = t.isTransfer ? "text-blue-500" : t.isIncome ? "text-green-600" : "text-red-500";
                  const amtCls = t.isTransfer ? "text-blue-600" : t.isIncome ? "text-green-600" : "text-card-foreground";
                  const prefix = t.isIncome ? "+" : t.isTransfer ? "" : "-";
                  return (
                    <tr key={`${t.journalId}-${selectedRange ? `${selectedRange.start.monthIndex}-${selectedRange.end.monthIndex}` : 'all'}`} className="tx-row-enter hover:bg-muted/50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                            <TxIcon size={14} className={iconCls} />
                          </div>
                          <span className="font-medium text-card-foreground text-sm truncate max-w-[160px] sm:max-w-none">
                            {t.description || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">{t.categoryName}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-muted-foreground text-sm whitespace-nowrap">
                        {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className={`px-4 sm:px-6 py-3.5 text-right font-bold text-sm ${amtCls} whitespace-nowrap`}>
                        {prefix}{fmt(Math.abs(t.totalAmount))}
                      </td>
                    </tr>
                  );
                })}
              {recentTxs.filter((t) => {
                if (txWalletFilter !== "all") {
                  const matchesWallet = (t.details || []).some((d) => String(d.accountId) === txWalletFilter);
                  if (!matchesWallet) return false;
                }
                if (selectedRange) {
                  const d = new Date(t.transactionDate);
                  const txIdx = d.getMonth() + d.getFullYear() * 12;
                  const sIdx = selectedRange.start.monthIndex + selectedRange.start.year * 12;
                  const eIdx = selectedRange.end.monthIndex + selectedRange.end.year * 12;
                  const min = Math.min(sIdx, eIdx);
                  const max = Math.max(sIdx, eIdx);
                  if (txIdx < min || txIdx > max) return false;
                }
                return true;
              }).length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-muted-foreground text-sm">
                    <Activity size={24} className="mx-auto mb-2 opacity-30" />
                    {selectedAccountName && selectedRange ? (
                      <p>Không có giao dịch cho <span className="font-semibold text-foreground">{selectedAccountName}</span> trong khoảng thời gian đã chọn</p>
                    ) : selectedAccountName ? (
                      <p>Không có giao dịch cho <span className="font-semibold text-foreground">{selectedAccountName}</span></p>
                    ) : selectedRange ? (
                      <p>Không có giao dịch trong khoảng thời gian đã chọn</p>
                    ) : (
                      <p>Không có giao dịch nào</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions pagination */}
        {txTotalPages > 1 && (
          <div className="px-6 py-3 border-t border-border">
            <PaginationBar
              currentPage={txPage}
              totalPages={txTotalPages}
              totalCount={txTotalCount}
              pageSize={txPageSize}
              onPageChange={(p) => setTxPage(p)}
              onPageSizeChange={(newSize) => { setTxPageSize(newSize); setTxPage(1); }}
            />
          </div>
        )}
      </div>

      {/* ════════════════════ CREATE ASSET MODAL ════════════════════ */}
      <AccountFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAsset}
        account={null}
        typeId={1}
      />

      {/* ════════════════════ DELETE WALLET MODAL ════════════════════ */}
      <DeleteWalletModal
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleConfirmDelete}
        account={deletingAccount}
        targets={accounts.filter((a) => a.typeId === 1)}
      />

      {/* ════════════════════ EDIT ASSET MODAL ════════════════════ */}
      {editingAccount && (
        <EditAccountModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={(data) => handleEditAsset(editingAccount.id, data)}
          account={editingAccount}
          typeId={editingAccount.typeId}
        />
      )}
    </PageLayout>
    </>
  );
}
