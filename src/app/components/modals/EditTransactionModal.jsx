import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Tag,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSettings } from "../../context/SettingsContext";
import { useCategories } from "../../context/CategoriesContext";
import { budgetApi } from "../../api/budgetApi";
import { billApi } from "../../api/billApi";
import { ReceiptAttachments } from "../attachments/ReceiptAttachments";

const TAG_COLORS = {
  blue: "bg-blue-100    text-blue-700    border-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  orange: "bg-orange-100  text-orange-700  border-orange-300",
  purple: "bg-purple-100  text-purple-700  border-purple-300",
  pink: "bg-pink-100    text-pink-700    border-pink-300",
  red: "bg-red-100     text-red-700     border-red-300",
  green: "bg-green-100   text-green-700   border-green-300",
  slate: "bg-muted   text-foreground   border-border",
};

export function EditTransactionModal({ isOpen, onClose, onSave, transaction }) {
  const { fmt } = useSettings();
  const { tags } = useCategories();

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  // Ngân sách giao dịch được tính vào (chỉ áp dụng cho chi tiêu). null = không gắn.
  const [budgetId, setBudgetId] = useState(null);
  const [budgets, setBudgets] = useState([]);
  // Hóa đơn định kỳ giao dịch được gắn (chỉ chi tiêu). null = không gắn.
  const [billId, setBillId] = useState(null);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setDescription(transaction.description ?? "");
    setDate(
      transaction.transactionDate
        ? format(new Date(transaction.transactionDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    );
    setTime(
      transaction.transactionDate
        ? format(new Date(transaction.transactionDate), "HH:mm")
        : format(new Date(), "HH:mm"),
    );
    setAmount(String(transaction.totalAmount ?? 0));
    setNotes(transaction.notes ?? "");
    setSelectedTags(
      transaction.tags
        ? transaction.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    );
    setBudgetId(transaction.budgetId ?? null);

    // Nạp các ngân sách của danh mục chi tiêu (nếu là giao dịch chi tiêu).
    const exp = (transaction.details || []).find(
      (d) => d.typeId === 5 && d.debit > 0,
    );
    if (exp?.accountId) {
      budgetApi
        .getExpenseBudgets({ page: 1, pageSize: 50 })
        .then((data) => {
          const items = data.items || data || [];
          setBudgets(
            items.filter(
              (b) => b.isActive !== false && b.accountId === exp.accountId,
            ),
          );
        })
        .catch(() => setBudgets([]));
    } else {
      setBudgets([]);
    }

    // Gắn hóa đơn định kỳ (chỉ giao dịch chi tiêu).
    setBillId(transaction.billId ?? null);
    if (exp?.accountId) {
      billApi
        .getAll({ page: 1, pageSize: 100 })
        .then((data) => {
          const items = data.items || data || [];
          // Hiện hóa đơn đang hoạt động + hóa đơn đang gắn hiện tại (kể cả đã tắt).
          setBills(
            items.filter((b) => b.active || b.billId === transaction.billId),
          );
        })
        .catch(() => setBills([]));
    } else {
      setBills([]);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isTransfer = transaction.isTransfer;
  const isIncome = transaction.isIncome;
  const isExpense = !isIncome && !isTransfer;

  const typeLabel = isTransfer
    ? "Chuyển khoản"
    : isIncome
      ? "Thu nhập"
      : "Chi tiêu";
  const typeBg = isTransfer
    ? "bg-blue-100 text-blue-700"
    : isIncome
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
  const amountCls = isTransfer
    ? "text-blue-600"
    : isIncome
      ? "text-green-600"
      : "text-card-foreground";
  const amountPfx = isIncome ? "+" : isExpense ? "-" : "";
  const Icon = isTransfer
    ? ArrowLeftRight
    : isIncome
      ? ArrowUpRight
      : ArrowDownRight;
  const iconBg = isTransfer
    ? "bg-blue-100"
    : isIncome
      ? "bg-green-100"
      : "bg-red-100";
  const iconCls = isTransfer
    ? "text-blue-500"
    : isIncome
      ? "text-green-600"
      : "text-red-500";

  const toggleTag = (name) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/,/g, ""));
    const payload = {
      description: description.trim() || null,
      notes: notes.trim() || null,
      tags: selectedTags.length > 0 ? selectedTags.join(",") : null,
      transactionDate: new Date(`${date}T${time}`).toISOString(),
      amount: isNaN(parsed) || parsed <= 0 ? undefined : parsed,
    };
    // Chỉ gửi gán ngân sách/hóa đơn cho giao dịch chi tiêu (0 = bỏ gắn, >0 = gán/đổi).
    if (isExpense) {
      payload.budgetId = budgetId ?? 0;
      payload.billId = billId ?? 0;
    }
    onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-card-foreground">
            Sửa giao dịch
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Transaction context (read-only) */}
        <div className="px-5 py-4 bg-muted border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <Icon size={18} className={iconCls} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeBg}`}>
                  {typeLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {transaction.transactionDate
                    ? format(
                        new Date(transaction.transactionDate),
                        "dd/MM/yyyy",
                      )
                    : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {transaction.sourceAccount} →{" "}
                {transaction.destAccount || transaction.categoryName}
              </p>
            </div>
            <div className={`text-lg font-bold flex-shrink-0 ${amountCls}`}>
              {amountPfx}
              {fmt(transaction.totalAmount)}
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Mô tả
              </label>
              <input
                autoFocus
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm mô tả cho giao dịch..."
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Số tiền
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  {amountPfx}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9,]/g, "");
                    setAmount(raw);
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-right font-semibold"
                  required
                />
              </div>
            </div>

            {/* Hóa đơn định kỳ (chỉ chi tiêu) */}
            {isExpense && bills.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Gắn vào hóa đơn định kỳ
                </label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                  {bills.map((b) => {
                    const active = billId === b.billId;
                    return (
                      <button
                        key={b.billId}
                        type="button"
                        onClick={() => setBillId(b.billId)}
                        className={`w-full px-3 py-2 rounded-lg border-2 text-left transition-all ${
                          active
                            ? "border-purple-400 bg-purple-50"
                            : "border-border hover:border-slate-300"
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              active ? "text-purple-700" : "text-foreground"
                            }`}>
                            {b.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {fmt(b.amountMin)}–{fmt(b.amountMax)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setBillId(null)}
                    className={`w-full px-3 py-1.5 rounded-lg border-2 text-left text-xs font-medium transition-all ${
                      billId === null
                        ? "border-slate-400 bg-muted text-foreground"
                        : "border-border hover:border-slate-300 text-muted-foreground"
                    }`}>
                    Không gắn hóa đơn
                  </button>
                </div>
              </div>
            )}

            {/* Ngân sách (chỉ chi tiêu) */}
            {isExpense && budgets.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tính vào ngân sách
                </label>
                <div className="space-y-1.5">
                  {budgets.map((b) => {
                    const active = budgetId === b.budgetId;
                    return (
                      <button
                        key={b.budgetId}
                        type="button"
                        onClick={() => setBudgetId(b.budgetId)}
                        className={`w-full px-3 py-2 rounded-lg border-2 text-left transition-all ${
                          active
                            ? "border-purple-400 bg-purple-50"
                            : "border-border hover:border-slate-300"
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              active ? "text-purple-700" : "text-foreground"
                            }`}>
                            {b.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {fmt(b.currentAmount ?? 0)}/{fmt(b.targetAmount ?? 0)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setBudgetId(null)}
                    className={`w-full px-3 py-1.5 rounded-lg border-2 text-left text-xs font-medium transition-all ${
                      budgetId === null
                        ? "border-slate-400 bg-muted text-foreground"
                        : "border-border hover:border-slate-300 text-muted-foreground"
                    }`}>
                    Không tính vào ngân sách
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Thời gian giao dịch
              </label>
              <div className="flex items-center gap-2 bg-background">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-border bg-transparent text-sm"
                />
                <div className="w-px h-6 bg-border" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-36 px-4 py-2.5 border border-border bg-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <Tag size={14} className="text-muted-foreground" /> Nhãn
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = selectedTags.includes(tag.name);
                    const colorCls = TAG_COLORS[tag.color] || TAG_COLORS.slate;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          active
                            ? colorCls
                            : "bg-card border-border text-muted-foreground hover:border-border"
                        }`}>
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Thêm ghi chú chi tiết..."
              />
            </div>

            {/* Receipt attachments */}
            <div className="pt-2 border-t border-border">
              <ReceiptAttachments type="transaction" id={transaction.journalId} />
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm">
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
