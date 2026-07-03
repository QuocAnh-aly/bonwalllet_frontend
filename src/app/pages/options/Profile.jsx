import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Bell,
  Shield,
  Globe,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "sonner";
import { authApi } from "../../api/authApi";
import { transactionApi } from "../../api/transactionApi";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useSettings } from "../../context/SettingsContext";
import { PageLayout } from "../../components/layout/PageLayout";

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapTransaction(t) {
  const details = t.details || [];
  const expenseDetail = details.find((d) => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find((d) => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome = !!revenueDetail;
  let categoryName = "Chưa phân loại";
  if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail)
    categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer) categoryName = "Chuyển khoản";
  return { ...t, categoryName, isIncome, isTransfer };
}

function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors overflow-hidden ${value ? "bg-purple-600" : "bg-muted-foreground/25"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${value ? "translate-x-6" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── Password Strength Indicator ───────────────────────────────────────────────
const PASSWORD_RULES = [
  { label: "Ít nhất 8 ký tự", test: (p) => p.length >= 8 },
  { label: "Chữ hoa (A-Z)", test: (p) => /[A-Z]/.test(p) },
  {
    label: "Ký tự đặc biệt (!@#...)",
    test: (p) => /[!@#$%^&*()_\-+=.,;:<>?/~`{}[\]|\\]/.test(p),
  },
];

function PasswordStrengthIndicator({ password }) {
  const checks = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );
  const passedCount = checks.filter((c) => c.passed).length;
  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            passedCount === 0
              ? "bg-muted"
              : passedCount === 1
                ? "bg-red-500"
                : passedCount === 2
                  ? "bg-orange-500"
                  : "bg-green-500"
          }`}
          style={{ width: `${(passedCount / PASSWORD_RULES.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1">
        {checks.map((rule, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {rule.passed ? (
              <Check size={12} className="text-green-500 shrink-0" />
            ) : (
              <X size={12} className="text-muted-foreground shrink-0" />
            )}
            <span
              className={
                rule.passed ? "text-green-600" : "text-muted-foreground"
              }
            >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

const TX_FILTER_TYPES = [
  { key: "all", label: "Tất cả" },
  { key: "income", label: "Thu nhập" },
  { key: "expense", label: "Chi tiêu" },
  { key: "transfer", label: "Chuyển khoản" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function Profile() {
  const { user, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
  const { fmt, currencies, currency, setDefaultCurrency, firstDayOfWeek } = useSettings();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("transactions");

  // ── Transactions state ────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([]);
  const [cashFlow, setCashFlow] = useState({ totalIncome: 0, totalExpense: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState();
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // ── Profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    userName: "",
    fullName: "",
    email: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ── Change password state ──────────────────────────────────────────────────
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [isSavingPw, setIsSavingPw] = useState(false);

  // ── Settings state (localStorage) ─────────────────────────────────────────
  const [notifications, setNotifications] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("notif_settings")) || {
          email: true,
          push: true,
          sms: false,
        }
      );
    } catch {
      return { email: true, push: true, sms: false };
    }
  });
  // Trạng thái lưu cho từng toggle thông báo (đang gọi API)
  const [savingNotif, setSavingNotif] = useState(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const [prof, transData, summary] = await Promise.all([
          authApi.getProfile(),
          transactionApi.getAll({ page: 1, pageSize: 100 }),
          transactionApi.getCashFlow(),
        ]);
        setProfile({
          userName: prof.account || prof.userName || "",
          fullName: prof.userName || "",
          email: prof.email || "",
        });
        setNotifications({
          email: prof.notifyEmail ?? true,
          push:  prof.notifyPush  ?? true,
          sms:   prof.notifySms   ?? false,
        });
        setTransactions(
          (transData.items || transData || []).map(mapTransaction),
        );
        setCashFlow({
          totalIncome: summary.totalIncome || 0,
          totalExpense: summary.totalExpense || 0,
        });
      } catch {
        toast.error("Không thể tải dữ liệu tài khoản");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Filtered transactions ──────────────────────────────────────────────────
  const filtered = transactions.filter((t) => {
    const matchSearch =
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categoryName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      filterType === "all" ||
      (filterType === "income" && t.isIncome) ||
      (filterType === "transfer" && t.isTransfer) ||
      (filterType === "expense" && !t.isIncome && !t.isTransfer);
    const matchDate =
      !dateRange ||
      format(new Date(t.transactionDate), "yyyy-MM-dd") ===
        format(dateRange, "yyyy-MM-dd");
    return matchSearch && matchType && matchDate;
  });

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Ngày", "Mô tả", "Danh mục", "Loại", "Số tiền"];
    const rows = filtered.map((t) => [
      format(new Date(t.transactionDate), "dd/MM/yyyy"),
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.categoryName,
      t.isIncome ? "Thu nhập" : t.isTransfer ? "Chuyển khoản" : "Chi tiêu",
      (t.isIncome ? "+" : t.isTransfer ? "" : "-") + Math.abs(t.totalAmount),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giao-dich-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filtered.length} giao dịch ra CSV`);
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      await authApi.updateProfile({
        userName: profile.fullName,
        email: profile.email,
      });
      await refreshUser();
      toast.success("Đã cập nhật hồ sơ");
      addNotification({
        type: "success",
        title: "Đã cập nhật hồ sơ",
        message: "Thông tin cá nhân đã được lưu",
      });
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data;
      toast.error(typeof msg === "string" ? msg : "Không thể cập nhật hồ sơ");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }
    const failedRules = PASSWORD_RULES.filter((r) => !r.test(pwForm.next));
    if (failedRules.length > 0) {
      toast.error(
        "Mật khẩu mới chưa đáp ứng đủ yêu cầu (8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt)",
      );
      return;
    }
    try {
      setIsSavingPw(true);
      await authApi.changePassword({
        currentPassword: pwForm.current,

        newPassword: pwForm.next,
      });
      toast.success("Đã đổi mật khẩu thành công");
      addNotification({
        type: "success",
        title: "Đã đổi mật khẩu",
        message: "Mật khẩu của bạn đã được cập nhật",
      });
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPwForm(false);
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data;
      toast.error(
        typeof msg === "string" ? msg : "Mật khẩu hiện tại không đúng",
      );
    } finally {
      setIsSavingPw(false);
    }
  };

  // ── Notification toggle (persisted on the profile) ─────────────────────────
  const NOTIF_FIELD = { email: "notifyEmail", push: "notifyPush", sms: "notifySms" };
  const toggleNotif = async (key) => {
    const next = !notifications[key];
    const prev = notifications;
    const updated = { ...notifications, [key]: next };
    setNotifications(updated); // optimistic
    setSavingNotif(key);
    try {
      await authApi.updateProfile({ [NOTIF_FIELD[key]]: next });
      toast.success(next ? "Đã bật thông báo" : "Đã tắt thông báo");
    } catch (err) {
      setNotifications(prev); // rollback
      const msg = err?.response?.data?.message ?? err?.response?.data;
      toast.error(typeof msg === "string" ? msg : "Không thể lưu cài đặt thông báo");
    } finally {
      setSavingNotif(null);
    }
  };

  // ── Currency change (app-wide default, persisted server-side) ──────────────
  const handleCurrencyChange = async (val) => {
    if (val === currency) return;
    try {
      await setDefaultCurrency(val);
      toast.success(`Đã đổi tiền tệ mặc định sang ${val}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Không thể đổi tiền tệ");
    }
  };

  const initials = (profile.fullName || profile.userName || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <PageLayout
      title="Tài khoản"
      subtitle="Quản lý giao dịch và cài đặt của bạn"
      actions={
        activeTab === "transactions" && (
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Xuất CSV
          </button>
        )
      }
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border">
        {[
          { key: "transactions", label: "Giao dịch" },
          { key: "profile", label: "Hồ sơ" },
          { key: "settings", label: "Cài đặt" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === key
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Giao dịch ──────────────────────────────────────────────────── */}
      {activeTab === "transactions" && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Tổng thu nhập</span>
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-card-foreground">
                {fmt(cashFlow.totalIncome)}
              </p>
              <p className="text-green-600 text-sm mt-1">
                {filtered.filter((t) => t.isIncome).length} giao dịch
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Tổng chi tiêu</span>
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                  <ArrowDownRight size={20} className="text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-card-foreground">
                {fmt(cashFlow.totalExpense)}
              </p>
              <p className="text-red-600 text-sm mt-1">
                {filtered.filter((t) => !t.isIncome && !t.isTransfer).length}{" "}
                giao dịch
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-purple-100">Dòng tiền ròng</span>
                <div className="w-2 h-2 rounded-full bg-purple-200" />
              </div>
              <p
                className={`text-3xl font-bold ${cashFlow.totalIncome - cashFlow.totalExpense < 0 ? "text-red-200" : ""}`}
              >
                {fmt(cashFlow.totalIncome - cashFlow.totalExpense)}
              </p>

              <p className="text-purple-100 text-sm mt-1">
                {filtered.length} giao dịch
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-2xl p-4 border border-border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm giao dịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Type filter */}
              <div className="flex gap-1 bg-muted border border-border rounded-lg p-1">
                {TX_FILTER_TYPES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filterType === key
                        ? "bg-purple-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Date picker */}
              <div className="relative">
                <CalendarIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <button
                  onClick={() => setShowCalendar((v) => !v)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-left bg-card text-sm hover:border-purple-400 transition-colors"
                >
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(
                        dateRange.to,
                        "dd/MM/yyyy",
                      )}`
                    : "Lọc theo khoảng ngày"}
                </button>
                {showCalendar && (
                  <div className="absolute right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg p-3">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      weekStartsOn={firstDayOfWeek}
                    />
                    {dateRange && (
                      <button
                        onClick={() => {
                          setDateRange(undefined);
                          setShowCalendar(false);
                        }}
                        className="w-full mt-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted text-sm transition-colors"
                      >
                        Tắt bộ lọc ngày
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Giao dịch
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Danh mục
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Ngày
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">
                      Số tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonRow key={i} />
                      ))
                    : filtered.map((t) => {
                        const iconBg = t.isTransfer
                          ? "bg-blue-500/10"
                          : t.isIncome
                            ? "bg-green-500/15"
                            : "bg-red-500/10";
                        const Icon = t.isTransfer
                          ? ArrowLeftRight
                          : t.isIncome
                            ? ArrowUpRight
                            : ArrowDownRight;
                        const iconCls = t.isTransfer
                          ? "text-blue-500"
                          : t.isIncome
                            ? "text-green-600"
                            : "text-red-500";
                        const amtCls = t.isTransfer
                          ? "text-blue-600"
                          : t.isIncome
                            ? "text-green-600"
                            : "text-card-foreground";
                        const prefix = t.isIncome
                          ? "+"
                          : t.isTransfer
                            ? ""
                            : "-";
                        return (
                          <tr
                            key={t.journalId}
                            className="hover:bg-muted transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
                                >
                                  <Icon size={16} className={iconCls} />
                                </div>
                                <span className="font-medium text-card-foreground">
                                  {t.description || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
                                {t.categoryName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {format(
                                new Date(t.transactionDate),
                                "dd/MM/yyyy",
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-bold ${amtCls}`}>
                                {prefix}
                                {fmt(Math.abs(t.totalAmount))}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-16">
                  <Search
                    size={40}
                    className="mx-auto mb-3 text-muted-foreground"
                  />
                  <p className="text-muted-foreground">
                    Không tìm thấy giao dịch phù hợp
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Hồ sơ ─────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="max-w-2xl space-y-6">
          {/* Avatar + info card */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">
                  {profile.fullName || profile.userName}
                </h2>
                <p className="text-muted-foreground text-sm">
                  @{profile.userName}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={profile.userName}
                  disabled
                  className="w-full px-4 py-3 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tên đăng nhập không thể thay đổi
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, fullName: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="email@example.com"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-60"
              >
                {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>

          {/* Change password card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowPwForm((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <KeyRound size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-card-foreground">
                    Đổi mật khẩu
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật mật khẩu đăng nhập
                  </p>
                </div>
              </div>
              {showPwForm ? (
                <ChevronUp size={18} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={18} className="text-muted-foreground" />
              )}
            </button>

            {showPwForm && (
              <form
                onSubmit={handleChangePassword}
                className="px-6 pb-6 space-y-4 border-t border-border pt-4"
              >
                {/* Current password */}
                {[
                  {
                    key: "current",
                    label: "Mật khẩu hiện tại",
                    placeholder: "Nhập mật khẩu hiện tại",
                  },
                  {
                    key: "next",
                    label: "Mật khẩu mới",
                    placeholder:
                      "Tối thiểu 8 ký tự, 1 chữ hoa, 1 ký tự đặc biệt",
                  },
                  {
                    key: "confirm",
                    label: "Xác nhận mật khẩu",
                    placeholder: "Nhập lại mật khẩu mới",
                  },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? "text" : "password"}
                        value={pwForm[key]}
                        onChange={(e) =>
                          setPwForm((p) => ({ ...p, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        maxLength={128}
                        required
                        className="w-full px-4 py-3 pr-11 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPw((p) => ({ ...p, [key]: !p[key] }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                      >
                        {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {key === "next" && (
                      <PasswordStrengthIndicator password={pwForm.next} />
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPwForm(false);
                      setPwForm({ current: "", next: "", confirm: "" });
                    }}
                    className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPw}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold disabled:opacity-60"
                  >
                    {isSavingPw ? "Đang đổi..." : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Cài đặt ───────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6">
          {/* Notifications */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Bell size={18} className="text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-card-foreground">Thông báo</h2>
                <p className="text-xs text-muted-foreground">
                  Quản lý cách nhận thông báo
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  key: "email",
                  label: "Thông báo Email",
                  desc: "Nhận cập nhật qua email",
                },
                {
                  key: "push",
                  label: "Thông báo đẩy",
                  desc: "Thông báo trên thiết bị",
                },
                {
                  key: "sms",
                  label: "Thông báo SMS",
                  desc: "Cảnh báo qua tin nhắn",
                },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-1 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-card-foreground text-sm">
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Toggle
                    value={notifications[key]}
                    onChange={() => toggleNotif(key)}
                    disabled={savingNotif === key}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Globe size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-card-foreground">Cài đặt vùng</h2>
                <p className="text-xs text-muted-foreground">
                  Đơn vị tiền tệ hiển thị
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Tiền tệ
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Đặt tiền tệ mặc định cho toàn ứng dụng. Thêm/bớt loại tiền tại trang <strong>Tiền tệ</strong>.
              </p>
            </div>
          </div>

          {/* Security info */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Shield size={18} className="text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-card-foreground">Bảo mật</h2>
                <p className="text-xs text-muted-foreground">
                  Thông tin bảo mật tài khoản
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Đổi mật khẩu
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật trong tab Hồ sơ
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Đến hồ sơ →
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Xác thực hai yếu tố
                  </p>
                  <p className="text-xs text-muted-foreground">Sắp ra mắt</p>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  Sắp ra mắt
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Phiên đăng nhập
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quản lý thiết bị đã kết nối
                  </p>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  Sắp ra mắt
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
