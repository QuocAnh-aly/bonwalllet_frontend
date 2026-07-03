import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, PiggyBank, Target, TrendingUp, Calendar,
  Plus, Minus, RotateCcw, Pencil, Trash2, CalendarClock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { piggyBankApi } from "../../api/piggyBankApi";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import { useNotifications } from "../../context/NotificationContext";
import { AddMoneyModal } from "../../components/modals/AddMoneyModal";
import { RemoveMoneyModal } from "../../components/modals/RemoveMoneyModal";
import { PiggyBankFormModal } from "../../components/modals/PiggyBankFormModal";
import { ReceiptAttachments } from "../../components/attachments/ReceiptAttachments";
import { useSettings } from "../../context/SettingsContext";
import { confirmDialog } from "../../utils/confirmDialog";

const COLOR_MAP = {
  green:   { bg: "bg-green-100",   text: "text-green-600",   hex: "#22c55e", grad: "from-green-500 to-green-700" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    hex: "#3b82f6", grad: "from-blue-500 to-blue-700" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-600",  hex: "#8b5cf6", grad: "from-purple-500 to-purple-700" },
  orange:  { bg: "bg-orange-100",  text: "text-orange-600",  hex: "#f97316", grad: "from-orange-500 to-orange-700" },
  pink:    { bg: "bg-pink-100",    text: "text-pink-600",    hex: "#ec4899", grad: "from-pink-500 to-pink-700" },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-600",  hex: "#6366f1", grad: "from-indigo-500 to-indigo-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", hex: "#10b981", grad: "from-emerald-500 to-emerald-700" },
  slate:   { bg: "bg-muted",   text: "text-muted-foreground",   hex: "#64748b", grad: "from-slate-500 to-slate-700" },
};

function buildChartData(events) {
  if (!events || events.length === 0) return [];
  let running = 0;
  return events.map(e => {
    running += e.amount;
    return {
      date: e.eventDate ? format(parseISO(e.eventDate), "dd/MM", { locale: vi }) : "",
      cumulative: Math.max(0, running),
      amount: e.amount,
    };
  });
}

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Tích lũy: <span className="font-bold text-card-foreground">{fmt(d.value)}</span></p>
    </div>
  );
};

