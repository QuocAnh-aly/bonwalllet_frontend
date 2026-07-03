import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Target,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { piggyBankApi } from "../../api/piggyBankApi";
import { attachmentApi } from "../../api/attachmentApi";
import { toast } from "sonner";
import { PiggyBankFormModal } from "../../components/modals/PiggyBankFormModal";
import { AddMoneyModal } from "../../components/modals/AddMoneyModal";
import { RemoveMoneyModal } from "../../components/modals/RemoveMoneyModal";
import { PageLayout } from "../../components/layout/PageLayout";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";
import { confirmDialog } from "../../utils/confirmDialog";

const COLOR_MAP = {
  green: { bg: "bg-green-100", text: "text-green-600", hex: "#22c55e" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", hex: "#3b82f6" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", hex: "#8b5cf6" },
  orange: { bg: "bg-orange-100", text: "text-orange-600", hex: "#f97316" },
  pink: { bg: "bg-pink-100", text: "text-pink-600", hex: "#ec4899" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600", hex: "#6366f1" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", hex: "#10b981" },
  slate: { bg: "bg-muted", text: "text-muted-foreground", hex: "#64748b" },
};

function mapGoal(g) {
  const c = COLOR_MAP[g.color] || COLOR_MAP.purple;
  return {
    ...g,
    id: g.budgetId,
    name: g.title,
    saved: g.currentAmount ?? 0,
    target: g.targetAmount ?? 0,
    leftToSave:
      g.leftToSave ??
      Math.max(0, (g.targetAmount ?? 0) - (g.currentAmount ?? 0)),
    pct: Math.min(g.percentage ?? 0, 100),
    bg: c.bg,
    textCls: c.text,
    hex: c.hex,
  };
}

export function PiggyBanks() {
  const { fmt } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal (create / edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  // Add / Remove money modal
  const [addGoal, setAddGoal] = useState(null); // goal đang nạp tiền
  const [removeGoal, setRemoveGoal] = useState(null); // goal đang rút tiền

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const gData = await piggyBankApi.getAll();
      setGoals((gData || []).map(mapGoal));
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreate = async (data, files) => {
    try {
      const created = await piggyBankApi.create(data);
      // Tạo xong mới có budgetId → upload các tệp đã chọn ở form.
      if (files?.length && created?.budgetId) {
        const results = await Promise.allSettled(
          files.map((f) => attachmentApi.upload("piggy", created.budgetId, f)),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0)
          toast.error(`${failed} tệp đính kèm tải lên thất bại`);
      }
      await load();
      setFormOpen(false);
      toast.success(`Đã tạo "${data.title}"!`);
      addNotification({
        type: "success",
        title: "Đã tạo lợn tiết kiệm",
        message: `"${data.title}" đã được tạo thành công`,
        link: "/piggy-banks",
      });
    } catch {
      toast.error("Không thể tạo lợn tiết kiệm");
      addNotification({
        type: "error",
        title: "Lỗi tạo lợn tiết kiệm",
        message: "Không thể tạo lợn tiết kiệm mới",
      });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await piggyBankApi.update(editGoal.id, data);
      await load();
      setEditGoal(null);
      toast.success("Đã cập nhật!");
      addNotification({
        type: "success",
        title: "Đã cập nhật lợn tiết kiệm",
        message: `"${editGoal.name}" đã được cập nhật`,
      });
    } catch {
      toast.error("Không thể cập nhật");
      addNotification({
        type: "error",
        title: "Lỗi cập nhật",
        message: "Không thể cập nhật lợn tiết kiệm",
      });
    }
  };

  const handleDelete = async (goal) => {
    if (!await confirmDialog(`Xóa "${goal.name}"? Toàn bộ lịch sử sẽ bị xóa.`)) return;
    try {
      await piggyBankApi.delete(goal.id);
      await load();
      toast.success(`Đã xóa "${goal.name}".`);
      addNotification({
        type: "success",
        title: "Đã xóa lợn tiết kiệm",
        message: `"${goal.name}" đã được xóa`,
      });
    } catch {
      toast.error("Không thể xóa");
      addNotification({
        type: "error",
        title: "Lỗi xóa",
        message: "Không thể xóa lợn tiết kiệm",
      });
    }
  };

  // ─── Add / Remove money ────────────────────────────────────────────────────
  const handleAddMoney = async (payload) => {
    try {
      await piggyBankApi.addMoney(addGoal.id, payload);
      await load();
      setAddGoal(null);
      toast.success(`Đã nạp tiền vào "${addGoal.name}"`);
      addNotification({
        type: "success",
        title: "Nạp tiền thành công",
        message: `Đã nạp vào "${addGoal.name}"`,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể nạp tiền";
      toast.error(msg);
      throw err; // giữ modal mở
    }
  };

  const handleRemoveMoney = async (payload) => {
    try {
      await piggyBankApi.removeMoney(removeGoal.id, payload);
      await load();
      setRemoveGoal(null);
      toast.success(`Đã rút tiền từ "${removeGoal.name}"`);
      addNotification({
        type: "success",
        title: "Rút tiền thành công",
        message: `Đã rút từ "${removeGoal.name}"`,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể rút tiền";
      toast.error(msg);
      throw err; // giữ modal mở
    }
  };

  // ─── Summary ───────────────────────────────────────────────────────────────
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = goals.reduce((s, g) => s + (g.savePerMonth ?? 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <PiggyBank size={20} className="text-purple-600" />
          </div>
          <span>Lợn tiết kiệm</span>
        </div>
      }
      subtitle={
        <span className="ml-[52px]">
          Theo dõi các mục tiêu tài chính của bạn
        </span>
      }
      actions={
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus size={18} /> Thêm lợn tiết kiệm
        </button>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white">
          <p className="text-purple-100 text-xs font-medium mb-1">
            Tổng đã tiết kiệm
          </p>
          <p className="text-3xl font-bold mb-1">{fmt(totalSaved)}</p>
          <p className="text-purple-200 text-xs">
            {totalTarget > 0
              ? `${((totalSaved / totalTarget) * 100).toFixed(1)}% của mục tiêu`
              : "—"}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">
              Tổng mục tiêu
            </p>
            <Target size={18} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground mb-1">
            {fmt(totalTarget)}
          </p>
          <p className="text-muted-foreground text-xs">
            Trên {goals.length} lợn tiết kiệm
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">
              Tiết kiệm hàng tháng
            </p>
            <TrendingUp size={18} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground mb-1">
            {fmt(totalMonthly)}
          </p>
          <p className="text-muted-foreground text-xs">Tổng đóng góp định kỳ</p>
        </div>
      </div>

      {/* Goals list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed border-border">
          <PiggyBank size={48} className="text-slate-200 mb-4" />
          <p className="font-medium text-muted-foreground">
            Chưa có lợn tiết kiệm nào
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Nhấn "Thêm lợn tiết kiệm" để bắt đầu
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-border bg-muted/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Danh sách lợn tiết kiệm
            </p>
          </div>
          <div className="divide-y divide-border">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="px-6 py-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`w-11 h-11 rounded-xl ${goal.bg} flex items-center justify-center shrink-0`}
                  >
                    <PiggyBank size={20} className={goal.textCls} />
                  </div>

                  {/* Name + progress */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/piggy-banks/${goal.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-semibold text-card-foreground text-sm">
                        {goal.name}
                      </p>
                      {goal.targetDate && (
                        <span className="text-[11px] text-muted-foreground">
                          đến {goal.targetDate}
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${goal.pct}%`,
                            backgroundColor: goal.hex,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 w-10 text-right">
                        {goal.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-right shrink-0">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Đã tiết kiệm
                      </p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: goal.hex }}
                      >
                        {fmt(goal.saved)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mục tiêu</p>
                      <p className="text-sm font-bold text-foreground">
                        {fmt(goal.target)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Còn lại</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {fmt(goal.leftToSave)}
                      </p>
                    </div>
                    {goal.savePerMonth > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">/ tháng</p>
                        <p className="text-sm font-semibold text-purple-600">
                          {fmt(goal.savePerMonth)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setAddGoal(goal)}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                      title="Nạp tiền"
                    >
                      <ArrowDownCircle size={15} />
                    </button>
                    <button
                      onClick={() => setRemoveGoal(goal)}
                      disabled={goal.saved <= 0}
                      className="p-1.5 rounded-lg hover:bg-orange-50 text-muted-foreground hover:text-orange-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Rút tiền"
                    >
                      <ArrowUpCircle size={15} />
                    </button>
                    <button
                      onClick={() => setEditGoal(goal)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(goal)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <PiggyBankFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
      />
      <PiggyBankFormModal
        isOpen={!!editGoal}
        onClose={() => setEditGoal(null)}
        onSave={handleUpdate}
        goal={editGoal}
      />
      <AddMoneyModal
        isOpen={!!addGoal}
        onClose={() => setAddGoal(null)}
        onSave={handleAddMoney}
        goal={addGoal}
      />
      <RemoveMoneyModal
        isOpen={!!removeGoal}
        onClose={() => setRemoveGoal(null)}
        onSave={handleRemoveMoney}
        goal={removeGoal}
      />
    </PageLayout>
  );
}
