import {
  useState, useEffect, useCallback, useMemo, Fragment, useRef,
} from "react";
import {
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, HandCoins,
  Search, Plus, Trash2, Pencil, RefreshCw, TrendingUp,
} from "lucide-react";
import {
  format, startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subMonths, parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import { AddTransactionModal } from "../../components/modals/AddTransactionModal";
import { EditTransactionModal } from "../../components/modals/EditTransactionModal";
import { TransactionDetailModal } from "../../components/modals/TransactionDetailModal";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";
import { confirmDialog } from "../../utils/confirmDialog";


// typeId: 1=Assets, 2=Liabilities, 4=Revenue, 5=Expense
// Source = credit side, Destination = debit side (Firefly III model)
function mapTransaction(t) {
  const details       = t.details || [];
  const debitDetail   = details.find(d => d.debit  > 0);
  const creditDetail  = details.find(d => d.credit > 0);
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit  > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const repaymentDetail = details.find(d => d.typeId === 2 && d.debit > 0);
  const isRepayment   = !!repaymentDetail && !expenseDetail && !revenueDetail;
  const isTransfer    = !expenseDetail && !revenueDetail && !isRepayment;
  const isIncome      = !!revenueDetail;
  let categoryName    = "Chưa phân loại";
  if (isRepayment)        categoryName = repaymentDetail?.accountName || "Trả nợ";
  else if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail) categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer)    categoryName = "Chuyển khoản";
  return {
    ...t,
    categoryName,
    isIncome,
    isRepayment,
    isTransfer,
    sourceAccount: creditDetail?.accountName || "—",
    destAccount:   debitDetail?.accountName  || "—",
  };
}

const PRESETS = [
  { key: "today",     label: "Hôm nay"     },
  { key: "week",      label: "Tuần này"    },
  { key: "month",     label: "Tháng này"   },
  { key: "lastMonth", label: "Tháng trước" },
  { key: "all",       label: "Tất cả"      },
];

function getPresetRange(key) {
  const now = new Date();
  switch (key) {
    case "today":     return { from: startOfDay(now),             to: endOfDay(now)             };
    case "week":      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":     return { from: startOfMonth(now),           to: endOfMonth(now)           };
    case "lastMonth": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    default:          return { from: null, to: null };
  }
}

import { PageLayout } from "../../components/layout/PageLayout";

