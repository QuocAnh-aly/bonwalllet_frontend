import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt, Plus, Pencil, Trash2, Wallet,
  CheckCircle2, AlertCircle, MinusCircle, Clock,
  TrendingDown, CalendarClock, Layers,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { billApi } from "../../api/billApi";
import { SubscriptionFormModal } from "../../components/modals/SubscriptionFormModal";
import { PayBillModal } from "../../components/modals/PayBillModal";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";
import { shouldShowToast } from "../../utils/toastOnce";
import { confirmDialog } from "../../utils/confirmDialog";

const FREQ_LABELS = {
  daily:      "Hàng ngày",
  weekly:     "Hàng tuần",
  monthly:    "Hàng tháng",
  quarterly:  "Hàng quý",
  "half-year": "Nửa năm",
  yearly:     "Hàng năm",
};

// Monthly equivalent multipliers
const MONTHLY_FACTOR = {
  daily:       30,
  weekly:      4.33,
  monthly:     1,
  quarterly:   1 / 3,
  "half-year": 1 / 6,
  yearly:      1 / 12,
};

const STATUS_CONFIG = {
  inactive:         { icon: MinusCircle, cls: "text-muted-foreground bg-muted",         label: "~" },
  not_expected:     { icon: Clock,       cls: "text-muted-foreground bg-muted",         label: "Không cần" },
  expected_unpaid:  { icon: AlertCircle, cls: "text-yellow-700 bg-yellow-100",       label: "Chưa trả" },
  paid:             { icon: CheckCircle2, cls: "text-green-700 bg-green-100",        label: "Đã trả" },
};

function PaidBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_expected;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

import { PageLayout } from "../../components/layout/PageLayout";

