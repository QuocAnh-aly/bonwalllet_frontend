import {
  X,
  Check,
  Landmark,
  Wallet,
  TrendingUp,
  PiggyBank,
  CreditCard,
  HandCoins,
  Tag,
  ArrowLeftRight,
  DollarSign,
  ChevronDown,
  Sparkles,
  Briefcase,
  Percent,
  Package,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { formatVND, parseVND } from "../../utils/formatMoney";
import { useSettings } from "../../context/SettingsContext";

const COLOR_OPTIONS = [
  { value: "blue", label: "Xanh dương", from: "#3b82f6", to: "#1d4ed8" },
  { value: "green", label: "Xanh lá", from: "#22c55e", to: "#15803d" },
  { value: "purple", label: "Tím", from: "#a855f7", to: "#7e22ce" },
  { value: "orange", label: "Cam", from: "#f97316", to: "#c2410c" },
  { value: "emerald", label: "Ngọc", from: "#10b981", to: "#047857" },
  { value: "red", label: "Đỏ", from: "#ef4444", to: "#b91c1c" },
  { value: "slate", label: "Xám", from: "#64748b", to: "#475569" },
  { value: "pink", label: "Hồng", from: "#ec4899", to: "#be185d" },
  { value: "amber", label: "Hổ phách", from: "#f59e0b", to: "#d97706" },
];

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map((c) => [c.value, c]));

const ACCOUNT_TYPE_INFO = {
  1: {
    label: "Tài sản",
    icon: Landmark,
    gradient: "from-purple-500 to-purple-700",
    placeholder: "VD: MB Bank, Tiền mặt...",
    balanceLabel: "Số dư hiện tại",
  },
  2: {
    label: "Nợ",
    icon: HandCoins,
    gradient: "from-red-500 to-red-700",
    placeholder: "VD: Vay mua xe, Nợ thẻ tín dụng...",
    balanceLabel: "Dư nợ còn lại",
  },
  4: {
    label: "Thu nhập",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-emerald-700",
    placeholder: "VD: Lương công ty ABC, Cho thuê nhà...",
    balanceLabel: "Tổng đã nhận",
  },
};

const TYPE_TITLES = {
  1: "Sửa tài sản",
  2: "Sửa khoản nợ",
  4: "Sửa nguồn thu",
};

