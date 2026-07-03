import {
  Plus,
  TrendingUp,
  Coffee,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  AlertTriangle,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { AddBudgetModal } from "../../components/modals/AddBudgetModal";
import { EditBudgetModal } from "../../components/modals/EditBudgetModal";
import { toast } from "sonner";
import { budgetApi } from "../../api/budgetApi";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";
import { shouldShowToast } from "../../utils/toastOnce";
import { confirmDialog } from "../../utils/confirmDialog";

import { ICON_MAP, COLOR_MAP } from "../../utils/icons";

const iconMap = ICON_MAP;
const colorMap = COLOR_MAP;

function mapBudget(b) {
  const colors = colorMap[b.color] || colorMap.orange;
  return {
    id: b.budgetId,
    accountId: b.accountId,
    accountName: b.accountName,
    name: b.title,
    icon: iconMap[b.iconName] || Coffee,
    iconName: b.iconName || "Coffee",
    color: b.color || "orange",
    textColor: colors.text,
    bgColor: colors.bg,
    barColor: colors.bar,
    pieColor: colors.pie,
    budget: b.targetAmount ?? 0,
    spent: b.currentAmount ?? 0,
    remaining: b.remaining ?? b.targetAmount - (b.currentAmount ?? 0),
    percentage: b.percentage ?? 0,
    periodType: b.periodType || "monthly",
    startDate: b.startDate,
    endDate: b.endDate,
    isActive: b.isActive,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ percentage }) {
  if (percentage > 100)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle size={11} /> Vượt hạn mức
      </span>
    );
  if (percentage >= 80)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <AlertTriangle size={11} /> Cảnh báo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle2 size={11} /> Ổn định
    </span>
  );
}

import PaginationBar from "../../components/ui/navigation/PaginationBar";
import { PageLayout } from "../../components/layout/PageLayout";

