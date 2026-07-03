import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  User,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat2,
  Layers,
  Bot,
  BookOpen,
  Tag,
  BarChart2,
  Download,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Receipt,
  Landmark,
  DollarSign,
  FileText,
  Webhook,
  Globe,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
  Menu,
  Lock,
  WifiOff,
  RefreshCw,
  CloudUpload,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppLock } from "../../context/AppLockContext";
import { useSync } from "../../context/SyncContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { toast } from "sonner";
import { NotificationBell } from "../notifications/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/overlays/sheet";
import { useIsMobile } from "../ui/use-mobile";

// ──────────────────────────────────────────────
// Helper: NavItem (leaf node — no children)
// ──────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          isActive
            ? "bg-purple-100 text-purple-700 font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-card-foreground font-medium"
        }`
      }
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span>{label}</span>
    </NavLink>
  );
}

// ──────────────────────────────────────────────
// Helper: SubMenuItem — indented child link
// ──────────────────────────────────────────────
function SubMenuItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-[13px] transition-all duration-150 ${
          isActive
            ? "bg-purple-100 text-purple-700 font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
        }`
      }
    >
      {Icon && <Icon size={14} className="shrink-0 opacity-70" />}
      <span>{label}</span>
    </NavLink>
  );
}

// ──────────────────────────────────────────────
// Helper: CollapsibleMenu — parent with children
// ──────────────────────────────────────────────
function CollapsibleMenu({ icon: Icon, label, children, matchPaths = [] }) {
  const location = useLocation();
  const isAnyChildActive = matchPaths.some((p) =>
    location.pathname.startsWith(p),
  );
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          isAnyChildActive
            ? "bg-purple-50 text-purple-700 font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-card-foreground font-medium"
        }`}
      >
        {Icon && <Icon size={16} className="shrink-0" />}
        <span className="flex-1 text-left">{label}</span>
        {open ? (
          <ChevronDown size={14} className="opacity-50" />
        ) : (
          <ChevronRight size={14} className="opacity-50" />
        )}
      </button>

      {/* Animated dropdown */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "max-h-96 opacity-100 mt-0.5" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-0.5 pb-1">{children}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Helper: Section divider with label
// ──────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground select-none">
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 my-1 border-t border-sidebar-border" />;
}

// ──────────────────────────────────────────────
// Sidebar content (shared between desktop & mobile)
// ──────────────────────────────────────────────
function SidebarContent({ onNavClick }) {
  const { user, logout } = useAuth();
  const { hasPin, lock } = useAppLock();
  const { pendingCount, syncing, syncNow } = useSync();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo + Notification Bell */}
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">
            MoneyFlow
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Quản lý chi tiêu
          </p>
        </div>
        <div className="hidden md:block">
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        {/* Dashboard */}
        <NavItem
          to="/"
          icon={LayoutDashboard}
          label="Tổng quan"
          end
          onClick={onNavClick}
        />

        <Divider />

        {/* ── FINANCIAL CONTROL ── */}
        <SectionLabel label="Kiểm soát tài chính" />

        <NavItem
          to="/budgets"
          icon={TrendingUp}
          label="Ngân sách"
          onClick={onNavClick}
        />
        <NavItem
          to="/subscriptions"
          icon={Repeat2}
          label="Hóa đơn định kỳ"
          onClick={onNavClick}
        />
        <NavItem
          to="/piggy-banks"
          icon={PiggyBank}
          label="Lợn tiết kiệm"
          onClick={onNavClick}
        />

        <Divider />

        {/* ── ACCOUNTING ── */}
        <SectionLabel label="Kế toán" />

        {/* Transactions submenu */}
        <CollapsibleMenu
          icon={ArrowRightLeft}
          label="Giao dịch"
          matchPaths={["/transactions"]}
        >
          <SubMenuItem
            to="/transactions/withdrawal"
            icon={ArrowDownLeft}
            label="Chi tiêu"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/transactions/deposit"
            icon={ArrowUpRight}
            label="Thu nhập"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/transactions/transfers"
            icon={Repeat2}
            label="Chuyển khoản"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/transactions/all"
            icon={Layers}
            label="Tất cả giao dịch"
            onClick={onNavClick}
          />
        </CollapsibleMenu>

        {/* Automation submenu */}
        {/* <CollapsibleMenu
          icon={Bot}
          label="Tự động hóa"
          matchPaths={["/rules", "/recurring", "/webhooks"]}
        >
          <SubMenuItem
            to="/rules"
            icon={BookOpen}
            label="Quy tắc"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/recurring"
            icon={Repeat2}
            label="Định kỳ"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/webhooks"
            icon={Webhook}
            label="Webhooks"
            onClick={onNavClick}
          />
        </CollapsibleMenu>
 */}
        <Divider />

        {/* ── OTHERS ── */}
        <SectionLabel label="Khác" />

        {/* Accounts submenu */}
        <CollapsibleMenu
          icon={Landmark}
          label="Tài khoản"
          matchPaths={["/accounts"]}
        >
          <SubMenuItem
            to="/accounts/asset"
            icon={Wallet}
            label="Tài sản"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/accounts/liabilities"
            icon={FileText}
            label="Nợ phải trả"
            onClick={onNavClick}
          />
        </CollapsibleMenu>

        {/* Classification submenu */}
        <CollapsibleMenu
          icon={Tag}
          label="Phân loại"
          matchPaths={["/categories", "/tags", "/object-groups"]}
        >
          <SubMenuItem
            to="/categories"
            icon={BookOpen}
            label="Danh mục"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/tags"
            icon={Tag}
            label="Nhãn"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/object-groups"
            icon={Layers}
            label="Nhóm đối tượng"
            onClick={onNavClick}
          />
        </CollapsibleMenu>

        <NavItem
          to="/reports"
          icon={BarChart2}
          label="Báo cáo"
          onClick={onNavClick}
        />
        <NavItem
          to="/export"
          icon={Download}
          label="Xuất dữ liệu"
          onClick={onNavClick}
        />

        <Divider />

        {/* ── OPTIONS ── */}
        <SectionLabel label="Tùy chọn" />

        <CollapsibleMenu
          icon={Settings}
          label="Cài đặt"
          matchPaths={[
            "/profile",
            "/preferences",
            "/currencies",
            "/exchange-rates",
            "/administrations",
            "/settings",
          ]}
        >
          <SubMenuItem
            to="/profile"
            icon={User}
            label="Hồ sơ cá nhân"
            onClick={onNavClick}
          />
          {/* <SubMenuItem
            to="/profile/oauth"
            icon={KeyRound}
            label="Mã OAuth"
            onClick={onNavClick}
          /> */}
          <SubMenuItem
            to="/preferences"
            icon={SlidersHorizontal}
            label="Tùy chọn hiển thị"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/currencies"
            icon={DollarSign}
            label="Tiền tệ"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/exchange-rates"
            icon={Globe}
            label="Tỷ giá hối đoái"
            onClick={onNavClick}
          />
          <SubMenuItem
            to="/administrations"
            icon={ShieldCheck}
            label="Quản trị"
            onClick={onNavClick}
          />
          {/* <SubMenuItem
            to="/settings"
            icon={Settings}
            label="Cài đặt hệ thống"
            onClick={onNavClick}
          /> */}
        </CollapsibleMenu>
      </nav>

      {/* ── Sync bar (chỉ hiện khi có mục chờ đồng bộ) ── */}
      {pendingCount > 0 && (
        <div className="px-3 pt-3">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-sm font-medium disabled:opacity-70"
            title="Đồng bộ ngay"
          >
            <span className="flex items-center gap-2">
              <CloudUpload size={16} />
              {pendingCount} mục chờ đồng bộ
            </span>
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      {/* ── User Footer ── */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
            {user?.avatarInitials || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground truncate">
              {user?.userName || "User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
          {hasPin && (
            <button
              onClick={lock}
              className="text-muted-foreground hover:text-purple-600 transition-colors p-1 rounded-md hover:bg-purple-50"
              title="Khóa ngay"
            >
              <Lock size={16} />
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Layout
// ──────────────────────────────────────────────
export function Layout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const online = useOnlineStatus();

  // Scroll to top on route change (pairs with page transition animation)
  useEffect(() => {
    const el = document.querySelector("main");
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="flex h-screen bg-muted">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col shrink-0 shadow-sm">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar (Sheet drawer) ── */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[280px] sm:max-w-[300px] p-0 bg-sidebar"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Thanh bên</SheetTitle>
            <SheetDescription>Menu điều hướng ứng dụng</SheetDescription>
          </SheetHeader>
          <SidebarContent onNavClick={closeMobileSidebar} />
        </SheetContent>
      </Sheet>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Offline banner */}
        {!online && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium sticky top-0 z-20">
            <WifiOff size={16} />
            <span>Đang ngoại tuyến — thay đổi sẽ được lưu và đồng bộ khi có mạng.</span>
          </div>
        )}
        {/* Mobile header bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              MoneyFlow
            </h1>
          </div>
          <NotificationBell />
        </div>
        <div className="flex-1">
          <div
            key={location.pathname}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