export function Transactions() {
  const { fmt } = useSettings();
  const { addNotification } = useNotifications();

  const [transactions,    setTransactions]    = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [filterType,      setFilterType]      = useState("all");
  const [page,            setPage]            = useState(1);
  const [totalCount,      setTotalCount]      = useState(0);
  const [cashFlow,        setCashFlow]        = useState({ totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
  const [preset,          setPreset]          = useState("month");
  const [customFrom,      setCustomFrom]      = useState("");
  const [customTo,        setCustomTo]        = useState("");
  const [showCustom,      setShowCustom]      = useState(false);
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const [detailTarget,    setDetailTarget]    = useState(null);
  const [isLoadingMore,   setIsLoadingMore]   = useState(false);
  const [hasMore,         setHasMore]         = useState(true);
  const [pageAccum,       setPageAccum]       = useState(1);
  const sentinelRef = useRef(null);
  const PAGE_SIZE = 25;

  // Resolve active date range
  const { from: rangeFrom, to: rangeTo } = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom ? startOfDay(new Date(customFrom)) : null,
        to:   customTo   ? endOfDay(new Date(customTo))     : null,
      };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const useRange = !!(rangeFrom && rangeTo);

  // Load more pages (infinite scroll) — only in "all" mode
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || useRange) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pageAccum + 1;
      const data = await transactionApi.getAll({ page: nextPage, pageSize: PAGE_SIZE });
      const newItems = (data.items || data || []).map(mapTransaction);
      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.journalId));
        const fresh = newItems.filter(t => !existingIds.has(t.journalId));
        return [...prev, ...fresh];
      });
      setPageAccum(nextPage);
      setHasMore(nextPage < (data.totalPages || 1));
    } catch {
      toast.error('Không thể tải thêm giao dịch');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, useRange, pageAccum]);

  // IntersectionObserver — auto-load when sentinel enters viewport
  useEffect(() => {
    if (useRange || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, useRange, loadMore]);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      if (useRange) {
        const [txData, cfData] = await Promise.all([
          transactionApi.getByRange(rangeFrom.toISOString(), rangeTo.toISOString()),
          transactionApi.getCashFlow(rangeFrom.toISOString(), rangeTo.toISOString()),
        ]);
        setTransactions((txData || []).map(mapTransaction));
        setTotalCount((txData || []).length);
        setCashFlow({
          totalIncome:  cfData.totalIncome  ?? 0,
          totalExpense: cfData.totalExpense ?? 0,
          netCashFlow:  cfData.netCashFlow  ?? 0,
        });
      } else {
        const data = await transactionApi.getAll({ page: 1, pageSize: PAGE_SIZE });
        const items = (data.items || data || []).map(mapTransaction);
        setTransactions(items);
        setTotalCount(data.totalCount ?? data.total ?? items.length);
        setPageAccum(1);
        setHasMore((data.totalPages || 1) > 1);
        // Estimate cash flow from loaded page
        setCashFlow({
          totalIncome:  items.filter(t => t.isIncome).reduce((s, t) => s + t.totalAmount, 0),
          totalExpense: items.filter(t => !t.isIncome && !t.isTransfer && !t.isRepayment).reduce((s, t) => s + t.totalAmount, 0),
          netCashFlow:  0,
        });
      }
    } catch {
      toast.error("Không thể tải dữ liệu giao dịch");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [useRange, rangeFrom, rangeTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectPreset = (key) => {
    if (key === "custom") {
      setShowCustom(true);
      setPreset("custom");
    } else {
      setShowCustom(false);
      setPreset(key);
    }
  };

  const handleAddTransaction = async (data) => {
    try {
      const res = await transactionApi.create(data);
      if (res?.__offline) { toast.success("Đã lưu offline — sẽ đồng bộ khi có mạng"); return res; }
      await loadData(true);
      toast.success("Đã thêm giao dịch!");
      addNotification({ type: 'success', title: 'Giao dịch mới', message: 'Đã thêm giao dịch thành công', link: '/transactions/all' });
      return res;
    } catch {
      toast.error("Không thể thêm giao dịch");
      addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể thêm giao dịch' });
    }
  };

  const handleSaveEdit = async (data) => {
    if (!editTarget) return;
    try {
      await transactionApi.update(editTarget.journalId, data);
      setEditTarget(null);
      await loadData(true);
      toast.success("Đã cập nhật giao dịch!");
      addNotification({ type: 'success', title: 'Đã cập nhật', message: 'Giao dịch đã được cập nhật' });
    } catch {
      toast.error("Không thể cập nhật giao dịch");
      addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể cập nhật giao dịch' });
    }
  };

  const handleDelete = async (id, description) => {
    if (!await confirmDialog(`Xóa giao dịch "${description || 'này'}"?`)) return;
    try {
      await transactionApi.delete(id);
      await loadData(true);
      toast.success("Đã xóa giao dịch.");
      addNotification({ type: 'warning', title: 'Đã xóa', message: `Giao dịch "${description || ''}" đã được xóa` });
    } catch {
      toast.error("Không thể xóa giao dịch");
      addNotification({ type: 'error', title: 'Lỗi', message: 'Không thể xóa giao dịch' });
    }
  };

  // Filter client-side (type + search)
  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch =
      (t.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      filterType === "all"          ||
      (filterType === "income"      && t.isIncome)                ||
      (filterType === "transfer"    && t.isTransfer)              ||
      (filterType === "expense"     && !t.isIncome && !t.isTransfer && !t.isRepayment) ||
      (filterType === "repayment"   && t.isRepayment);
    return matchSearch && matchType;
  }), [transactions, searchTerm, filterType]);

  // Group by date (descending)
  const grouped = useMemo(() => {
    const map = new Map();
    [...filtered]
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      .forEach(t => {
        const key = format(new Date(t.transactionDate), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
      });
    return map;
  }, [filtered]);

  const amountDisplay = (t) => {
    if (t.isRepayment) return <span className="text-red-600">-{fmt(t.totalAmount)}</span>;
    if (t.isTransfer)  return <span className="text-blue-600">{fmt(t.totalAmount)}</span>;
    if (t.isIncome)    return <span className="text-green-600">+{fmt(t.totalAmount)}</span>;
    return                    <span className="text-card-foreground">-{fmt(t.totalAmount)}</span>;
  };

  const txBg   = (t) => t.isRepayment ? "bg-red-100" : t.isTransfer ? "bg-blue-100" : t.isIncome ? "bg-green-100" : "bg-red-100";
  const TxIcon = (t) => t.isRepayment ? HandCoins : t.isTransfer ? ArrowLeftRight : t.isIncome ? ArrowUpRight : ArrowDownRight;
  const txIconCls = (t) => t.isRepayment ? "text-red-600" : t.isTransfer ? "text-blue-500" : t.isIncome ? "text-green-600" : "text-red-500";

  const netPositive = cashFlow.netCashFlow >= 0;

  return (
    <PageLayout
      title="Giao dịch"
      subtitle="Lịch sử tất cả hoạt động tài chính"
      actions={
        <>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 border border-border bg-card rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            <span className="font-medium">Thêm giao dịch</span>
          </button>
        </>
      }
    >

      {/* ── Date range presets ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handleSelectPreset(p.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              preset === p.key
                ? "bg-purple-600 text-white border-purple-600"
                : "border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => handleSelectPreset("custom")}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            preset === "custom"
              ? "bg-purple-600 text-white border-purple-600"
              : "border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600"
          }`}
        >
          Tùy chỉnh
        </button>

        {/* Custom date pickers */}
        {showCustom && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-muted-foreground text-sm">đến</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
      </div>

      {/* ── Cash flow summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-5 border border-border flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Thu nhập</p>
            <p className="text-xl font-bold text-green-600">{fmt(cashFlow.totalIncome)}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <ArrowDownRight size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Chi tiêu</p>
            <p className="text-xl font-bold text-card-foreground">-{fmt(cashFlow.totalExpense)}</p>
          </div>
        </div>

        <div className={`rounded-xl p-5 border flex items-center gap-4 shadow-sm ${
          netPositive ? "bg-purple-600 border-purple-700" : "bg-card border-border"
        }`}>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            netPositive ? "bg-white/20" : "bg-muted"
          }`}>
            <TrendingUp size={20} className={netPositive ? "text-white" : "text-muted-foreground"} />
          </div>
          <div>
            <p className={`text-xs font-medium ${netPositive ? "text-purple-100" : "text-muted-foreground"}`}>
              {useRange ? "Còn lại" : "Số giao dịch"}
            </p>
            <p className={`text-xl font-bold ${netPositive ? "text-white" : "text-card-foreground"}`}>
              {useRange
                ? `${netPositive ? "+" : ""}${fmt(cashFlow.netCashFlow)}`
                : totalCount
              }
            </p>
          </div>
        </div>
      </div>

      {/* ── Table card ────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">

        {/* Search + filter row */}
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center bg-muted/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card text-sm"
              placeholder="Tìm kiếm theo mô tả hoặc danh mục..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
            {[
              { key: "all",      label: "Tất cả"       },
              { key: "income",   label: "Thu nhập"     },
              { key: "expense",  label: "Chi tiêu"     },
              { key: "repayment", label: "Trả nợ"      },
              { key: "transfer", label: "Chuyển khoản" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === key ? "bg-purple-600 text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction rows */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 sm:p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-muted-foreground">
              <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Không có giao dịch nào</p>
              <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <th className="px-3 sm:px-6 py-3 font-semibold">Mô tả</th>
                  <th className="px-3 sm:px-6 py-3 font-semibold">Nguồn → Đích</th>
                  <th className="px-3 sm:px-6 py-3 font-semibold">Giờ</th>
                  <th className="px-3 sm:px-6 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-3 sm:px-6 py-3 w-16 sm:w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...grouped.entries()].map(([dateKey, txs]) => {
                  const dateLabel = format(new Date(dateKey), "EEEE, dd/MM/yyyy", { locale: vi });
                  const dayIncome  = txs.filter(t => t.isIncome).reduce((s, t) => s + t.totalAmount, 0);
                  const dayExpense = txs.filter(t => !t.isIncome && !t.isTransfer && !t.isRepayment).reduce((s, t) => s + t.totalAmount, 0);

                  return (
                    <Fragment key={dateKey}>
                      {/* Date separator */}
                      <tr className="bg-muted/80">
                        <td colSpan={3} className="px-3 sm:px-6 py-2">
                          <span className="text-xs font-bold text-muted-foreground capitalize">{dateLabel}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-2 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                            {dayIncome  > 0 && <span className="text-green-600">+{fmt(dayIncome)}</span>}
                            {dayExpense > 0 && <span className="text-red-500">-{fmt(dayExpense)}</span>}
                          </div>
                        </td>
                        <td />
                      </tr>

                      {/* Transaction rows */}
                      {txs.map((t, txIndex) => {
                        const Icon = TxIcon(t);
                        return (
                          <tr key={t.journalId} onClick={() => setDetailTarget(t)} className="animate-list-item hover:bg-muted transition-colors group cursor-pointer" style={{ animationDelay: `${txIndex * 50}ms` }}>
                            <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${txBg(t)}`}>
                                  <Icon size={13} className={txIconCls(t)} />
                                </div>
                                <span className="font-medium text-card-foreground text-xs sm:text-sm">
                                  {t.description || <span className="italic text-muted-foreground">Không có mô tả</span>}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground max-w-[70px] sm:max-w-[90px] truncate" title={t.sourceAccount}>
                                  {t.sourceAccount}
                                </span>
                                <ArrowLeftRight size={10} className="text-muted-foreground shrink-0" />
                                <span className={`font-semibold max-w-[70px] sm:max-w-[90px] truncate ${
                                  t.isTransfer ? "text-blue-600" :
                                  t.isIncome   ? "text-green-600" :
                                  t.isRepayment ? "text-red-600" : "text-red-600"
                                }`} title={t.destAccount}>
                                  {t.destAccount}
                                </span>
                              </div>
                              {t.tags && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {t.tags.split(",").filter(Boolean).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium">
                                      {tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                              {format(new Date(t.transactionDate), "HH:mm")}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-right font-bold text-xs sm:text-sm whitespace-nowrap">
                              {amountDisplay(t)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditTarget(t); }}
                                  className="p-1.5 rounded hover:bg-purple-50 text-muted-foreground hover:text-purple-600 transition-colors"
                                  title="Sửa"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(t.journalId, t.description); }}
                                  className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Infinite scroll footer — only in "all" mode */}
        {!useRange && (
          <div className="px-6 py-5 border-t border-border">
            {isLoadingMore ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Đang tải thêm...
                </div>
              </div>
            ) : hasMore ? (
              <>
                {/* Sentinel element for IntersectionObserver */}
                <div ref={sentinelRef} className="h-1" />
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={loadMore}
                    className="px-5 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    Tải thêm giao dịch
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Đã hiển thị {transactions.length} / {totalCount} giao dịch
                  </p>
                </div>
              </>
            ) : transactions.length > 0 ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Đã hiển thị tất cả <span className="font-semibold text-foreground">{totalCount}</span> giao dịch
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTransaction}
      />
      <EditTransactionModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        transaction={editTarget}
      />
      <TransactionDetailModal
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        transaction={detailTarget}
        onEdit={(t) => { setDetailTarget(null); setEditTarget(t); }}
        onDelete={(t) => { setDetailTarget(null); handleDelete(t.journalId, t.description); }}
      />
    </PageLayout>
  );
}
