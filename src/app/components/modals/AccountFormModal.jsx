import {
  X,
  Check,
  Landmark,
  Wallet,
  TrendingUp,
  PiggyBank,
  Home,
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
  Smartphone,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../../api/accountApi";
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
const DEFAULT_COLORS = { 1: "blue", 2: "slate", 4: "emerald" };

// Sub-types for Assets (typeId=1)
const ASSET_SUBTYPES = [
  {
    key: "bank",
    label: "Ngân hàng",
    iconName: "Landmark",
    color: "blue",
    from: "#3b82f6",
    to: "#1d4ed8",
  },
  {
    key: "cash",
    label: "Tiền mặt",
    iconName: "Wallet",
    color: "emerald",
    from: "#10b981",
    to: "#047857",
  },
  {
    key: "e-wallet",
    label: "Ví điện tử",
    iconName: "Smartphone",
    color: "pink",
    from: "#ec4899",
    to: "#be185d",
  },
];

const ASSET_SUBTYPE_MAP = Object.fromEntries(
  ASSET_SUBTYPES.map((s) => [s.key, s]),
);
const SUBTYPE_ICONS = { Landmark, Wallet, PiggyBank, TrendingUp, Home, Smartphone };

// Sub-types for Liabilities (typeId=2)
const LIABILITY_SUBTYPES = [
  {
    key: "bank-loan",
    label: "Vay ngân hàng",
    iconName: "Landmark",
    color: "blue",
    from: "#3b82f6",
    to: "#1d4ed8",
  },
  {
    key: "credit-card",
    label: "Nợ thẻ tín dụng",
    iconName: "CreditCard",
    color: "red",
    from: "#ef4444",
    to: "#b91c1c",
  },
  {
    key: "personal",
    label: "Vay mượn",
    iconName: "HandCoins",
    color: "amber",
    from: "#f59e0b",
    to: "#d97706",
  },
  {
    key: "other-debt",
    label: "Nợ khác",
    iconName: "ArrowLeftRight",
    color: "slate",
    from: "#64748b",
    to: "#475569",
  },
];

const LIABILITY_SUBTYPE_MAP = Object.fromEntries(
  LIABILITY_SUBTYPES.map((s) => [s.key, s]),
);
const LIABILITY_SUBTYPE_ICONS = {
  Landmark,
  CreditCard,
  HandCoins,
  ArrowLeftRight,
};

// Sub-types for Revenue (typeId=4)
const REVENUE_SUBTYPES = [
  {
    key: "salary",
    label: "Lương",
    iconName: "DollarSign",
    color: "green",
    from: "#22c55e",
    to: "#15803d",
  },
  {
    key: "freelance",
    label: "Freelance",
    iconName: "Briefcase",
    color: "purple",
    from: "#a855f7",
    to: "#7e22ce",
  },
  {
    key: "investment",
    label: "Đầu tư",
    iconName: "TrendingUp",
    color: "emerald",
    from: "#10b981",
    to: "#047857",
  },
  {
    key: "rental",
    label: "Cho thuê",
    iconName: "Home",
    color: "orange",
    from: "#f97316",
    to: "#c2410c",
  },
  {
    key: "interest",
    label: "Lãi suất",
    iconName: "Percent",
    color: "amber",
    from: "#f59e0b",
    to: "#d97706",
  },
  {
    key: "other-rev",
    label: "Khác",
    iconName: "Package",
    color: "slate",
    from: "#64748b",
    to: "#475569",
  },
];

const REVENUE_SUBTYPE_MAP = Object.fromEntries(
  REVENUE_SUBTYPES.map((s) => [s.key, s]),
);
const REVENUE_SUBTYPE_ICONS = {
  DollarSign,
  Briefcase,
  TrendingUp,
  Home,
  Percent,
  Package,
};

// Account types for the selector bar
const ACCOUNT_TYPES = [
  {
    typeId: 1,
    icon: Landmark,
    label: "Tài sản",
    gradient: "from-purple-500 to-purple-700",
    color: "#7c3aed",
  },
  {
    typeId: 2,
    icon: HandCoins,
    label: "Nợ",
    gradient: "from-red-500 to-red-700",
    color: "#dc2626",
  },
  {
    typeId: 4,
    icon: TrendingUp,
    label: "Danh mục thu nhập",
    gradient: "from-emerald-500 to-emerald-700",
    color: "#059669",
  },
];

const ACCOUNT_TYPE_MAP = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.typeId, t]),
);

