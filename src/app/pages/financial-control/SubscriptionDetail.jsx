import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Receipt, CheckCircle2, AlertCircle, Clock,
  MinusCircle, Pencil, Trash2, RefreshCw, Wallet,
  Calendar, DollarSign, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { billApi } from "../../api/billApi";
import { attachmentApi } from "../../api/attachmentApi";
import { toast } from "sonner";
import { useNotifications } from "../../context/NotificationContext";
import { ReceiptAttachments } from "../../components/attachments/ReceiptAttachments";
import { TransactionReceiptsGallery } from "../../components/attachments/TransactionReceiptsGallery";
import { SubscriptionFormModal } from "../../components/modals/SubscriptionFormModal";
import { PayBillModal } from "../../components/modals/PayBillModal";
import { useSettings } from "../../context/SettingsContext";
import { shouldShowToast } from "../../utils/toastOnce";
import { confirmDialog } from "../../utils/confirmDialog";

const FREQ_LABELS = {
  daily:       "Hàng ngày",
  weekly:      "Hàng tuần",
  monthly:     "Hàng tháng",
  quarterly:   "Hàng quý",
  "half-year": "Nửa năm",
  yearly:      "Hàng năm",
};

const STATUS_CONFIG = {
  inactive:        { icon: MinusCircle,  cls: "text-muted-foreground bg-muted",   label: "Không hoạt động" },
  not_expected:    { icon: Clock,        cls: "text-muted-foreground bg-muted",   label: "Không cần trả" },
  expected_unpaid: { icon: AlertCircle,  cls: "text-yellow-700 bg-yellow-100", label: "Chưa trả" },
  paid:            { icon: CheckCircle2, cls: "text-green-700 bg-green-100",   label: "Đã trả" },
};

function buildChartData(transactions) {
  if (!transactions?.length) return [];
  const byMonth = {};
  transactions.forEach(t => {
    const key = t.transactionDate ? format(parseISO(t.transactionDate), "MM/yyyy") : "?";
    byMonth[key] = (byMonth[key] ?? 0) + (t.amount ?? 0);
  });
  return Object.entries(byMonth)
    .sort(([a], [b]) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    })
    .map(([month, amount]) => ({ month, amount }));
}

const ChartTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-purple-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
};

