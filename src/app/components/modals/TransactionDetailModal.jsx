import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  HandCoins,
  Pencil,
  Trash2,
  Calendar,
  Tag,
  StickyNote,
  Landmark,
  Hash,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useSettings } from "../../context/SettingsContext";
import { ReceiptAttachments } from "../attachments/ReceiptAttachments";

// Suy ra loại giao dịch + nguồn/đích/danh mục từ details (Firefly III model):
// typeId: 1=Assets, 2=Liabilities, 4=Revenue, 5=Expense
function derive(t) {
  const details = t?.details || [];
  const debitDetail = details.find((d) => d.debit > 0);
  const creditDetail = details.find((d) => d.credit > 0);
  const expenseDetail = details.find((d) => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find((d) => d.typeId === 4 && d.credit > 0);
  const repaymentDetail = details.find((d) => d.typeId === 2 && d.debit > 0);
  const isRepayment = !!repaymentDetail && !expenseDetail && !revenueDetail;
  const isTransfer = !expenseDetail && !revenueDetail && !isRepayment;
  const isIncome = !!revenueDetail;

  let categoryName = t.categoryName || "Chưa phân loại";
  if (!t.categoryName) {
    if (isRepayment) categoryName = repaymentDetail?.accountName || "Trả nợ";
    else if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
    else if (revenueDetail) categoryName = revenueDetail.accountName || "Thu nhập";
    else if (isTransfer) categoryName = "Chuyển khoản";
  }

  // Ví / ngân hàng = tài khoản tiền thật (Assets=1) hoặc khoản nợ (Liabilities=2),
  // giữ thứ tự nguồn (credit) → đích (debit) để hiển thị đúng dòng tiền.
  const walletNames = [creditDetail, debitDetail]
    .filter((x) => x && (x.typeId === 1 || x.typeId === 2))
    .map((x) => x.accountName)
    .filter(Boolean);

  return {
    isIncome: t.isIncome ?? isIncome,
    isTransfer: t.isTransfer ?? isTransfer,
    isRepayment: t.isRepayment ?? isRepayment,
    categoryName,
    sourceAccount: t.sourceAccount || creditDetail?.accountName || "—",
    destAccount: t.destAccount || debitDetail?.accountName || "—",
    walletLabel: walletNames.join(" → ") || "—",
  };
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  onEdit,
  onDelete,
}) {
  const { fmt } = useSettings();

  if (!isOpen || !transaction) return null;

  const d = derive(transaction);

  const typeMeta = d.isRepayment
    ? { label: "Trả nợ", Icon: HandCoins, bg: "bg-red-100", text: "text-red-600", sign: "-", amtCls: "text-red-600" }
    : d.isTransfer
      ? { label: "Chuyển khoản", Icon: ArrowLeftRight, bg: "bg-blue-100", text: "text-blue-600", sign: "", amtCls: "text-blue-600" }
      : d.isIncome
        ? { label: "Thu nhập", Icon: ArrowUpRight, bg: "bg-green-100", text: "text-green-600", sign: "+", amtCls: "text-green-600" }
        : { label: "Chi tiêu", Icon: ArrowDownRight, bg: "bg-red-100", text: "text-red-600", sign: "-", amtCls: "text-red-600" };

  const { Icon } = typeMeta;
  const dateObj = transaction.transactionDate ? new Date(transaction.transactionDate) : null;
  const tagList = transaction.tags
    ? transaction.tags.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeMeta.bg}`}>
              <Icon size={18} className={typeMeta.text} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-card-foreground truncate">
                {transaction.description || "Không có mô tả"}
              </h2>
              <span className="text-xs text-muted-foreground">{typeMeta.label}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-full p-1.5 hover:bg-muted transition-colors shrink-0"
            title="Đóng"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Amount */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-1">Số tiền</p>
            <p className={`text-3xl font-bold ${typeMeta.amtCls}`}>
              {typeMeta.sign}{fmt(transaction.totalAmount ?? 0)}
            </p>
          </div>

          {/* Source → Dest */}
          <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-xl p-4">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">Nguồn</p>
              <p className="text-sm font-semibold text-card-foreground truncate" title={d.sourceAccount}>
                {d.sourceAccount}
              </p>
            </div>
            <ArrowLeftRight size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">Đích</p>
              <p className="text-sm font-semibold text-card-foreground truncate" title={d.destAccount}>
                {d.destAccount}
              </p>
            </div>
          </div>

          {/* Meta rows */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <Tag size={14} /> Danh mục
              </span>
              <span className="font-medium text-card-foreground text-right">{d.categoryName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <Landmark size={14} /> Ví / Ngân hàng
              </span>
              <span className="font-medium text-card-foreground text-right">{d.walletLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar size={14} /> Thời gian
              </span>
              <span className="font-medium text-card-foreground text-right">
                {dateObj ? format(dateObj, "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi }) : "—"}
              </span>
            </div>
            {transaction.notes && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                  <StickyNote size={14} /> Ghi chú
                </span>
                <span className="font-medium text-card-foreground text-right whitespace-pre-wrap">
                  {transaction.notes}
                </span>
              </div>
            )}
            {tagList.length > 0 && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                  <Tag size={14} /> Thẻ
                </span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {transaction.createdAt && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock size={14} /> Ngày ghi nhận
                </span>
                <span className="font-medium text-card-foreground text-right">
                  {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                </span>
              </div>
            )}
            {transaction.journalId && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Hash size={14} /> Mã giao dịch
                </span>
                <span className="font-mono font-medium text-card-foreground text-right">#{transaction.journalId}</span>
              </div>
            )}
          </div>

          {/* Receipts (read-only) */}
          {transaction.journalId && (
            <div className="border-t border-border pt-4">
              <ReceiptAttachments type="transaction" id={transaction.journalId} readOnly />
            </div>
          )}

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              {onEdit && (
                <button
                  onClick={() => onEdit(transaction)}
                  className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-lg hover:bg-muted text-card-foreground transition-colors text-sm font-medium"
                >
                  <Pencil size={15} /> Sửa
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(transaction)}
                  className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors text-sm font-medium"
                >
                  <Trash2 size={15} /> Xóa
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
