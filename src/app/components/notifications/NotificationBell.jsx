import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  error:   { icon: AlertCircle,  bg: 'bg-red-100',     text: 'text-red-600'   },
  warning: { icon: AlertTriangle,bg: 'bg-amber-100',   text: 'text-amber-600' },
  info:    { icon: Info,         bg: 'bg-blue-100',    text: 'text-blue-600'  },
};

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const recent = notifications.slice(0, 10);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none min-w-[18px] min-h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-bold text-card-foreground">Thông báo</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} chưa đọc`
                  : 'Không có thông báo mới'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={() => { markAllAsRead(); }}
                    className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Đánh dấu đã đọc"
                  >
                    <CheckCheck size={16} />
                  </button>
                  <button
                    onClick={() => { clearAll(); }}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Xóa tất cả"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recent.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={`px-4 py-3 hover:bg-muted transition-colors cursor-pointer ${
                        !n.read ? 'bg-purple-50/40' : ''
                      }`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon size={14} className={cfg.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.read ? 'font-semibold text-card-foreground' : 'font-medium text-foreground'}`}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(n.time), "HH:mm, dd/MM", { locale: vi })}
                            </span>
                            {n.link && (
                              <span className="text-[10px] text-purple-500 flex items-center gap-0.5">
                                <ExternalLink size={10} /> Xem
                              </span>
                            )}
                          </div>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer — link to full page */}
          {notifications.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-semibold hover:bg-purple-50 rounded-lg transition-colors"
              >
                Xem tất cả thông báo ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