export function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();

  const [bill,      setBill]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen,  setEditOpen]  = useState(false);
  const [payOpen,   setPayOpen]   = useState(false);
  const [rescanning,setRescanning]= useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await billApi.getById(id);
      setBill(data);
    } catch {
      if (shouldShowToast(`subscription-load-error:${id}`)) {
        toast.error("Không thể tải dữ liệu");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const { addNotification } = useNotifications();

  const handleUpdate = async (data) => {
    try {
      await billApi.update(id, data);
      await load();
      setEditOpen(false);
      toast.success("Đã cập nhật!");
      addNotification({ type: 'success', title: 'Đã cập nhật hóa đơn', message: `"${bill?.name}" đã được cập nhật`, link: `/subscriptions/${id}` });
    } catch {
      toast.error("Không thể cập nhật");
      addNotification({ type: 'error', title: 'Lỗi cập nhật', message: 'Không thể cập nhật hóa đơn định kỳ' });
    }
  };

  const handleDelete = async () => {
    if (!await confirmDialog(`Xóa "${bill?.name}"?`)) return;
    try {
      await billApi.delete(id);
      toast.success(`Đã xóa "${bill?.name}".`);
      addNotification({ type: 'success', title: 'Đã xóa hóa đơn', message: `"${bill?.name}" đã được xóa` });
      navigate("/subscriptions");
    } catch {
      toast.error("Không thể xóa");
      addNotification({ type: 'error', title: 'Lỗi xóa', message: 'Không thể xóa hóa đơn định kỳ' });
    }
  };

  const handlePay = async (payload, attachmentFile) => {
    // Kỳ này đã trả rồi → cảnh báo tránh trả trùng (vẫn cho phép nếu xác nhận).
    if (bill?.paidStatus === "paid") {
      const paidInfo = bill.paidAmountThisPeriod
        ? ` (đã trả ${fmt(bill.paidAmountThisPeriod)} kỳ này)`
        : "";
      const ok = await confirmDialog(
        `Hóa đơn "${bill.name}" đã được trả cho kỳ này${paidInfo}. Bạn có chắc muốn ghi thêm một giao dịch nữa?`,
        { destructive: false, title: "Kỳ này đã trả" },
      );
      if (!ok) return;
    }
    try {
      const result = await billApi.pay(id, payload);
      // Đính kèm ảnh hóa đơn vào đúng giao dịch vừa tạo (nếu có chọn tệp).
      if (attachmentFile && result?.paidTransactionId) {
        try {
          await attachmentApi.upload("transaction", result.paidTransactionId, attachmentFile);
        } catch {
          toast.error("Đã thanh toán nhưng không tải lên được ảnh đính kèm");
        }
      }
      await load();
      setPayOpen(false);
      toast.success(`Đã thanh toán "${bill?.name}"!`);
      addNotification({ type: 'success', title: 'Đã thanh toán hóa đơn', message: `"${bill?.name}" đã được ghi nhận thanh toán`, link: `/subscriptions/${id}` });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Không thể thanh toán");
    }
  };

  const handleRescan = async () => {
    try {
      setRescanning(true);
      await billApi.rescan(id);
      await load();
      toast.success("Quét lại hoàn tất!");
      addNotification({ type: 'info', title: 'Đã quét lại', message: `Hóa đơn "${bill?.name}" đã được quét lại`, link: `/subscriptions/${id}` });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Không thể quét lại");
      addNotification({ type: 'error', title: 'Lỗi quét lại', message: 'Không thể quét lại hóa đơn' });
    } finally {
      setRescanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Receipt size={48} className="mx-auto mb-3 text-slate-200" />
        <p>Không tìm thấy hóa đơn</p>
        <button onClick={() => navigate("/subscriptions")} className="mt-3 text-purple-600 text-sm hover:underline">
          ← Quay lại
        </button>
      </div>
    );
  }

  const statusCfg   = STATUS_CONFIG[bill.paidStatus] ?? STATUS_CONFIG.not_expected;
  const StatusIcon  = statusCfg.icon;
  const chartData   = buildChartData(bill.matchedTransactions);
  const avgActual   = bill.matchedTransactions?.length
    ? bill.matchedTransactions.reduce((s, t) => s + t.amount, 0) / bill.matchedTransactions.length
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/subscriptions")}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Receipt size={22} className="text-purple-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-2xl font-bold text-card-foreground truncate">{bill.name}</h1>
              {!bill.active && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-semibold">Tắt</span>
              )}
            </div>
            {bill.objectGroup && (
              <p className="text-sm text-muted-foreground truncate">{bill.objectGroup}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {bill.active && (
            <button onClick={() => setPayOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium text-sm transition-colors">
              <Wallet size={14} />
              {bill.paidStatus === "expected_unpaid" ? "Trả ngay" : "Ghi giao dịch"}
            </button>
          )}
          <button onClick={handleRescan} disabled={rescanning || !bill.active}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <RefreshCw size={14} className={rescanning ? "animate-spin" : ""} />
            Quét lại
          </button>
          <button onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Khoảng tiền</p>
            <DollarSign size={15} className="text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-card-foreground">
            {fmt(bill.amountMin)} – {fmt(bill.amountMax)}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Trạng thái kỳ này</p>
            <StatusIcon size={15} className="text-muted-foreground" />
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
            <StatusIcon size={10} /> {statusCfg.label}
          </span>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Tiếp theo</p>
            <Calendar size={15} className="text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-card-foreground">
            {bill.nextExpectedMatch
              ? format(parseISO(bill.nextExpectedMatch), "dd/MM/yyyy", { locale: vi })
              : "—"}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">TB thực tế</p>
            <TrendingDown size={15} className="text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-card-foreground">{avgActual > 0 ? fmt(avgActual) : "—"}</p>
        </div>
      </div>

      {/* Tiến độ thanh toán kỳ hiện tại */}
      {bill.active && (bill.paidStatus === "expected_unpaid" || bill.paidStatus === "paid") && (() => {
        const avg  = bill.averageAmount || bill.amountMax || 0;
        const paid = bill.paidAmountThisPeriod || 0;
        const pct  = avg > 0
          ? Math.min(100, Math.round((paid / avg) * 100))
          : (bill.paidStatus === "paid" ? 100 : 0);
        return (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground">Tiến độ thanh toán kỳ này</p>
              <span className={`text-sm font-bold ${pct >= 100 ? "text-green-600" : "text-purple-600"}`}>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : "bg-purple-500"}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>Đã trả: <span className="font-semibold text-foreground">{fmt(paid)}</span></span>
              <span>Dự kiến: {fmt(avg)}</span>
            </div>
          </div>
        );
      })()}

      {/* Info row */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Tần suất</p>
            <p className="font-semibold text-foreground">
              {FREQ_LABELS[bill.repeatFreq] ?? bill.repeatFreq}
              {bill.skip > 0 ? ` (bỏ ${bill.skip})` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Bắt đầu từ</p>
            <p className="font-semibold text-foreground">
              {bill.date ? format(parseISO(bill.date), "dd/MM/yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Kết thúc</p>
            <p className="font-semibold text-foreground">
              {bill.endDate ? format(parseISO(bill.endDate), "dd/MM/yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Đã khớp</p>
            <p className="font-semibold text-foreground">{bill.matchedCount} giao dịch</p>
          </div>
        </div>
        {bill.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
            <p className="text-sm text-muted-foreground">{bill.notes}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <p className="text-sm font-bold text-foreground mb-4">Lịch sử giao dịch khớp</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<ChartTooltip fmt={fmt} />} />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Matched transactions */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-muted/50">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Giao dịch đã khớp</p>
        </div>
        {!bill.matchedTransactions?.length ? (
          <div className="py-12 flex flex-col items-center text-muted-foreground">
            <Receipt size={36} className="mb-3" />
            <p className="text-sm">Chưa có giao dịch nào khớp</p>
            <p className="text-xs mt-1 text-muted-foreground">Nhấn "Quét lại" để tìm giao dịch tự động</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                <th className="px-4 md:px-6 py-3 font-semibold">Ngày</th>
                <th className="px-4 md:px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.matchedTransactions.map(t => (
                <tr key={t.journalId} className="hover:bg-muted">
                  <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {t.transactionDate
                      ? format(parseISO(t.transactionDate), "dd/MM/yyyy", { locale: vi })
                      : "—"}
                  </td>
                  <td className="px-4 md:px-6 py-3 text-sm text-foreground">{t.description || "—"}</td>
                  <td className="px-4 md:px-6 py-3 text-sm font-bold text-purple-600 text-right whitespace-nowrap">
                    {fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Receipt attachments */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-6">
        <ReceiptAttachments type="bill" id={id} />
      </div>

      {/* Hóa đơn đính kèm từ các giao dịch đã khớp */}
      {bill.matchedTransactions?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-6">
          <TransactionReceiptsGallery
            journalIds={bill.matchedTransactions.map((t) => t.journalId)}
          />
        </div>
      )}

      {/* Edit modal */}
      <SubscriptionFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={handleUpdate} bill={bill} />
      <PayBillModal isOpen={payOpen} onClose={() => setPayOpen(false)} onPay={handlePay} bill={bill} />
    </div>
  );
}
