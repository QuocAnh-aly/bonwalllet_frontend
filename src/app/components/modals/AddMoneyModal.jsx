import { X, Plus, PiggyBank, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { accountApi } from "../../api/accountApi";
import { formatVND, parseVND } from "../../utils/formatMoney";

export function AddMoneyModal({ isOpen, onClose, onSave, goal }) {
  const { fmt, currencySymbol } = useSettings();

  const [accounts, setAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSourceAccountId("");
    setAmount("");
    setNotes("");
    accountApi
      .getByType(1)
      .then((data) => setAccounts(data.items || data || []))
      .catch(() => setAccounts([]));
  }, [isOpen]);

  if (!isOpen || !goal) return null;

  const leftToSave =
    goal.leftToSave ?? Math.max(0, goal.targetAmount - goal.currentAmount);
  const selectedWallet = accounts.find(
    (a) => String(a.accountId) === String(sourceAccountId),
  );
  const walletBalance = selectedWallet?.balance ?? null;
  const enteredAmount = parseFloat(amount) || 0;
  // Chỉ giới hạn theo số dư ví nguồn — cho phép tiếp tục tiết kiệm kể cả khi đã
  // đạt/vượt mục tiêu (phần trăm hiển thị được giới hạn 100%).
  const exceedsWallet = walletBalance != null && enteredAmount > walletBalance;
  const canSubmit = enteredAmount > 0 && sourceAccountId && !exceedsWallet;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      amount: enteredAmount,
      notes: notes.trim() || null,
      sourceAccountId: parseInt(sourceAccountId),
    });
    setAmount("");
    setNotes("");
    setSourceAccountId("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Plus size={16} className="text-green-600" />
            </div>
            <h2 className="text-base font-bold text-card-foreground">
              Nạp tiền
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Goal context */}
        <div className="px-5 py-3 bg-muted border-b border-border">
          <div className="flex items-center gap-3">
            <PiggyBank size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {goal.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 bg-background rounded-full">
                  <div
                    className="h-1.5 bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(goal.percentage ?? 0, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(goal.percentage ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Còn lại</p>
              <p className="text-sm font-bold text-green-600">
                {fmt(leftToSave)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            {/* Luồng tiền */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Wallet size={13} className="shrink-0" />
              <span>Ví nguồn</span>
              <span className="mx-1">→</span>
              <PiggyBank size={13} className="text-green-600 shrink-0" />
              <span className="text-green-600 font-medium truncate">
                {goal.title}
              </span>
            </div>

            {/* Chọn ví nguồn */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Ví nguồn <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-card"
              >
                <option value="">Chọn ví...</option>
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.name}
                    {a.balance != null
                      ? ` — ${Number(a.balance).toLocaleString("vi-VN")} ₫`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Số tiền */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền nạp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={formatVND(amount)}
                  onChange={(e) => setAmount(parseVND(e.target.value))}
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 ${
                    exceedsWallet
                      ? "border-red-400 focus:ring-red-400"
                      : "border-border focus:ring-green-500"
                  }`}
                  placeholder="0"
                  required
                />
              </div>
              {exceedsWallet && (
                <p className="text-xs text-red-500 mt-1">
                  Vượt quá số dư ví nguồn ({fmt(walletBalance)})
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {walletBalance != null
                  ? `Số dư ví: ${fmt(walletBalance)} · Còn để đạt mục tiêu: ${fmt(leftToSave)}`
                  : `Còn để đạt mục tiêu: ${fmt(leftToSave)}`}
              </p>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Ghi chú
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Lý do nạp tiền..."
              />
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Nạp tiền
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