// Quick balance presets (in VND)
const QUICK_PRESETS = [
  { label: "10tr", value: 10_000_000 },
  { label: "50tr", value: 50_000_000 },
  { label: "100tr", value: 100_000_000 },
  { label: "500tr", value: 500_000_000 },
  { label: "1tỷ", value: 1_000_000_000 },
];

// Title / submit / placeholder config per type
const TITLES = {
  create: {
    1: "Thêm tài sản",
    2: "Thêm khoản nợ",
    4: "Thêm danh mục thu nhập",
  },
  edit: {
    1: "Sửa tài sản",
    2: "Sửa khoản nợ",
    4: "Sửa danh mục thu nhập",
  },
};
const SUBMIT_LABELS = {
  create: {
    1: "Thêm tài sản",
    2: "Thêm khoản nợ",
    4: "Thêm nguồn thu",
  },
  edit: {
    1: "Lưu thay đổi",
    2: "Lưu thay đổi",
    4: "Lưu thay đổi",
  },
};
const PLACEHOLDERS = {
  1: "VD: MB Bank, Tiền mặt...",
  2: "VD: Vay mua xe, Nợ thẻ tín dụng...",
  4: "VD: Lương công ty ABC, Cho thuê nhà...",
};
const BALANCE_LABELS = {
  1: "Số dư hiện tại",
  2: "Dư nợ còn lại",
  4: "Tổng đã thu",
};