export function EditAccountModal({ isOpen, onClose, onSubmit, account, typeId }) {
  const { currencySymbol } = useSettings();
  const typeInfo = ACCOUNT_TYPE_INFO[typeId] || ACCOUNT_TYPE_INFO[1];
  const isLiability = typeId === 2;
  const isAsset = typeId === 1;

  const [form, setForm] = useState({
    name: "",
    color: "blue",
    cardNumber: "",
    balance: "",
    initialBalance: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const selectedColor = COLOR_MAP[form.color] || COLOR_MAP.blue;

  // Load account data
  useEffect(() => {
    if (!isOpen || !account) return;
    const storedCardRaw = (account.cardNumber || '').replace(/[^0-9]/g, '');
    setForm({
      name: account.name || "",
      color: account.color || "blue",
      cardNumber: storedCardRaw.slice(-4),
      balance:
        account.balance != null ? String(Math.abs(account.balance)) : "",
      initialBalance:
        account.initialBalance != null
          ? String(Math.abs(account.initialBalance))
          : "",
      notes: account.notes || "",
    });
    setError("");
    setShowNotes(false);
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const preview = useMemo(() => {
    const amount = parseFloat(form.balance) || 0;
    if (isLiability) {
      return {
        balanceAfter: -amount,
        description: `Nợ ${formatVND(amount)}`,
      };
    }
    return {
      balanceAfter: amount,
      description: amount > 0 ? `Số dư ${formatVND(amount)}` : "Chưa nhập số dư",
    };
  }, [form.balance, isLiability]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Tên không được để trống");
      return;
    }

    const col = COLOR_MAP[form.color] || COLOR_MAP.blue;
    const data = {
      name,
      color: col.value,
      gradientFrom: col.from,
      gradientTo: col.to,
      typeId,
      notes: form.notes.trim() || null,
      currencyCode: "VND",
    };

    const amount = parseFloat(form.balance) || 0;
    if (isLiability) {
      // Gộp gốc & còn nợ — initialBalance = balance
      data.balance = -amount;
      data.initialBalance = -amount;
    } else {
      data.balance = amount;
      if (isAsset) {
        data.initialBalance = parseFloat(form.balance) || 0;
      }
    }

    if (isAsset && form.cardNumber.trim()) {
      const raw = form.cardNumber.replace(/\s/g, '');
      const last4 = raw.slice(-4);
      data.cardNumber = last4 ? `•••• ${last4}` : null;
    }

    onSubmit(data);
  };

  const TypeIcon = typeInfo.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────── Header ─────── */}
        <div className="shrink-0 px-4 pt-4">
          <div
            className={`relative overflow-hidden rounded-xl px-5 py-4 text-white bg-gradient-to-r ${typeInfo.gradient}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <TypeIcon size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {TYPE_TITLES[typeId]}
                  </h2>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    {typeInfo.label} — chỉnh sửa thông tin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ─────── Content (scrollable) ─────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} id="edit-account-form">
            {/* ═══════════════ SECTION: SỐ TIỀN ═══════════════ */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Số tiền
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Main balance */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  {typeInfo.balanceLabel}{" "}
                  <span className="text-muted-foreground font-normal">(hiện tại)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    value={formatVND(form.balance)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        balance: parseVND(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-border focus:border-purple-400 rounded-xl text-lg font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-card transition-all duration-200"
                    autoFocus
                  />
                </div>
              </div>

              {/* Ghi chú: initialBalance được tự động đồng bộ = balance khi submit */}
              {isLiability && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Nợ gốc được tự động đồng bộ với dư nợ hiện tại. Khi phát sinh giao dịch trả nợ, dư nợ sẽ giảm dần.
                  </p>
                </div>
              )}

              {/* Card number (expense / asset bank) */}
              {(isAsset && account?.iconName === "Landmark") && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={form.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                      setForm((f) => ({ ...f, cardNumber: raw }));
                      setError('');
                    }}
                    placeholder="1234 5678 9012"
                    maxLength={14}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                  />
                </div>
              )}
            </div>

            {/* ═══════════════ SECTION: THÔNG TIN ═══════════════ */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Thông tin
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tên tài khoản <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder={typeInfo.placeholder}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                />
                {error && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                    {error}
                  </p>
                )}
              </div>

            </div>

            {/* ═══════════════ SECTION: MÀU SẮC ═══════════════ */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Màu sắc
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, color: opt.value }))
                    }
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 ${
                      form.color === opt.value
                        ? "border-purple-500 ring-2 ring-purple-200 dark:ring-purple-700 scale-110"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${opt.from}, ${opt.to})`,
                    }}
                    title={opt.label}
                  />
                ))}
              </div>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: `linear-gradient(90deg, ${selectedColor.from}, ${selectedColor.to})`,
                }}
              />
            </div>

            {/* ═══════════════ NOTES (collapsible) ═══════════════ */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Tag size={13} className="text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ghi chú
                </span>
                <div className="h-px flex-1 bg-border" />
                <span
                  className="text-muted-foreground transition-transform duration-200"
                  style={{ transform: showNotes ? "rotate(180deg)" : "" }}
                >
                  <ChevronDown size={14} />
                </span>
              </button>
              {showNotes && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <textarea
                    value={form.notes}
                    onChange={set("notes")}
                    placeholder="Thêm ghi chú tùy chọn..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card resize-none transition-shadow"
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ─────── Preview Card ─────── */}
        {form.name.trim() && (
          <div className="px-4 sm:px-6 shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div
              className="relative overflow-hidden rounded-xl p-4 text-white transition-all duration-300 mb-0"
              style={{
                background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                    {typeInfo.label} (đã lưu)
                  </span>
                  <TypeIcon size={14} className="text-white/60" />
                </div>
                <p className="text-base font-bold truncate">
                  {form.name.trim()}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold tracking-tight">
                    {formatVND(preview.balanceAfter)}
                  </span>
                  <span className="text-xs font-semibold text-white/70">
                    {currencySymbol}
                  </span>
                </div>
                {isLiability && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-white/70">
                      Gốc = dư nợ hiện tại — sẽ giảm khi có giao dịch trả nợ
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────── Footer ─────── */}
        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border bg-muted/30 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-account-form"
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
            }}
          >
            <Check size={16} />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