export function Subscriptions() {
  const { fmt } = useSettings();
  const navigate = useNavigate();

  const [bills,    setBills]    = useState([]);
  const [isLoading,setIsLoading]= useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [payBill,  setPayBill]  = useState(null);

  // Load ALL bills (looping server pages) so the summary cards, group
  // subtotals and grand total are computed over the full dataset, not one page.
  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const PAGE_SIZE = 100;
      let page = 1;
      let all = [];
      let totalPages = 1;
      do {
        const data = await billApi.getAll({ page, pageSize: PAGE_SIZE });
        const items = data.items || data || [];
        all = all.concat(items);
        totalPages = data.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
      setBills(all);
    } catch {
      if (shouldShowToast('subscriptions-load-error')) {
        toast.error("Không thể tải danh sách hóa đơn");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { addNotification } = useNotifications();

  const handleCreate = async (data) => {
    try {
      await billApi.create(data);
      await load();
      // Keep the modal open when the user ticked "Quay lại đây" to add another.
      if (!data.returnHere) setFormOpen(false);
      toast.success(`Đã tạo "${data.name}"!`);
      addNotification({ type: 'success', title: 'Đã tạo hóa đơn định kỳ', message: `"${data.name}" đã được tạo thành công`, link: '/subscriptions' });
    } catch {
      toast.error("Không thể tạo hóa đơn");
      addNotification({ type: 'error', title: 'Lỗi tạo hóa đơn', message: 'Không thể tạo hóa đơn định kỳ mới' });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await billApi.update(editBill.billId, data);
      await load();
      setEditBill(null);
      toast.success("Đã cập nhật!");
      addNotification({ type: 'success', title: 'Đã cập nhật hóa đơn', message: `"${editBill.name}" đã được cập nhật`, link: `/subscriptions/${editBill.billId}` });
    } catch {
      toast.error("Không thể cập nhật");
      addNotification({ type: 'error', title: 'Lỗi cập nhật', message: 'Không thể cập nhật hóa đơn định kỳ' });
    }
  };

  const handlePay = async (payload) => {
    try {
      await billApi.pay(payBill.billId, payload);
      await load();
      setPayBill(null);
      toast.success(`Đã thanh toán "${payBill.name}"!`);
      addNotification({ type: 'success', title: 'Đã thanh toán hóa đơn', message: `"${payBill.name}" đã được ghi nhận thanh toán`, link: `/subscriptions/${payBill.billId}` });
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Không thể thanh toán");
    }
  };

  const handleDelete = async (bill) => {
    if (!await confirmDialog(`Xóa "${bill.name}"?`)) return;
    try {
      await billApi.delete(bill.billId);
      await load();
      toast.success(`Đã xóa "${bill.name}".`);
      addNotification({ type: 'success', title: 'Đã xóa hóa đơn', message: `"${bill.name}" đã được xóa` });
    } catch {
      toast.error("Không thể xóa");
      addNotification({ type: 'error', title: 'Lỗi xóa', message: 'Không thể xóa hóa đơn định kỳ' });
    }
  };

  // ─── Summaries ─────────────────────────────────────────────────────────────

  const activeBills = bills.filter(b => b.active);

  const totalMonthly = activeBills.reduce((sum, b) => {
    const factor = MONTHLY_FACTOR[b.repeatFreq] ?? 1;
    return sum + (b.averageAmount ?? 0) * factor;
  }, 0);

  const today = new Date();
  const dueSoon = activeBills.filter(b => {
    if (!b.nextExpectedMatch) return false;
    const diff = differenceInDays(parseISO(b.nextExpectedMatch), today);
    return diff >= 0 && diff <= 7;
  }).length;

  // ─── Group by objectGroup ───────────────────────────────────────────────────

  const groups = bills.reduce((acc, b) => {
    const key = b.objectGroup || "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  // Sort: named groups first, then "" (no group)
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Receipt size={20} className="text-purple-600" />
          </div>
          <span>Hóa đơn định kỳ</span>
        </div>
      }
      subtitle={<span className="ml-[52px]">Theo dõi và khớp các khoản chi tự động</span>}
      actions={
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          <Plus size={18} /> Thêm hóa đơn
        </button>
      }
    >

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-violet-700 rounded-2xl p-5 text-white">
          <p className="text-purple-100 text-xs font-medium mb-1">Chi hàng tháng (ước tính)</p>
          <p className="text-3xl font-bold mb-1">{fmt(totalMonthly)}</p>
          <p className="text-purple-200 text-xs">{activeBills.length} hóa đơn đang hoạt động</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">Tổng hóa đơn</p>
            <Layers size={18} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground mb-1">{bills.length}</p>
          <p className="text-muted-foreground text-xs">{bills.filter(b => !b.active).length} đang tắt</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">Sắp đến hạn (7 ngày)</p>
            <CalendarClock size={18} className="text-muted-foreground" />
          </div>
          <p className={`text-3xl font-bold mb-1 ${dueSoon > 0 ? "text-orange-500" : "text-card-foreground"}`}>{dueSoon}</p>
          <p className="text-muted-foreground text-xs">hóa đơn cần thanh toán</p>
        </div>
      </div>

      {/* Bills list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : bills.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed border-border">
          <Receipt size={48} className="text-slate-200 mb-4" />
          <p className="font-medium text-muted-foreground">Chưa có hóa đơn nào</p>
          <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm hóa đơn" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupName, groupBills]) => {
            const groupMonthly = groupBills.filter(b => b.active).reduce((sum, b) => {
              const factor = MONTHLY_FACTOR[b.repeatFreq] ?? 1;
              return sum + (b.averageAmount ?? 0) * factor;
            }, 0);

            return (
              <div key={groupName || "__no_group__"} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="px-6 py-3 border-b border-border bg-muted/60 flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {groupName || "Không có nhóm"}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    ~{fmt(groupMonthly)}/tháng
                  </p>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border">
                  {groupBills.map(bill => {
                    const nextDate  = bill.nextExpectedMatch ? parseISO(bill.nextExpectedMatch) : null;
                    const daysUntil = nextDate ? differenceInDays(nextDate, today) : null;
                    const isExpired = bill.endDate && new Date(bill.endDate) < today;

                    // Tiến độ thanh toán kỳ hiện tại: đã trả / số tiền trung bình.
                    const periodAvg  = bill.averageAmount || bill.amountMax || 0;
                    const periodPaid = bill.paidAmountThisPeriod || 0;
                    const periodPct  = periodAvg > 0
                      ? Math.min(100, Math.round((periodPaid / periodAvg) * 100))
                      : (bill.paidStatus === "paid" ? 100 : 0);
                    const showProgress = bill.active &&
                      (bill.paidStatus === "expected_unpaid" || bill.paidStatus === "paid");

                    return (
                      <div key={bill.billId}
                        className={`px-3 sm:px-4 py-3 hover:bg-muted transition-colors flex items-center gap-2 sm:gap-3 group flex-wrap sm:flex-nowrap ${!bill.active ? "opacity-60" : ""}`}>
                        {/* Icon */}
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${bill.active ? "bg-purple-100" : "bg-muted"}`}>
                          <Receipt size={14} className={bill.active ? "text-purple-600" : "text-muted-foreground"} />
                        </div>

                        {/* Name + freq */}
                        <div className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/subscriptions/${bill.billId}`)}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-card-foreground text-sm truncate">{bill.name}</p>
                            {!bill.active && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">Tắt</span>
                            )}
                            {isExpired && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Hết hạn</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            {FREQ_LABELS[bill.repeatFreq] ?? bill.repeatFreq}
                            {bill.skip > 0 ? ` · bỏ ${bill.skip} chu kỳ` : ""}
                            {/* Show amount on mobile */}
                            <span className="sm:hidden font-semibold text-foreground">{fmt(bill.amountMin)}–{fmt(bill.amountMax)}</span>
                            {/* Show next date on mobile */}
                            {nextDate && (
                              <span className={`sm:hidden text-xs ${daysUntil !== null && daysUntil <= 7 ? "text-orange-500" : "text-muted-foreground"}`}>
                                {format(nextDate, "dd/MM", { locale: vi })}
                              </span>
                            )}
                          </p>
                          {/* Tiến độ thanh toán kỳ hiện tại */}
                          {showProgress && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[220px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${periodPct >= 100 ? "bg-green-500" : "bg-purple-500"}`}
                                  style={{ width: `${Math.max(periodPct, 3)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {fmt(periodPaid)}/{fmt(periodAvg)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Amount range - desktop only */}
                        <div className="hidden md:block text-right shrink-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Khoảng tiền</p>
                          <p className="text-sm font-semibold text-foreground">
                            {fmt(bill.amountMin)} – {fmt(bill.amountMax)}
                          </p>
                        </div>

                        {/* Paid status - desktop only */}
                        <div className="hidden lg:block shrink-0">
                          <PaidBadge status={bill.paidStatus} />
                        </div>

                        {/* Next expected - desktop only */}
                        <div className="hidden md:block text-right shrink-0 w-28">
                          <p className="text-xs text-muted-foreground mb-0.5">Tiếp theo</p>
                          {nextDate ? (
                            <p className={`text-xs font-semibold ${daysUntil !== null && daysUntil <= 7 ? "text-orange-500" : "text-foreground"}`}>
                              {format(nextDate, "dd/MM/yyyy", { locale: vi })}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {bill.paidStatus === "expected_unpaid" && (
                            <button onClick={() => setPayBill(bill)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors text-xs font-semibold" title="Trả ngay">
                              <Wallet size={14} /> <span className="hidden sm:inline">Trả ngay</span>
                            </button>
                          )}
                          <button onClick={() => setEditBill(bill)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors" title="Sửa">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(bill)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Group subtotal */}
                <div className="px-6 py-2 bg-muted/40 border-t border-border flex justify-end gap-8 text-xs">
                  <span className="text-muted-foreground">
                    Tổng nhóm (ước tính/tháng):&nbsp;
                    <span className="font-bold text-foreground">{fmt(groupMonthly)}</span>
                  </span>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          {sortedGroups.length > 1 && (
            <div className="bg-muted rounded-xl border border-border px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingDown size={16} className="text-purple-500" />
                Tổng ước tính hàng tháng
              </div>
              <p className="text-lg font-bold text-purple-700">{fmt(totalMonthly)}</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SubscriptionFormModal isOpen={formOpen}    onClose={() => setFormOpen(false)} onSave={handleCreate} />
      <SubscriptionFormModal isOpen={!!editBill}  onClose={() => setEditBill(null)}  onSave={handleUpdate} bill={editBill} />
      <PayBillModal isOpen={!!payBill} onClose={() => setPayBill(null)} onPay={handlePay} bill={payBill} />
    </PageLayout>
  );
}