export function PiggyBankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();

  const [goal,       setGoal]       = useState(null);
  const [events,     setEvents]     = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [addOpen,    setAddOpen]    = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [g, evs] = await Promise.all([
        piggyBankApi.getById(id),
        piggyBankApi.getEvents(id),
      ]);
      setGoal(g);

      // Lịch sử = sự kiện nạp/rút (Piggy_Bank_Events) + các giao dịch thường trên
      // ví lợn (vd. chuyển khoản vào/ra). Lấy thêm giao dịch theo tài khoản ví lợn
      // và loại bỏ bút toán nạp/rút (đã có trong events) để tránh trùng.
      const evItems = (evs || []).map((e) => ({
        id: `ev-${e.eventId}`,
        eventDate: e.eventDate,
        amount: e.amount,
        notes: e.notes,
        isTransaction: false,
      }));

      let txItems = [];
      if (g?.accountId) {
        try {
          const from = new Date(2000, 0, 1).toISOString();
          const to = new Date(2099, 11, 31).toISOString();
          const txs = await transactionApi.getByRangeAndAccount(
            g.accountId,
            from,
            to,
          );
          txItems = (txs || [])
            .filter((t) => {
              const d = t.description || "";
              return (
                !d.startsWith("Nạp tiền vào lợn:") &&
                !d.startsWith("Rút tiền từ lợn:")
              );
            })
            .map((t) => {
              const detail = (t.details || []).find(
                (x) => x.accountId === g.accountId,
              );
              // + = tiền vào ví lợn (debit), − = tiền ra (credit)
              const amount = (detail?.debit || 0) - (detail?.credit || 0);
              return {
                id: `tx-${t.journalId}`,
                eventDate: t.transactionDate,
                amount,
                notes: t.description || t.notes || null,
                isTransaction: true,
              };
            });
        } catch {
          txItems = [];
        }
      }

      const merged = [...evItems, ...txItems].sort(
        (a, b) => new Date(a.eventDate) - new Date(b.eventDate),
      );
      setEvents(merged);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const { addNotification } = useNotifications();

  const handleAddMoney = async (payload) => {
    try {
      await piggyBankApi.addMoney(id, payload);
      await load();
      setAddOpen(false);
      toast.success(`Đã nạp ${fmt(payload.amount)}!`);
      addNotification({ type: 'success', title: 'Đã nạp tiền', message: `${fmt(payload.amount)} đã được nạp vào "${goal?.title}"`, link: `/piggy-banks/${id}` });
    } catch {
      toast.error("Không thể nạp tiền");
      addNotification({ type: 'error', title: 'Không thể nạp tiền', message: `Nạp tiền vào "${goal?.title}" thất bại` });
    }
  };

  const handleRemoveMoney = async (payload) => {
    try {
      await piggyBankApi.removeMoney(id, payload);
      await load();
      setRemoveOpen(false);
      toast.success(`Đã rút ${fmt(payload.amount)}.`);
      addNotification({ type: 'warning', title: 'Đã rút tiền', message: `${fmt(payload.amount)} đã được rút từ "${goal?.title}"`, link: `/piggy-banks/${id}` });
    } catch {
      toast.error("Không thể rút tiền");
      addNotification({ type: 'error', title: 'Không thể rút tiền', message: `Rút tiền từ "${goal?.title}" thất bại` });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await piggyBankApi.update(id, data);
      await load();
      setEditOpen(false);
      toast.success("Đã cập nhật!");
      addNotification({ type: 'success', title: 'Đã cập nhật lợn tiết kiệm', message: `"${goal?.title}" đã được cập nhật`, link: `/piggy-banks/${id}` });
    } catch {
      toast.error("Không thể cập nhật");
      addNotification({ type: 'error', title: 'Lỗi cập nhật', message: `Không thể cập nhật "${goal?.title}"` });
    }
  };

  const handleReset = async () => {
    if (!await confirmDialog("Xóa toàn bộ lịch sử giao dịch? Số tiền đã tiết kiệm sẽ về 0.")) return;
    try {
      await piggyBankApi.resetHistory(id);
      await load();
      toast.success("Đã đặt lại lịch sử.");
      addNotification({ type: 'warning', title: 'Đã đặt lại lịch sử', message: `Lịch sử giao dịch của "${goal?.title}" đã được đặt lại` });
    } catch {
      toast.error("Không thể đặt lại lịch sử");
      addNotification({ type: 'error', title: 'Lỗi đặt lại', message: 'Không thể đặt lại lịch sử giao dịch' });
    }
  };

  const handleDelete = async () => {
    if (!await confirmDialog(`Xóa "${goal?.title}"? Toàn bộ lịch sử sẽ bị xóa.`)) return;
    try {
      await piggyBankApi.delete(id);
      toast.success(`Đã xóa "${goal?.title}".`);
      addNotification({ type: 'success', title: 'Đã xóa lợn tiết kiệm', message: `"${goal?.title}" đã được xóa` });
      navigate("/piggy-banks");
    } catch {
      toast.error("Không thể xóa");
      addNotification({ type: 'error', title: 'Lỗi xóa', message: 'Không thể xóa lợn tiết kiệm' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-32 bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <PiggyBank size={48} className="mx-auto mb-3 text-slate-200" />
        <p>Không tìm thấy lợn tiết kiệm</p>
        <button onClick={() => navigate("/piggy-banks")} className="mt-3 text-purple-600 text-sm hover:underline">
          ← Quay lại
        </button>
      </div>
    );
  }

  const c      = COLOR_MAP[goal.color] || COLOR_MAP.purple;
  const pct    = Math.min(goal.percentage ?? 0, 100);
  const saved  = goal.currentAmount ?? 0;
  const target = goal.targetAmount  ?? 0;
  const left   = goal.leftToSave    ?? Math.max(0, target - saved);
  const chartData = buildChartData(events);

  const goalForModal = {
    ...goal,
    title:         goal.title,
    currentAmount: saved,
    targetAmount:  target,
    leftToSave:    left,
    percentage:    pct,
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/piggy-banks")}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <PiggyBank size={22} className={c.text} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-card-foreground truncate">{goal.title}</h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                goal.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}>
                {goal.isActive ? "Đang hoạt động" : "Tạm dừng"}
              </span>
              {goal.currencyCode && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {goal.currencyCode}
                </span>
              )}
            </div>
            {goal.notes && <p className="text-sm text-muted-foreground mt-0.5 truncate">{goal.notes}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm transition-colors">
            <Plus size={16} /> Nạp tiền
          </button>
          <button onClick={() => setRemoveOpen(true)} disabled={saved <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Minus size={16} /> Rút tiền
          </button>
          <button onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors" title="Sửa">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Progress hero */}
      <div className={`bg-gradient-to-br ${c.grad} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1">Đã tiết kiệm</p>
            <p className="text-4xl font-bold">{fmt(saved)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Mục tiêu</p>
            <p className="text-xl font-semibold">{fmt(target)}</p>
          </div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full mb-2">
          <div className="h-3 bg-card rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/80">
          <span>{pct.toFixed(1)}% hoàn thành</span>
          <span>Còn lại {fmt(left)}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Còn lại</p>
            <Target size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{fmt(left)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">/ tháng</p>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{goal.savePerMonth > 0 ? fmt(goal.savePerMonth) : "—"}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Ngày mục tiêu</p>
            <Calendar size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground text-sm">{goal.targetDate ?? "—"}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Tháng còn lại</p>
            <CalendarClock size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">
            {goal.monthsRemaining != null ? `${goal.monthsRemaining} tháng` : "—"}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Số lần giao dịch</p>
            <PiggyBank size={16} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-card-foreground">{events.length}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Lịch sử tích lũy</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v)} />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <ReferenceLine y={target} stroke={c.hex} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Mục tiêu", fill: c.hex, fontSize: 11 }} />
              <Line type="monotone" dataKey="cumulative" stroke={c.hex} strokeWidth={2.5}
                dot={{ r: 3, fill: c.hex, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Lịch sử giao dịch</p>
          {events.length > 0 && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
              <RotateCcw size={12} /> Đặt lại lịch sử
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-muted-foreground">
            <PiggyBank size={36} className="mb-3" />
            <p className="text-sm">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider bg-muted/30">
                <th className="px-4 md:px-6 py-3 font-semibold">Ngày</th>
                <th className="px-4 md:px-6 py-3 font-semibold">Loại</th>
                <th className="px-4 md:px-6 py-3 font-semibold hidden md:table-cell">Ghi chú</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...events].reverse().map(e => {
                const isAdd = e.amount > 0;
                const label = e.isTransaction
                  ? (isAdd ? "Chuyển vào" : "Chuyển ra")
                  : (isAdd ? "Nạp tiền" : "Rút tiền");
                return (
                  <tr key={e.id} className="hover:bg-muted">
                    <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {e.eventDate
                        ? format(parseISO(e.eventDate), "dd/MM/yyyy HH:mm", { locale: vi })
                        : "—"}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isAdd ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {isAdd ? <Plus size={10} /> : <Minus size={10} />}
                        {label}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm text-muted-foreground hidden md:table-cell">{e.notes || "—"}</td>
                    <td className={`px-4 md:px-6 py-3 text-sm font-bold text-right ${isAdd ? "text-green-600" : "text-orange-500"} whitespace-nowrap`}>
                      {isAdd ? "+" : ""}{fmt(Math.abs(e.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mt-6">
        <ReceiptAttachments type="piggy" id={Number(id)} />
      </div>

      {/* Modals */}
      <AddMoneyModal    isOpen={addOpen}    onClose={() => setAddOpen(false)}    onSave={handleAddMoney}    goal={goalForModal} />
      <RemoveMoneyModal isOpen={removeOpen} onClose={() => setRemoveOpen(false)} onSave={handleRemoveMoney} goal={goalForModal} />
      <PiggyBankFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={handleUpdate} goal={goal} />
    </div>
  );
}