export function AccountFormModal({
  isOpen,
  onClose,
  onSubmit,
  account,
  typeId: initialTypeId,
}) {
  const { currencySymbol } = useSettings();
  const isEdit = !!account;

  const [activeTypeId, setActiveTypeId] = useState(initialTypeId);
  const [showNotes, setShowNotes] = useState(false);

  const isLiability = activeTypeId === 2;
  const isAsset = activeTypeId === 1;
  const isRevenue = activeTypeId === 4;

  const blankForm = () => ({
    name: "",
    assetSubtype:
      activeTypeId === 1
        ? "bank"
        : activeTypeId === 2
          ? "bank-loan"
          : activeTypeId === 4
            ? "salary"
            : "",
    color: DEFAULT_COLORS[activeTypeId] || "blue",
    cardNumber: "",
    balance: "",
    initialBalance: "",
    notes: "",
    sourceAccountId: "",
  });

  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState("");
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const selectedSubtype = isAsset
    ? ASSET_SUBTYPE_MAP[form.assetSubtype]
    : isLiability
      ? LIABILITY_SUBTYPE_MAP[form.assetSubtype]
      : isRevenue
        ? REVENUE_SUBTYPE_MAP[form.assetSubtype]
        : null;
  const hasSource = form.sourceAccountId && !isEdit;

  // Reset form khi chuyển loại
  const handleTypeChange = (newTypeId) => {
    if (isEdit || newTypeId === activeTypeId) return;
    setActiveTypeId(newTypeId);
    setForm({
      name: "",
      assetSubtype:
        newTypeId === 1
          ? "bank"
          : newTypeId === 2
            ? "bank-loan"
            : newTypeId === 4
              ? "salary"
              : "",
      color: DEFAULT_COLORS[newTypeId] || "blue",
      cardNumber: "",
      balance: "",
      initialBalance: "",
      notes: "",
      sourceAccountId: "",
    });
    setError("");
    setCardError("");
    setShowNotes(false);
  };

  // Computed preview
  const preview = useMemo(() => {
    const amount = parseFloat(form.balance) || 0;
    if (isLiability && hasSource) {
      const sourceAcc = sourceAccounts.find(
        (a) => String(a.accountId) === form.sourceAccountId,
      );
      return {
        balanceAfter: -amount,
        initialBalanceAfter: -amount,
        description: `Vay ${formatVND(amount)}${sourceAcc ? ` → ${sourceAcc.name}` : ""}`,
      };
    }
    if (isLiability) {
      return {
        balanceAfter: -amount,
        initialBalanceAfter: -amount,
        description: `Nợ ${formatVND(amount)}`,
      };
    }
    if (isAsset) {
      return {
        balanceAfter: amount,
        initialBalanceAfter: amount,
        description:
          amount > 0 ? `Số dư ${formatVND(amount)}` : "Chưa nhập số dư",
      };
    }
    return {
      balanceAfter: amount,
      initialBalanceAfter: 0,
      description:
        amount > 0
          ? `📊 Tổng thu: ${formatVND(amount)}`
          : "🏷️ Sẽ tự động cập nhật khi có giao dịch",
    };
  }, [
    form.balance,
    form.initialBalance,
    form.sourceAccountId,
    isLiability,
    hasSource,
    sourceAccounts,
  ]);

  // Fetch asset accounts for liability source selection
  useEffect(() => {
    if (!isOpen || isEdit || (!isLiability && !isAsset)) return;
    const fetchSources = async () => {
      setLoadingSources(true);
      try {
        const data = await accountApi.getByType(1, { page: 1, pageSize: 100 });
        setSourceAccounts(data.items || data || []);
      } catch {
        setSourceAccounts([]);
      } finally {
        setLoadingSources(false);
      }
    };
    fetchSources();
  }, [isOpen, activeTypeId, isEdit, isLiability, isAsset]);

  // Load account data for editing
  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      const assetIconToKey = {
        Landmark: "bank",
        Wallet: "cash",
        WalletIcon: "cash",
        Smartphone: "e-wallet",
      };
      const liabilityIconToKey = {
        Landmark: "bank-loan",
        CreditCard: "credit-card",
        HandCoins: "personal",
        ArrowLeftRight: "other-debt",
      };
      const revenueIconToKey = {
        DollarSign: "salary",
        Briefcase: "freelance",
        TrendingUp: "investment",
        Home: "rental",
        Percent: "interest",
        Package: "other-rev",
      };
      const iconToKey =
        account.typeId === 2
          ? liabilityIconToKey
          : account.typeId === 4
            ? revenueIconToKey
            : assetIconToKey;
      const storedCardRaw = (account.cardNumber || "").replace(/[^0-9]/g, "");
      setForm({
        name: account.name || "",
        assetSubtype: iconToKey[account.iconName] || "",
        color: account.color || DEFAULT_COLORS[activeTypeId] || "blue",
        cardNumber: storedCardRaw.slice(-4),
        balance:
          account.balance != null ? String(Math.abs(account.balance)) : "",
        initialBalance:
          account.initialBalance != null
            ? String(Math.abs(account.initialBalance))
            : "",
        notes: account.notes || "",
        sourceAccountId: "",
      });
    } else {
      setForm(blankForm());
    }
    setError("");
    setCardError("");
    setShowNotes(false);
  }, [isOpen, account]);

  if (!isOpen) return null;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const handleSubtypeSelect = (key) => {
    const st = isAsset
      ? ASSET_SUBTYPE_MAP[key]
      : isLiability
        ? LIABILITY_SUBTYPE_MAP[key]
        : isRevenue
          ? REVENUE_SUBTYPE_MAP[key]
          : null;
    if (!st) return;
    // Clear card number if switching away from bank
    const clearCard = isAsset && form.assetSubtype !== key && key !== "bank";
    setForm((f) => ({
      ...f,
      assetSubtype: key,
      color: st.color,
      cardNumber: clearCard ? "" : f.cardNumber,
    }));
    setCardError("");
  };

  // Quick preset handler: adds preset to current balance
  const applyPreset = (val) => {
    setForm((f) => ({ ...f, balance: String(val) }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Tên không được để trống");
      return;
    }
    if (isAsset && !selectedSubtype && !isEdit) {
      setError("Vui lòng chọn loại tài sản");
      return;
    }
    if (isLiability && !selectedSubtype && !isEdit) {
      setError("Vui lòng chọn loại nợ");
      return;
    }
    if (isRevenue && !selectedSubtype && !isEdit) {
      setError("Vui lòng chọn loại thu nhập");
      return;
    }
    // Validate số định danh tài sản (tùy chọn) — chỉ khi tạo mới, vì lúc sửa
    // form chỉ giữ 4 số cuối đã che nên không thể kiểm tra đầy đủ.
    if (isAsset && !isEdit && form.cardNumber.trim()) {
      const digits = form.cardNumber.replace(/\D/g, "");
      if (form.assetSubtype === "bank") {
        // Số tài khoản ngân hàng VN: 6–19 chữ số
        if (digits.length < 6 || digits.length > 19) {
          setCardError("Số tài khoản phải gồm 6–19 chữ số");
          return;
        }
      } else if (form.assetSubtype === "e-wallet") {
        // Ví điện tử VN (Momo, ZaloPay, ViettelPay…) định danh bằng SĐT:
        // 10 chữ số, bắt đầu bằng 0, đầu số 3/5/7/8/9
        if (!/^0[35789]\d{8}$/.test(digits)) {
          setCardError(
            "Số điện thoại / mã ví không hợp lệ (10 chữ số, bắt đầu bằng 0 — VD: 0901234567)",
          );
          return;
        }
      }
    }
    let col;
    let iconName;
    if (selectedSubtype) {
      col = COLOR_MAP[form.color] || COLOR_MAP.blue;
      iconName = selectedSubtype.iconName;
    } else {
      col = COLOR_MAP[form.color] || COLOR_MAP.blue;
      iconName = null;
    }

    const data = {
      name,
      iconName,
      color: col.value,
      gradientFrom: col.from,
      gradientTo: col.to,
      typeId: activeTypeId,
      notes: form.notes.trim() || null,
      currencyCode: "VND",
    };

    if (isLiability) {
      const currentDebt = parseFloat(form.balance) || 0;
      if (hasSource) {
        data.sourceAccountId = parseInt(form.sourceAccountId);
        data.balance = currentDebt;
        data.initialBalance = -currentDebt;
      } else {
        // Gộp gốc & còn nợ thành một — cả balance và initialBalance đều lấy từ 1 giá trị
        data.balance = -currentDebt;
        data.initialBalance = -currentDebt;
      }
    } else {
      // Asset/Revenue
      const amount = parseFloat(form.balance) || 0;
      if (hasSource && amount > 0) {
        data.balance = amount;
        data.sourceAccountId = parseInt(form.sourceAccountId);
      } else {
        data.balance = amount;
      }
      if (isAsset) {
        data.initialBalance = parseFloat(form.balance) || 0;
      }
    }

    if (isAsset && form.cardNumber.trim()) {
      const raw = form.cardNumber.replace(/\s/g, "");
      const last4 = raw.slice(-4);
      data.cardNumber = last4 ? `•••• ${last4}` : null;
    } else if (isAsset && form.assetSubtype === "bank" && !isEdit) {
      const now = Date.now();
      data.cardNumber = `•••• ${String(now % 10000).padStart(4, "0")}`;
    }

    onSubmit(data);
  };

  const selectedColor = COLOR_MAP[form.color] || COLOR_MAP.blue;
  const ActiveType = ACCOUNT_TYPE_MAP[activeTypeId] || ACCOUNT_TYPE_MAP[1];
  const hasPreview = form.name.trim() || form.balance;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────── Type Selector ─────── */}
        <div className="px-4 pt-4 shrink-0">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {ACCOUNT_TYPES.map(
              ({ typeId, icon: Icon, label, gradient, color }) => (
                <button
                  key={typeId}
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleTypeChange(typeId)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTypeId === typeId
                      ? `text-white shadow-sm bg-gradient-to-r ${gradient}`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  } ${isEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* ─────── Content (scrollable) ─────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} id="account-form">
            <div
              key={activeTypeId}
              className="animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              {/* ═══════════════ SECTION: SỐ TIỀN ═══════════════ */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Số tiền
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Liability: source account selector */}
                {isLiability && !isEdit && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Gán nợ vào tài khoản{" "}
                      <span className="text-muted-foreground font-normal">
                        (tùy chọn)
                      </span>
                    </label>
                    <select
                      value={form.sourceAccountId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          sourceAccountId: e.target.value,
                          balance: "",
                          initialBalance: "",
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                    >
                      <option value="">— Tạo nợ thông thường —</option>
                      {loadingSources ? (
                        <option disabled>Đang tải...</option>
                      ) : sourceAccounts.length === 0 ? (
                        <option disabled>Không có tài khoản ngân hàng</option>
                      ) : (
                        sourceAccounts.map((acc) => (
                          <option key={acc.accountId} value={acc.accountId}>
                            {acc.name} —{" "}
                            {new Intl.NumberFormat("vi-VN").format(
                              acc.balance ?? 0,
                            )}
                            đ
                          </option>
                        ))
                      )}
                    </select>
                    {hasSource && (
                      <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <ArrowLeftRight size={12} />
                          Số tiền vay sẽ được chuyển vào
                          <strong>
                            {sourceAccounts.find(
                              (a) =>
                                String(a.accountId) === form.sourceAccountId,
                            )?.name || "tài khoản đã chọn"}
                          </strong>{" "}
                          và ghi nhận là khoản nợ
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Liability with source: single amount */}
                {isLiability && hasSource && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Số tiền vay <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">
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
                        placeholder="100.000.000"
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base font-semibold tracking-tight focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                      />
                    </div>
                  </div>
                )}

                {/* Liability without source: 1 field (gộp gốc + còn nợ) */}
                {isLiability && !hasSource && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Dư nợ còn lại <span className="text-red-500">*</span>
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
                        placeholder="250.000.000"
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-border focus:border-purple-400 rounded-xl text-lg font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-all duration-200"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Asset / Revenue / Expense */}
                {!isLiability && (
                  <div className="space-y-3">
                    {/* Quick presets (only for Asset when no edit) */}
                    {isAsset && !isEdit && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_PRESETS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => applyPreset(p.value)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${
                              parseFloat(form.balance) === p.value
                                ? "bg-purple-500 text-white border-purple-500 shadow-sm"
                                : "border-border text-muted-foreground hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}                {/* Main balance input */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        {BALANCE_LABELS[activeTypeId]} {" "}
                        {!isRevenue && <span className="text-red-500">*</span>}
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
                      {isRevenue && (
                        <p className="mt-1.5 text-xs text-muted-foreground/70 italic flex items-center gap-1.5">
                          <TrendingUp size={11} />
                          Số tiền hiển thị tại đây chỉ để thống kê — thu nhập thực tế được ghi nhận qua từng giao dịch thu nhập
                        </p>
                      )}
                    </div>

                    {/* Source account for Asset */}
                    {isAsset && !isEdit && parseFloat(form.balance) > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Nguồn tiền{" "}
                          <span className="text-muted-foreground font-normal">
                            (tùy chọn)
                          </span>
                        </label>
                        <select
                          value={form.sourceAccountId}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              sourceAccountId: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                        >
                          <option value="">
                            Nhập số dư trực tiếp (không chọn nguồn)
                          </option>
                          {loadingSources ? (
                            <option disabled>Đang tải...</option>
                          ) : sourceAccounts.length === 0 ? (
                            <option disabled>Không có tài khoản khác</option>
                          ) : (
                            sourceAccounts.map((acc) => (
                              <option key={acc.accountId} value={acc.accountId}>
                                {acc.name} —{" "}
                                {new Intl.NumberFormat("vi-VN").format(
                                  acc.balance ?? 0,
                                )}
                                đ
                              </option>
                            ))
                          )}
                        </select>
                        {form.sourceAccountId && (
                          <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <ArrowLeftRight size={12} />
                              Số dư {formatVND(
                                parseFloat(form.balance) || 0,
                              )}{" "}
                              sẽ được chuyển từ{" "}
                              <strong>
                                {sourceAccounts.find(
                                  (a) =>
                                    String(a.accountId) ===
                                    form.sourceAccountId,
                                )?.name || "tài khoản đã chọn"}
                              </strong>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card number (asset bank) / wallet identifier (e-wallet) */}
                    {(isAsset &&
                      (form.assetSubtype === "bank" ||
                        form.assetSubtype === "e-wallet")) && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          {form.assetSubtype === "e-wallet"
                            ? "Số điện thoại / Mã ví"
                            : "Số tài khoản"}
                        </label>
                        <input
                          type="text"
                          value={form.cardNumber.replace(
                            /(\d{4})(?=\d)/g,
                            "$1 ",
                          )}
                          onChange={(e) => {
                            // Ngân hàng: tối đa 19 số; ví điện tử (SĐT): tối đa 10 số
                            const maxDigits =
                              form.assetSubtype === "bank" ? 19 : 10;
                            const raw = e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, maxDigits);
                            setForm((f) => ({ ...f, cardNumber: raw }));
                            setCardError("");
                          }}
                          placeholder={
                            form.assetSubtype === "e-wallet"
                              ? "0901 234 567"
                              : "1234 5678 9012"
                          }
                          maxLength={24}
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 bg-card transition-shadow ${
                            cardError
                              ? "border-red-400 focus:ring-red-500"
                              : "border-border focus:ring-purple-500"
                          }`}
                        />
                        {cardError && (
                          <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                            {cardError}
                          </p>
                        )}
                      </div>
                    )}
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

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Tên tài khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder={PLACEHOLDERS[activeTypeId]}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card transition-shadow"
                  />
                  {error && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                      {error}
                    </p>
                  )}
                </div>                {/* Asset sub-type */}
                {isAsset && !isEdit && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Loại tài sản <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ASSET_SUBTYPES.map((st) => {
                        const isActive = form.assetSubtype === st.key;
                        const SubIcon = SUBTYPE_ICONS[st.iconName] || Landmark;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => handleSubtypeSelect(st.key)}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${
                              isActive
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted"
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-200"
                              style={{
                                background: isActive
                                  ? `linear-gradient(135deg, ${st.from}, ${st.to})`
                                  : "var(--color-muted)",
                                transform: isActive ? "scale(1.1)" : "scale(1)",
                              }}
                            >
                              <SubIcon size={14} />
                            </div>
                            <span
                              className={`text-[10px] font-semibold text-center leading-tight ${isActive ? "text-purple-700 dark:text-purple-300" : "text-muted-foreground"}`}
                            >
                              {st.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedSubtype && (
                      <div
                        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200"
                        style={{
                          background: `linear-gradient(90deg, ${selectedSubtype.from}, ${selectedSubtype.to})`,
                        }}
                      >
                        {(() => {
                          const PreviewIcon =
                            SUBTYPE_ICONS[selectedSubtype.iconName] || Landmark;
                          return <PreviewIcon size={14} />;
                        })()}
                        {selectedSubtype.label}
                      </div>
                    )}

                    {/* Gợi ý: mục tiêu tiết kiệm tạo ở trang Lợn tiết kiệm */}
                    <Link
                      to="/piggy-banks"
                      onClick={onClose}
                      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <PiggyBank size={14} className="shrink-0" />
                      <span>
                        Muốn đặt <strong>mục tiêu tiết kiệm</strong>? Tạo{" "}
                        <strong>Lợn tiết kiệm</strong> →
                      </span>
                    </Link>
                  </div>
                )}

                {/* Liability sub-type */}
                {isLiability && !isEdit && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Loại nợ <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {LIABILITY_SUBTYPES.map((st) => {
                        const isActive = form.assetSubtype === st.key;
                        const SubIcon =
                          LIABILITY_SUBTYPE_ICONS[st.iconName] || HandCoins;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => handleSubtypeSelect(st.key)}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${
                              isActive
                                ? "border-red-500 bg-red-50 dark:bg-red-900/30 shadow-sm"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted"
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-200"
                              style={{
                                background: isActive
                                  ? `linear-gradient(135deg, ${st.from}, ${st.to})`
                                  : "var(--color-muted)",
                                transform: isActive ? "scale(1.1)" : "scale(1)",
                              }}
                            >
                              <SubIcon size={14} />
                            </div>
                            <span
                              className={`text-[10px] font-semibold text-center leading-tight ${isActive ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}
                            >
                              {st.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedSubtype && (
                      <div
                        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200"
                        style={{
                          background: `linear-gradient(90deg, ${selectedSubtype.from}, ${selectedSubtype.to})`,
                        }}
                      >
                        {(() => {
                          const PreviewIcon =
                            LIABILITY_SUBTYPE_ICONS[selectedSubtype.iconName] ||
                            HandCoins;
                          return <PreviewIcon size={14} />;
                        })()}
                        {selectedSubtype.label}
                      </div>
                    )}
                  </div>
                )}

                {/* Revenue sub-type */}
                {isRevenue && !isEdit && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Loại thu nhập <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {REVENUE_SUBTYPES.map((st) => {
                        const isActive = form.assetSubtype === st.key;
                        const SubIcon =
                          REVENUE_SUBTYPE_ICONS[st.iconName] || DollarSign;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => handleSubtypeSelect(st.key)}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${
                              isActive
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-sm"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted"
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-200"
                              style={{
                                background: isActive
                                  ? `linear-gradient(135deg, ${st.from}, ${st.to})`
                                  : "var(--color-muted)",
                                transform: isActive ? "scale(1.1)" : "scale(1)",
                              }}
                            >
                              <SubIcon size={14} />
                            </div>
                            <span
                              className={`text-[10px] font-semibold text-center leading-tight ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                            >
                              {st.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedSubtype && (
                      <div
                        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200"
                        style={{
                          background: `linear-gradient(90deg, ${selectedSubtype.from}, ${selectedSubtype.to})`,
                        }}
                      >
                        {(() => {
                          const PreviewIcon =
                            REVENUE_SUBTYPE_ICONS[selectedSubtype.iconName] ||
                            DollarSign;
                          return <PreviewIcon size={14} />;
                        })()}
                        {selectedSubtype.label}
                      </div>
                    )}
                  </div>
                )}


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
            </div>
          </form>
        </div>

        {/* ─────── Preview Card ─────── */}
        {hasPreview && (
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
                    {isRevenue && !isEdit ? "📊 Nguồn thu" : ActiveType.label} {isEdit ? "(đã lưu)" : "(sẽ tạo)"}
                  </span>
                  <ActiveType.icon size={14} className="text-white/60" />
                </div>
                <p className="text-base font-bold truncate">
                  {form.name.trim() || "Chưa nhập tên"}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold tracking-tight">
                    {formatVND(preview.balanceAfter)}
                  </span>
                  <span className="text-xs font-semibold text-white/70">
                    {currencySymbol}
                  </span>
                </div>
                {isLiability &&
                  !hasSource &&
                  Math.abs(preview.balanceAfter) > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-white/70 flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        Số dư nợ sẽ giảm khi phát sinh giao dịch trả nợ
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
            form="account-form"
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${selectedColor.from}, ${selectedColor.to})`,
            }}
          >
            <Check size={16} />
            {SUBMIT_LABELS[isEdit ? "edit" : "create"][activeTypeId]}
          </button>
        </div>
      </div>
    </div>
  );
}
