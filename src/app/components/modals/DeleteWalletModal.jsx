import { X, Trash2, AlertTriangle, ArrowRight, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";

// Xóa ví theo quy tắc:
//  - Còn số dư  → bắt buộc chọn ví khác để chuyển số dư trước khi xóa.
//  - Có giao dịch → xác nhận (lịch sử được giữ lại, ví bị ẩn thay vì xóa cứng).
export function DeleteWalletModal({ isOpen, onClose, onConfirm, account, targets = [] }) {
  const { fmt } = useSettings();
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTransferToAccountId("");
    setSubmitting(false);
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const balance = account.balance ?? 0;
  const hasBalance = balance !== 0;
  // Loại bỏ chính ví đang xóa khỏi danh sách ví nhận.
  const transferTargets = targets.filter((a) => a.id !== account.id);
  const canSubmit = (!hasBalance || transferToAccountId) && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm({
        transferToAccountId: hasBalance ? parseInt(transferToAccountId) : undefined,
        force: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Trash2 size={16} className="text-red-600" />
            </div>
            <h2 className="text-base font-bold text-card-foreground">Xóa ví</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Wallet context */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2.5">
            <Wallet size={18} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground">Số dư: {fmt(balance)}</p>
            </div>
          </div>

          {/* Transfer target (only when balance != 0) */}
          {hasBalance && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Chuyển số dư sang ví <span className="text-red-500">*</span>
              </label>
              {transferTargets.length === 0 ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> Không có ví khác để chuyển. Hãy tạo thêm ví trước.
                </p>
              ) : (
                <>
                  <select
                    value={transferToAccountId}
                    onChange={(e) => setTransferToAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-card"
                  >
                    <option value="">Chọn ví nhận...</option>
                    {transferTargets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {fmt(a.balance ?? 0)}
                      </option>
                    ))}
                  </select>
                  {transferToAccountId && (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      {account.name}
                      <ArrowRight size={12} />
                      {transferTargets.find((a) => String(a.id) === transferToAccountId)?.name}
                      : <span className="font-semibold text-foreground">{fmt(balance)}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              Nếu ví có giao dịch, ví sẽ được <strong>ẩn</strong> và lịch sử giao dịch được giữ lại.
              Hành động này không thể hoàn tác.
            </span>
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
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || (hasBalance && transferTargets.length === 0)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Đang xử lý…" : hasBalance ? "Chuyển & xóa" : "Xóa ví"}
          </button>
        </div>
      </div>
    </div>
  );
}
