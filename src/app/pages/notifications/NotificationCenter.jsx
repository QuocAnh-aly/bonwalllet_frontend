import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ExternalLink,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNotifications } from '../../context/NotificationContext';
import { PageLayout } from '../../components/layout/PageLayout';

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Thành công' },
  error:   { icon: AlertCircle,  bg: 'bg-red-100',     text: 'text-red-600',   label: 'Lỗi'       },
  warning: { icon: AlertTriangle,bg: 'bg-amber-100',   text: 'text-amber-600', label: 'Cảnh báo'  },
  info:    { icon: Info,         bg: 'bg-blue-100',    text: 'text-blue-600',  label: 'Thông tin' },
};

const FILTER_OPTIONS = [
  { key: 'all',      label: 'Tất cả' },
  { key: 'unread',   label: 'Chưa đọc' },
  { key: 'success',  label: 'Thành công' },
  { key: 'error',    label: 'Lỗi' },
  { key: 'warning',  label: 'Cảnh báo' },
  { key: 'info',     label: 'Thông tin' },
];

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();

  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  return (
    <PageLayout
      title="Trung tâm thông báo"
      subtitle="Xem lịch sử thông báo và hoạt động của bạn"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Filter size={16} />
            {FILTER_OPTIONS.find(f => f.key === filter)?.label || 'Lọc'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <CheckCheck size={16} />
              Đánh dấu đã đọc
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              Xóa tất cả
            </button>
          )}
        </div>
      }
    >
      {/* Filter chips */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setFilter(opt.key); setShowFilters(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === opt.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-border text-muted-foreground hover:border-purple-400'
              }`}
            >
              {opt.label}
              {opt.key === 'all' && ` (${notifications.length})`}
              {opt.key === 'unread' && ` (${unreadCount})`}
            </button>
          ))}
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bell size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{notifications.length}</p>
            <p className="text-xs text-muted-foreground">Tổng số thông báo</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Chưa đọc</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{notifications.filter(n => n.read).length}</p>
            <p className="text-xs text-muted-foreground">Đã đọc</p>
          </div>
        </div>
      </div>

      {/* Notification list */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Bell size={48} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">
              {filter === 'all'
                ? 'Chưa có thông báo nào'
                : 'Không có thông báo nào khớp với bộ lọc'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className={`px-3 sm:px-6 py-3 sm:py-4 flex items-start gap-3 sm:gap-4 transition-colors ${
                    !n.read ? 'bg-purple-50/40 hover:bg-purple-50/60' : 'hover:bg-muted'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div>
                        <p className={`text-sm ${!n.read ? 'font-semibold text-card-foreground' : 'font-medium text-foreground'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{n.message}</p>
                        )}
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-600 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(n.time), "HH:mm:ss, dd/MM/yyyy", { locale: vi })}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.link && (
                      <button
                        onClick={() => { markAsRead(n.id); navigate(n.link); }}
                        className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Xem chi tiết"
                      >
                        <ExternalLink size={15} />
                      </button>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Đánh dấu đã đọc"
                      >
                        <CheckCheck size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