export function Budgets() {
  const { fmt } = useSettings();
  const { addNotification } = useNotifications();
  const [budgets, setBudgets] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBudgets();
  }, [page, pageSize, search, filterStatus, sortBy]);

  // Reset to page 1 when search/filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, sortBy]);

  const fetchBudgets = async () => {
    try {
      setIsLoading(true);
      const params = { page, pageSize };
      if (search) params.search = search;
      if (filterStatus && filterStatus !== "all")
        params.filterStatus = filterStatus;
      if (sortBy && sortBy !== "default") params.sortBy = sortBy;
      const data = await budgetApi.getExpenseBudgets(params);
      const items = data.items || data || [];
      setTotalCount(data.totalCount ?? items.length);
      setTotalPages(data.totalPages ?? 1);
      const mapped = items.map(mapBudget);
      setBudgets(mapped);

      // Check for budget warnings and send notifications (session-deduplicated)
      mapped.forEach((b) => {
        const overKey = `budget-over:${b.id}`;
        const warnKey = `budget-warn:${b.id}`;

        if (b.percentage > 100) {
          if (shouldShowToast(overKey)) {
            toast.error(`"${b.name}" đã vượt hạn mức!`, {
              description: `Đã chi ${fmt(b.spent)} trên ${fmt(b.budget)} (${b.percentage.toFixed(1)}%)`,
              duration: 6000,
            });
            // Toast shown → also add notification center (once per session)
            addNotification({
              type: "error",
              title: "⚠️ Vượt hạn mức ngân sách",
              message: `"${b.name}" đã chi ${fmt(b.spent)}/${fmt(b.budget)} (${b.percentage.toFixed(1)}%)`,
              link: `/budgets/${b.id}`,
            });
          }
        } else if (b.percentage >= 80 && b.percentage <= 100) {
          if (shouldShowToast(warnKey)) {
            toast.warning(`"${b.name}" sắp đạt hạn mức`, {
              description: `Đã dùng ${b.percentage.toFixed(1)}% (${fmt(b.spent)}/${fmt(b.budget)})`,
              duration: 5000,
            });
            // Toast shown → also add notification center (once per session)
            addNotification({
              type: "warning",
              title: "⚠️ Ngân sách sắp hết",
              message: `"${b.name}" đã dùng ${b.percentage.toFixed(1)}% (${fmt(b.spent)}/${fmt(b.budget)})`,
              link: `/budgets/${b.id}`,
            });
          }
        }
      });
    } catch {
      toast.error("Không thể tải danh sách ngân sách");
    } finally {
      setIsLoading(false);
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPct =
    totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const overCount = budgets.filter((b) => b.percentage > 100).length;
  const warningCount = budgets.filter(
    (b) => b.percentage >= 80 && b.percentage <= 100,
  ).length;
  const onTrackCount = budgets.filter((b) => b.percentage < 80).length;

  const pieData = budgets
    .filter((b) => b.spent > 0)
    .map((b) => ({ name: b.name, value: b.spent, color: b.pieColor }));
  const displayBudgets = budgets;

  const handleAddBudget = async (data) => {
    try {
      await budgetApi.createExpenseBudget(data);
      await fetchBudgets();
      toast.success("Đã thêm ngân sách!");
      addNotification({
        type: "success",
        title: "Ngân sách mới",
        message: "Đã tạo ngân sách thành công",
        link: "/budgets",
      });
    } catch {
      toast.error("Không thể thêm ngân sách");
      addNotification({
        type: "error",
        title: "Lỗi",
        message: "Không thể thêm ngân sách",
      });
    }
  };

  const handleEditBudget = async (id, data) => {
    try {
      await budgetApi.updateExpenseBudget(id, data);
      await fetchBudgets();
      toast.success("Đã cập nhật ngân sách!");
      setEditingBudget(null);
      addNotification({
        type: "success",
        title: "Đã cập nhật",
        message: "Ngân sách đã được cập nhật",
      });
    } catch {
      toast.error("Không thể cập nhật ngân sách");
      addNotification({
        type: "error",
        title: "Lỗi",
        message: "Không thể cập nhật ngân sách",
      });
    }
  };

  const handleDeleteBudget = async (id, name) => {
    if (!await confirmDialog(`Xóa ngân sách "${name}"?`)) return;
    try {
      await budgetApi.deleteBudget(id);
      await fetchBudgets();
      toast.success(`Đã xóa "${name}".`);
      addNotification({
        type: "warning",
        title: "Đã xóa",
        message: `Đã xóa ngân sách "${name}"`,
      });
    } catch {
      toast.error("Không thể xóa ngân sách");
      addNotification({
        type: "error",
        title: "Lỗi",
        message: "Không thể xóa ngân sách",
      });
    }
  };

  return (
    <PageLayout
      title="Ngân sách"
      subtitle="Theo dõi chi tiêu của bạn theo từng danh mục"
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Thêm ngân sách</span>
        </button>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm font-medium">
              Tổng ngân sách
            </span>
            <TrendingUp size={20} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground">
            {fmt(totalBudget)}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {budgets.length} ngân sách đang hoạt động
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm font-medium">
              Tổng chi tiêu
            </span>
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-3xl font-bold text-card-foreground">
            {fmt(totalSpent)}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {totalBudget > 0
              ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% ngân sách`
              : "—"}
          </p>
        </div>

        <div
          className={`rounded-2xl p-6 text-white ${remaining < 0 ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-green-500 to-green-700"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className={`text-sm font-medium ${remaining < 0 ? "text-red-100" : "text-green-100"}`}
            >
              {remaining < 0 ? "Vượt hạn mức" : "Còn lại"}
            </span>
            {remaining < 0 ? (
              <AlertTriangle size={20} className="text-red-200" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-200" />
            )}
          </div>
          <p className="text-3xl font-bold">{fmt(Math.abs(remaining))}</p>
          <p
            className={`text-sm mt-1 ${remaining < 0 ? "text-red-100" : "text-green-100"}`}
          >
            {totalBudget > 0
              ? `${Math.abs((remaining / totalBudget) * 100).toFixed(1)}% ${remaining < 0 ? "vượt" : "khả dụng"}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Insights banner */}
      {budgets.length > 0 && (overCount > 0 || warningCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
          <AlertTriangle size={20} className="text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">Cần chú ý: </span>
            {overCount > 0 && (
              <span className="text-red-700 font-medium">
                {overCount} ngân sách vượt hạn mức
              </span>
            )}
            {overCount > 0 && warningCount > 0 && (
              <span className="text-muted-foreground"> · </span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-700 font-medium">
                {warningCount} sắp chạm hạn mức (&gt;80%)
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-700 font-medium">
              <CheckCircle2 size={13} />
              {onTrackCount} ổn định
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <AlertTriangle size={13} />
              {warningCount} cảnh báo
            </span>
            <span className="flex items-center gap-1 text-red-700 font-medium">
              <XCircle size={13} />
              {overCount} vượt
            </span>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-card-foreground">Tiến độ tổng thể</h2>
            <span className="text-sm font-semibold text-muted-foreground">
              {overallPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-700 ${
                overallPct >= 100
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : overallPct >= 80
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{fmt(0)}</span>
            <span>{fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-full md:max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm ngân sách..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {[
                { key: "all", label: "Tất cả" },
                { key: "on-track", label: "Ổn định" },
                { key: "warning", label: "Cảnh báo" },
                { key: "over", label: "Vượt" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === f.key ? "bg-purple-600 text-white border-purple-600" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-border rounded-lg px-3 py-2 text-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="default">Mặc định</option>
              <option value="pct-desc">% Đã dùng (Cao→Thấp)</option>
              <option value="pct-asc">% Đã dùng (Thấp→Cao)</option>
              <option value="amount">Số tiền</option>
              <option value="name">Tên A→Z</option>
            </select>
            <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-purple-600 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-purple-600 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div
              className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-accent animate-pulse"
                />
              ))}
            </div>
          ) : displayBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-card rounded-2xl border border-dashed border-border">
              <TrendingUp size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">
                Không tìm thấy ngân sách phù hợp
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayBudgets.map((b, idx) => (
                <div key={b.id} className="animate-list-item" style={{ animationDelay: `${idx * 50}ms` }}>
                  <BudgetCard
                    b={b}
                    onEdit={setEditingBudget}
                    onDelete={handleDeleteBudget}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {displayBudgets.map((b, idx) => (
                <div key={b.id} className="animate-list-item" style={{ animationDelay: `${idx * 40}ms` }}>
                  <BudgetListRow
                    b={b}
                    onEdit={setEditingBudget}
                    onDelete={handleDeleteBudget}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          )}
        </div>

        {pieData.length > 0 && (
          <div className="w-full lg:w-64 shrink-0 bg-card rounded-2xl p-5 border border-border self-start">
            <h3 className="font-bold text-card-foreground mb-4 text-sm">
              Phân bổ chi tiêu
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                  formatter={(val) => [fmt(val), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {pieData.slice(0, 5).map((d, i) => (
                <div
                  key={d.name + i}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-muted-foreground truncate">
                      {d.name}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground shrink-0 ml-2">
                    {fmt(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isLoading &&
        budgets.length === 0 &&
        !search &&
        filterStatus == "all" && (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <TrendingUp size={52} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">
              Chưa có ngân sách
            </p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Hãy tạo ngân sách đầu tiên để bắt đầu theo dõi chi tiêu
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <Plus size={18} /> Thêm ngân sách
            </button>
          </div>
        )}

      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBudget}
      />
      {editingBudget && (
        <EditBudgetModal
          budget={editingBudget}
          onClose={() => setEditingBudget(null)}
          onSave={handleEditBudget}
        />
      )}
    </PageLayout>
  );
}

import { useNavigate } from "react-router-dom";

function BudgetCard({ b, onEdit, onDelete }) {
  const { fmt } = useSettings();
  const navigate = useNavigate();
  const Icon = b.icon;
  const pct = Math.min(b.percentage, 100);
  const isOver = b.percentage > 100;
  const isWarning = b.percentage >= 80 && !isOver;

  return (
    <div
      className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => navigate(`/budgets/${b.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl ${b.bgColor} flex items-center justify-center`}
          >
            <Icon size={22} className={b.textColor} />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground leading-tight hover:text-purple-600 transition-colors">
              {b.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmt(b.spent)} / {fmt(b.budget)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(b);
            }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Sửa"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(b.id, b.name);
            }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500"
            title="Xóa"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 bg-gradient-to-r ${isOver ? "from-red-500 to-red-600" : isWarning ? "from-yellow-400 to-orange-500" : b.barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge percentage={b.percentage} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {b.periodType && (
            <span>
              {b.periodType === "monthly"
                ? "Hàng tháng"
                : b.periodType === "weekly"
                  ? "Hàng tuần"
                  : b.periodType === "yearly"
                    ? "Hàng năm"
                    : b.periodType}
            </span>
          )}
          {b.startDate && (
            <span className="flex items-center gap-0.5">
              <Calendar size={11} />
              {formatDate(b.startDate)}
            </span>
          )}
        </div>
      </div>

      {b.accountName && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground">
          <Wallet size={11} /> {b.accountName}
        </div>
      )}
    </div>
  );
}

function BudgetListRow({ b, onEdit, onDelete }) {
  const { fmt } = useSettings();
  const navigate = useNavigate();
  const Icon = b.icon;
  const pct = Math.min(b.percentage, 100);
  const isOver = b.percentage > 100;
  const isWarning = b.percentage >= 80 && !isOver;

  return (
    <div
      className="bg-card rounded-xl px-5 py-4 border border-border hover:shadow-sm transition-shadow group flex items-center gap-4 cursor-pointer"
      onClick={() => navigate(`/budgets/${b.id}`)}
    >
      <div
        className={`w-10 h-10 rounded-xl ${b.bgColor} flex items-center justify-center shrink-0`}
      >
        <Icon size={20} className={b.textColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-card-foreground text-sm hover:text-purple-600 transition-colors">
            {b.name}
          </span>
          <StatusBadge percentage={b.percentage} />
          {b.periodType && (
            <span className="text-xs text-muted-foreground">
              {b.periodType === "monthly"
                ? "Hàng tháng"
                : b.periodType === "weekly"
                  ? "Hàng tuần"
                  : b.periodType === "yearly"
                    ? "Hàng năm"
                    : b.periodType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${isOver ? "from-red-500 to-red-600" : isWarning ? "from-yellow-400 to-orange-500" : b.barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
            {b.percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-card-foreground">
          {fmt(b.spent)}
        </p>
        <p className="text-xs text-muted-foreground">trên {fmt(b.budget)}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(b);
          }}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(b.id, b.name);
          }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
