import { X, Receipt, AlertTriangle, Paperclip } from "lucide-react";
import { useState, useEffect } from "react";
import { accountApi } from "../../api/accountApi";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
import { formatVND, parseVND } from "../../utils/formatMoney";

// "Trả ngay" — records an expense transaction (Debit = expense category,
// Credit = wallet) linked to the bill so its current period flips to "Đã trả".
export function PayBillModal({ isOpen, onClose, onPay, bill }) {
  const { fmt } = useSettings();
  const { expenseCategories, fetchCategories } = useCategories();

  const [wallets, setWallets] = useState([]);
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // On open: load asset accounts (typeId 1) to pay from, and resync expense
  // categories from the server so a just-created category shows up here.
  // Deps intentionally only [isOpen] — fetchCategories changes identity each
  // provider render, so including it would loop.
  useEffect(() => {
    if (!isOpen) return;
    fetchCategories();
    accountApi
      .getByType(1)
      .then((res) => setWallets(res.items ?? res ?? []))
      .catch(() => setWallets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset form each time it opens for a bill. Amount defaults to the average.
  useEffect(() => {
    if (!isOpen || !bill) return;
    setWalletId("");
    setCategoryId("");
    setAmount(String(Math.round(bill.averageAmount ?? bill.amountMin ?? 0)));
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setPendingFile(null);
  }, [isOpen, bill]);

  if (!isOpen || !bill) return null;

  const amountNum = parseFloat(amount) || 0;
  const outOfRange =
    amountNum > 0 &&
    (amountNum < (bill.amountMin ?? 0) || amountNum > (bill.amountMax ?? Infinity));

  const canSubmit = walletId && categoryId && amountNum > 0 && date && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const category = expenseCategories.find(
      (c) => String(c.accountId) === String(categoryId),
    );
    setSubmitting(true);
    try {
      await onPay(
        {
          walletAccountId: parseInt(walletId),
          expenseAccountId: category?.accountId ? parseInt(category.accountId) : null,
          expenseCategoryName: category?.name ?? null,
          amount: amountNum,
          date,
          notes: notes.trim() || null,
        },
        pendingFile,
      );
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
        className="bg-card rounded-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <Receipt className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Trả ngay</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[220px]">{bill.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Wallet */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Trả từ ví <span className="text-red-500">*</span>
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Chọn ví —</option>
              {wallets.map((w) => (
                <option key={w.accountId} value={w.accountId}>
                  {w.name}
                  {w.balance != null ? ` (${fmt(w.balance)})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Expense category */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Danh mục chi <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Chọn danh mục —</option>
              {expenseCategories
                .filter((c) => c.accountId)
                .map((c) => (
                  <option key={c.accountId} value={c.accountId}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Số tiền <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formatVND(amount)}
              onChange={(e) => setAmount(parseVND(e.target.value))}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Khoảng dự kiến: {fmt(bill.amountMin)} – {fmt(bill.amountMax)}
            </p>
            {outOfRange && (
              <p className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle size={12} />
                Số tiền nằm ngoài khoảng dự kiến của hóa đơn.
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Ngày trả <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Tùy chọn"
            />
          </div>

          {/* Đính kèm ảnh hóa đơn */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Đính kèm hóa đơn
            </label>
            {pendingFile ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg bg-muted/40">
                <span className="text-sm text-foreground truncate">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-muted-foreground hover:text-red-500 shrink-0"
                  title="Bỏ tệp"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground cursor-pointer hover:border-purple-400 hover:text-foreground transition-colors">
                <Paperclip size={15} />
                <span>Chọn ảnh/PDF hóa đơn (tùy chọn)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50"
            >
              {submitting ? "Đang xử lý…" : "Xác nhận trả"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
