import {
  Search,
  AlertTriangle,
  TrendingUp,
  ArrowDownRight,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Activity,
  Banknote,
  PieChart,
  Landmark,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { accountApi } from "../../../api/accountApi";
import { transactionApi } from "../../../api/transactionApi";
import { useSettings } from "../../../context/SettingsContext";
import { PageLayout } from "../../../components/layout/PageLayout";
import { AccountFormModal } from "../../../components/modals/AccountFormModal";
import { EditAccountModal } from "../../../components/modals/EditAccountModal";
import { confirmDialog } from "../../../utils/confirmDialog";
import { toast } from "sonner";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#ec4899", "#a855f7", "#f43f5e", "#fb923c", "#fdba74"];

function mapTransaction(t) {
  const details = t.details || [];
  return { ...t };
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

export function Liabilities() {
  const navigate = useNavigate();
  const { fmt } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  // Transaction history cache
  const [txCache, setTxCache] = useState({});
  const [loadingTx, setLoadingTx] = useState({});
  const [expandedCard, setExpandedCard] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await accountApi.getByType(2);
      setAccounts(data.items || data || []);
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateLiability = useCallback(async (data) => {
    try {
      await accountApi.create({ typeId: 2, ...data });
      toast.success("Đã thêm khoản nợ mới");
      setShowCreateModal(false);
      fetchAccounts();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tạo khoản nợ");
    }
  }, [fetchAccounts]);

  const handleEditLiability = useCallback(async (id, data) => {
    try {
      await accountApi.update(id, data);
      toast.success("Đã cập nhật khoản nợ");
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể cập nhật khoản nợ");
    }
  }, [fetchAccounts]);

  const handleDeleteLiability = useCallback(async (id, name) => {
    if (!await confirmDialog(`Xóa khoản nợ "${name}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      await accountApi.delete(id);
      toast.success(`Đã xóa "${name}".`);
      fetchAccounts();
    } catch (error) {
      const msg = error?.response?.data?.message;
      toast.error(msg || `Không thể xóa "${name}". Khoản nợ có thể đang được sử dụng trong giao dịch.`);
    }
  }, [fetchAccounts]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const filtered = useMemo(() => {
    let list = [...accounts];
    if (filterStatus === "active") list = list.filter(a => Math.abs(a.balance || 0) > 0);
    else if (filterStatus === "paid") list = list.filter(a => Math.abs(a.balance || 0) === 0);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    switch (sortBy) {
      case "amount-desc": list.sort((a, b) => Math.abs(b.balance || 0) - Math.abs(a.balance || 0)); break;
      case "amount-asc": list.sort((a, b) => Math.abs(a.balance || 0) - Math.abs(b.balance || 0)); break;
      case "progress": list.sort((a, b) => {
        const pA = a.initialBalance ? (1 - Math.abs(a.balance) / Math.abs(a.initialBalance)) * 100 : -1;
        const pB = b.initialBalance ? (1 - Math.abs(b.balance) / Math.abs(b.initialBalance)) * 100 : -1;
        return pA - pB;
      }); break;
      case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [accounts, filterStatus, search, sortBy]);

  const totalDebt = accounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  const totalOriginal = accounts.reduce((s, a) => s + Math.abs(a.initialBalance || 0), 0);
  // Fallback: nếu không có initialBalance, dùng balance để overall vẫn hiển thị 0%
  const totalBase = totalOriginal > 0 ? totalOriginal : totalDebt;
  const totalPaid = Math.max(0, totalBase - totalDebt);
  const overallProgress = totalBase > 0 ? (totalPaid / totalBase) * 100 : 0;
  const activeCount = accounts.filter(a => Math.abs(a.balance || 0) > 0).length;
  const paidOffCount = accounts.filter(a => Math.abs(a.balance || 0) === 0).length;

  const repayProgress = (acc) => {
    // Khi không có initialBalance, dùng balance làm gốc → progress = 0% (trung thực)
    const initBal = acc.initialBalance || acc.balance;
    if (!initBal || initBal === 0) return 0;
    return Math.min(100, Math.max(0, (1 - acc.balance / initBal) * 100));
  };

  const pieData = useMemo(() => {
    const active = accounts.filter(a => Math.abs(a.balance || 0) > 0);
    return active.map((a, i) => ({
      name: a.name,
      value: Math.abs(a.balance || 0),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [accounts]);

  const toggleExpand = useCallback(async (accountId) => {
    if (expandedCard === accountId) { setExpandedCard(null); return; }
    setExpandedCard(accountId);
    if (txCache[accountId]) return;
    setLoadingTx(prev => ({ ...prev, [accountId]: true }));
    try {
      const now = new Date();
      const data = await transactionApi.getByRangeAndAccount(
        accountId,
        startOfMonth(now).toISOString(),
        endOfMonth(now).toISOString(),
      );
      setTxCache(prev => ({ ...prev, [accountId]: (data || []).map(mapTransaction) }));
    } catch {
      setTxCache(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingTx(prev => ({ ...prev, [accountId]: false }));
    }
  }, [expandedCard, txCache]);

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
            <Banknote size={20} className="text-white" />
          </div>
          <span>Nợ phải trả</span>
        </div>
      }
      subtitle={
        <span className="ml-[52px]">Theo dõi các khoản vay, trả góp và nợ tín dụng — tổng quan tình hình tài chính</span>
      }
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">Thêm nợ</span>
        </button>
      }
    >
      {/* ════════════════════ SUMMARY CARDS ════════════════════ */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon={ArrowDownRight}
            label="Tổng dư nợ"
            value={fmt(totalDebt)}
            sublabel={`${activeCount} khoản đang vay`}
            gradient="bg-gradient-to-br from-red-600 to-red-800"
          />
          <StatCard
            icon={TrendingUp}
            label="Đã trả được"
            value={fmt(totalPaid)}
            sublabel={`${overallProgress.toFixed(1)}% tổng nợ gốc`}
          />
          <StatCard
            icon={DollarSign}
            label="Tổng nợ gốc"
            value={fmt(totalOriginal)}
            sublabel={
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-400" />
                {paidOffCount} khoản đã tất toán
              </span>
            }
          />
        </div>
      )}

      {/* ════════════════════ OVERALL PROGRESS ════════════════════ */}
      {accounts.length > 0 && (
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mb-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Activity size={15} className="text-red-500" />
              Tiến độ trả nợ tổng thể
            </h2>
            <span className="text-xl font-bold text-card-foreground">{overallProgress.toFixed(1)}%</span>
          </div>
          <>
            <div className="w-full bg-muted rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${overallProgress}%`,
                  background: `linear-gradient(90deg, #ef4444 ${Math.min(overallProgress, 50)}%, #f97316 ${Math.min(Math.max(overallProgress - 50, 0), 50)}%, #22c55e 100%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Còn nợ: <span className="text-red-500 font-bold">{fmt(totalDebt)}</span>
              </span>
              {totalOriginal > 0 && (
                <span className="font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Đã trả: <span className="text-green-600 font-bold">{fmt(totalPaid)}</span>
                </span>
              )}
            </div>
          </>
        </div>
      )}

      {/* ════════════════════ CHARTS ROW ════════════════════ */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              <PieChart size={15} className="text-red-500" />
              Cơ cấu nợ
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Phân bổ theo từng khoản vay</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                      }}
                      formatter={(value, name) => [fmt(value), name]}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-2.5">
                {pieData.map((item) => {
                  const pct = ((item.value / totalDebt) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-3 hover:bg-muted px-2 py-1.5 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-foreground font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                        <span className="text-sm font-bold text-card-foreground">{fmt(item.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Debt distribution bar chart alternative */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
              <Landmark size={15} className="text-red-500" />
              Mức độ hoàn thành
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Tiến độ trả nợ từng khoản vay</p>
            <div className="space-y-3.5">
              {accounts
                .filter(a => Math.abs(a.balance || 0) > 0)
                .sort((a, b) => repayProgress(a) - repayProgress(b))
                .slice(0, 6)
                .map(acc => {
                  const progress = repayProgress(acc);
                  const remaining = Math.abs(acc.balance);
                  return (
                    <div key={acc.accountId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-card-foreground truncate max-w-[140px]">{acc.name}</span>
                        <span className="text-xs font-medium text-muted-foreground">{fmt(remaining)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            progress >= 100 ? "bg-emerald-500" :
                            progress >= 50 ? "bg-green-500" :
                            progress >= 25 ? "bg-amber-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${Math.max(2, progress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>{progress.toFixed(0)}%</span>
                        {acc.initialBalance ? <span>{fmt(Math.abs(acc.initialBalance))}</span> : <span className="italic">Không rõ gốc</span>}
                      </div>
                    </div>
                  );
                })}
              {accounts.filter(a => Math.abs(a.balance || 0) > 0).length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <CheckCircle2 size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Tất cả các khoản đã được tất toán!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ FILTER BAR ════════════════════ */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm khoản nợ..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-card"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
              {[
                { key: "all", label: "Tất cả" },
                { key: "active", label: "Còn nợ" },
                { key: "paid", label: "Đã tất toán" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterStatus === key
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 bg-card">
              <ArrowUpDown size={14} className="text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm text-foreground bg-transparent focus:outline-none py-2.5 pr-1 cursor-pointer"
              >
                <option value="default">Mặc định</option>
                <option value="amount-desc">Số tiền ↓</option>
                <option value="amount-asc">Số tiền ↑</option>
                <option value="progress">Tiến độ</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ DEBT LIST ════════════════════ */}
      {isLoading ? (
        <div className="space-y-3 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 mb-8 bg-card rounded-2xl border border-dashed border-border">
          <CheckCircle2 size={56} className="text-green-500 mb-4" />
          <p className="text-card-foreground font-bold text-lg mb-1">
            {search || filterStatus !== "all" ? "Không tìm thấy khoản nợ phù hợp" : "Tuyệt vời, không có nợ!"}
          </p>
          <p className="text-muted-foreground text-sm">
            {search || filterStatus !== "all"
              ? "Thử lại với bộ lọc khác"
              : "Bạn đang hoàn toàn không có khoản nợ nào. Hãy giữ vững phong độ!"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/50 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h2 className="text-sm font-bold text-card-foreground">Danh sách khoản nợ</h2>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold">
                {filtered.length} khoản
              </span>
              {paidOffCount > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                  {paidOffCount} đã tất toán
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-semibold">Còn: <span className="text-red-500">{fmt(totalDebt)}</span></span>
              <span className="font-semibold">Gốc: {fmt(totalOriginal)}</span>
              {totalOriginal > 0 && (
                <span className="font-semibold">Đã trả: <span className="text-green-600">{fmt(totalPaid)}</span></span>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((acc, index) => {
              const progress = repayProgress(acc);
              const remaining = Math.abs(acc.balance);
              const original = Math.abs(acc.initialBalance);
              const isExpanded = expandedCard === acc.accountId;
              const isPaidOff = remaining === 0;
              const paidAmount = original > 0 ? Math.max(0, original - remaining) : 0;

              return (
                <div
                  key={acc.accountId}
                  className={`animate-list-item transition-colors ${isPaidOff ? "bg-muted/30" : "hover:bg-muted/30"}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* Left: Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {isPaidOff ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={10} />
                              Đã tất toán
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold">
                              <AlertTriangle size={10} />
                              Đang vay
                            </span>
                          )}
                          {original > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Vay {fmt(original)}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-bold ${isPaidOff ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                          {acc.name}
                        </h3>
                        {/* Due Date & Interest Rate */}
                        <div className="flex items-center gap-3 mt-0.5">
                          {acc.dueDate && (
                            <span className={`text-[11px] flex items-center gap-1 ${
                              new Date(acc.dueDate) < new Date() && !isPaidOff
                                ? 'text-red-500 font-semibold'
                                : 'text-muted-foreground'
                            }`}>
                              <span>📅</span>
                              Hạn: {format(new Date(acc.dueDate), "dd/MM/yyyy", { locale: vi })}
                              {new Date(acc.dueDate) < new Date() && !isPaidOff && ' ⚠️ Quá hạn'}
                            </span>
                          )}
                          {acc.interestRate != null && acc.interestRate > 0 && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span>📊</span>
                              LS: {acc.interestRate}%/năm
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        {isPaidOff ? (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kết quả</p>
                            <p className="text-sm font-bold text-emerald-600">
                              <CheckCircle2 size={12} className="inline mr-1" />
                              Đã trả xong
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Còn nợ</p>
                            <div className="flex items-center gap-1">
                              <ArrowDownRight size={14} className="text-red-400" />
                              <p className="text-lg font-bold text-card-foreground">{fmt(remaining)}</p>
                            </div>
                          </div>
                        )}
                        {!isPaidOff && original > 0 && (
                          <div className="text-right min-w-[80px] hidden sm:block">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Đã trả</p>
                            <p className="text-sm font-semibold text-green-600">{fmt(paidAmount)}</p>
                          </div>
                        )}
                        {!isPaidOff && (
                          <div className="min-w-[100px]">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  progress >= 100 ? "bg-emerald-500" :
                                  progress >= 50 ? "bg-green-500" :
                                  progress >= 25 ? "bg-amber-500" :
                                  "bg-red-500"
                                }`}
                                style={{ width: `${Math.max(2, progress)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/accounts/${acc.accountId}/detail`)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 transition-colors border border-border"
                          title="Phân tích"
                        >
                          <Activity size={13} />
                        </button>
                        <button
                          onClick={() => setEditingAccount(acc)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
                          title="Sửa"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteLiability(acc.accountId, acc.name)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors border border-border"
                          title="Xóa"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          onClick={() => toggleExpand(acc.accountId)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                            isPaidOff
                              ? "border-border text-muted-foreground hover:bg-muted"
                              : "border-border text-card-foreground hover:bg-muted"
                          }`}
                        >
                          {loadingTx[acc.accountId] ? (
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {loadingTx[acc.accountId] ? "Đang tải..." : "Giao dịch"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded transaction history */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Activity size={11} />
                          Giao dịch gần đây (tháng này)
                        </p>
                        {loadingTx[acc.accountId] ? (
                          <div className="space-y-2">
                            {[1, 2].map(i => (
                              <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                            ))}
                          </div>
                        ) : (txCache[acc.accountId] || []).length === 0 ? (
                          <div className="text-center py-4 bg-muted/30 rounded-xl">
                            <Activity size={20} className="mx-auto mb-1 opacity-30 text-muted-foreground" />
                            <p className="text-muted-foreground text-xs">Chưa có giao dịch trong tháng này</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {(txCache[acc.accountId] || []).slice(0, 5).map(tx => (
                              <div
                                key={tx.journalId}
                                className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-2.5 hover:bg-muted transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-card-foreground truncate font-medium">
                                    {tx.description || "Trả nợ"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {format(new Date(tx.transactionDate), "dd/MM/yyyy", { locale: vi })}
                                  </p>
                                </div>
                                <span className="text-sm font-bold text-green-600 shrink-0 ml-3 flex items-center gap-1">
                                  <ArrowUpRight size={12} />
                                  {fmt(tx.totalAmount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {activeCount} khoản chưa tất toán
              {totalOriginal > 0 && ` • ${overallProgress.toFixed(0)}% tổng nợ gốc đã trả`}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {accounts.length === filtered.length
                ? `${accounts.length} khoản nợ`
                : `Hiển thị ${filtered.length}/${accounts.length} khoản`}
            </p>
          </div>
        </div>
      )}
      {/* ════════════════════ CREATE LIABILITY MODAL ════════════════════ */}
      <AccountFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateLiability}
        account={null}
        typeId={2}
      />

      {/* ════════════════════ EDIT LIABILITY MODAL ════════════════════ */}
      {editingAccount && (
        <EditAccountModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSubmit={(data) => handleEditLiability(editingAccount.accountId, data)}
          account={{
            ...editingAccount,
            id: editingAccount.accountId,
            typeId: 2,
          }}
          typeId={2}
        />
      )}
    </PageLayout>
  );
}
