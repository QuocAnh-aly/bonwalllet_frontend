import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Bell,
  Shield,
  Globe,
  Palette,
} from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "sonner";
import { authApi } from "../../api/authApi";
import { transactionApi } from "../../api/transactionApi";
import { useEffect } from "react";

function mapTransaction(t) {
  const details = t.details || [];
  const expenseDetail = details.find((d) => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find((d) => d.typeId === 4 && d.credit > 0);
  const isTransfer = !expenseDetail && !revenueDetail;
  const isIncome = !!revenueDetail;

  let categoryName = "Uncategorized";
  if (expenseDetail) categoryName = expenseDetail.accountName || "Chi tiêu";
  else if (revenueDetail)
    categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer) categoryName = "Chuyển khoản";

  return { ...t, categoryName, isIncome, isTransfer };
}

export function Account() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | income | expense | transfer

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });
  const [theme, setTheme] = useState("light");
  const [currency, setCurrency] = useState("VND");

  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [cashFlow, setCashFlow] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netFlow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch Profile
        const profile = await authApi.getProfile();
        setUserProfile({
          fullName: profile.fullName || "",
          email: profile.email || "",
        });

        // Fetch Transactions
        const transData = await transactionApi.getAll({
          page: 1,
          pageSize: 50,
        });
        const items = (transData.items || transData || []).map(mapTransaction);
        setTransactions(items);

        // Fetch CashFlow
        const summary = await transactionApi.getCashFlow();
        setCashFlow({
          totalIncome: summary.totalIncome || 0,
          totalExpense: summary.totalExpense || 0,
          netFlow: (summary.totalIncome || 0) - (summary.totalExpense || 0),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Không thể tải dữ liệu tài khoản");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const TX_FILTER_TYPES = [
    { key: "all", label: "Tất cả" },
    { key: "income", label: "Thu nhập" },
    { key: "expense", label: "Chi tiêu" },
    { key: "transfer", label: "Chuyển khoản" },
  ];

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categoryName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" ||
      (filterType === "income" && t.isIncome) ||
      (filterType === "transfer" && t.isTransfer) ||
      (filterType === "expense" && !t.isIncome && !t.isTransfer);
    const matchesDate =
      !selectedDate ||
      format(new Date(t.transactionDate), "yyyy-MM-dd") ===
        format(selectedDate, "yyyy-MM-dd");

    return matchesSearch && matchesType && matchesDate;
  });

  const handleUpdateProfile = async () => {
    try {
      await authApi.updateProfile({
        fullName: userProfile.fullName,
        email: userProfile.email,
      });
      toast.success("Đã cập nhật hồ sơ thành công!");
    } catch (error) {
      toast.error("Không thể cập nhật hồ sơ");
    }
  };

  const totalIncome = cashFlow.totalIncome;
  const totalExpenses = cashFlow.totalExpense;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tài khoản</h1>
          <p className="text-slate-500 mt-1">
            Quản lý giao dịch và cài đặt của bạn
          </p>
        </div>
        {activeTab === "transactions" && (
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Download size={18} />
            <span>Xuất dữ liệu</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "transactions"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-slate-600 hover:text-slate-900"
          }`}>
          Giao dịch
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "settings"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-slate-600 hover:text-slate-900"
          }`}>
          Cài đặt
        </button>
      </div>

      {activeTab === "transactions" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">Tổng thu nhập</span>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${totalIncome.toLocaleString()}
              </p>
              <p className="text-green-600 text-sm mt-1">
                {filteredTransactions.filter((t) => t.isIncome).length} giao
                dịch
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">Tổng chi tiêu</span>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowDownRight size={20} className="text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${totalExpenses.toLocaleString()}
              </p>
              <p className="text-red-600 text-sm mt-1">
                {
                  filteredTransactions.filter(
                    (t) => !t.isIncome && !t.isTransfer,
                  ).length
                }{" "}
                giao dịch
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-purple-100">Dòng tiền ròng</span>
                <div className="w-2 h-2 rounded-full bg-purple-200"></div>
              </div>
              <p className="text-3xl font-bold">
                ${(totalIncome - totalExpenses).toLocaleString()}
              </p>
              <p className="text-purple-100 text-sm mt-1">
                {filteredTransactions.length} giao dịch
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm giao dịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                {TX_FILTER_TYPES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filterType === key
                        ? "bg-purple-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <CalendarIcon
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-left bg-white">
                  {selectedDate
                    ? format(selectedDate, "dd/MM/yyyy")
                    : "Chọn ngày"}
                </button>
                {showCalendar && (
                  <div className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }}
                      className="rdp-custom"
                    />
                    {selectedDate && (
                      <button
                        onClick={() => {
                          setSelectedDate(undefined);
                          setShowCalendar(false);
                        }}
                        className="w-full mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                        Xóa ngày
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Giao dịch
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Danh mục
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Ngày
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                      Số tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((t) => {
                    const iconBg = t.isTransfer
                      ? "bg-blue-50"
                      : t.isIncome
                        ? "bg-green-100"
                        : "bg-red-50";
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
                        : "text-slate-900";
                    const prefix = t.isIncome ? "+" : t.isTransfer ? "" : "-";
                    return (
                      <tr
                        key={t.journalId}
                        className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
                              <Icon size={18} className={iconCls} />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {t.description || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {t.categoryName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {format(new Date(t.transactionDate), "dd/MM/yyyy")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold text-lg ${amtCls}`}>
                            {prefix}${Math.abs(t.totalAmount).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">Không tìm thấy giao dịch</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Bell size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Thông báo</h2>
                <p className="text-sm text-slate-500">
                  Quản lý cách bạn nhận thông báo
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">
                    Thông báo Email
                  </p>
                  <p className="text-sm text-slate-500">
                    Nhận cập nhật qua email
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      email: !notifications.email,
                    });
                    toast.success(
                      `Email notifications ${!notifications.email ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.email ? "bg-purple-600" : "bg-slate-300"
                  }`}>
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.email ? "translate-x-6" : "translate-x-1"
                    }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Thông báo đẩy</p>
                  <p className="text-sm text-slate-500">
                    Nhận thông báo trên thiết bị của bạn
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      push: !notifications.push,
                    });
                    toast.success(
                      `Push notifications ${!notifications.push ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.push ? "bg-purple-600" : "bg-slate-300"
                  }`}>
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.push ? "translate-x-6" : "translate-x-1"
                    }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-slate-900">Thông báo SMS</p>
                  <p className="text-sm text-slate-500">
                    Nhận cảnh báo qua tin nhắn văn bản
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      sms: !notifications.sms,
                    });
                    toast.success(
                      `SMS notifications ${!notifications.sms ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.sms ? "bg-purple-600" : "bg-slate-300"
                  }`}>
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.sms ? "translate-x-6" : "translate-x-1"
                    }`}></div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Palette size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Giao diện</h2>
                <p className="text-sm text-slate-500">
                  Tùy chỉnh trải nghiệm ứng dụng của bạn
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Chủ đề
                </label>
                <select
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    toast.success(
                      `Đã đổi chủ đề sang ${e.target.value === "light" ? "Sáng" : e.target.value === "dark" ? "Tối" : "Tự động"}`,
                    );
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="light">Sáng</option>
                  <option value="dark">Tối</option>
                  <option value="auto">Tự động</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Globe size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cài đặt vùng
                </h2>
                <p className="text-sm text-slate-500">
                  Thiết lập tiền tệ và vùng của bạn
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tiền tệ
                </label>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    toast.success(`Currency changed to ${e.target.value}`);
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Shield size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bảo mật</h2>
                <p className="text-sm text-slate-500">
                  Quản lý bảo mật tài khoản
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Đổi mật khẩu
              </button>
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Bật xác thực hai yếu tố
              </button>
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Thiết bị đã kết nối
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Thông tin tài khoản
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={userProfile.fullName}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, fullName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleUpdateProfile}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
