import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, FileText, X, Download, Loader2, WifiOff } from "lucide-react";
import { attachmentApi } from "../../api/attachmentApi";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

const isImage = (mime) => !!mime && mime.startsWith("image/");

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/**
 * Gom và hiển thị (chỉ xem) các tệp đính kèm của nhiều giao dịch — dùng ở trang
 * chi tiết hóa đơn để thấy ảnh hóa đơn đã đính kèm khi ghi chi tiêu.
 * @param {number[]} journalIds  danh sách journalId của các giao dịch đã khớp
 */
export function TransactionReceiptsGallery({ journalIds = [] }) {
  const online = useOnlineStatus();
  const [items, setItems] = useState([]); // attachment kèm thông tin
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState({}); // attachment_id → objectURL
  const [lightbox, setLightbox] = useState(null);
  const urlsRef = useRef([]);

  const key = journalIds.join(",");

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!online || journalIds.length === 0) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const all = [];
        for (const jid of journalIds) {
          try {
            const list = await attachmentApi.listByAttachable("transaction", jid);
            if (Array.isArray(list)) all.push(...list);
          } catch {
            // bỏ qua giao dịch lỗi
          }
        }
        if (cancelled) return;
        revokeAll();
        setItems(all);
        // Tải thumbnail cho ảnh
        const map = {};
        for (const a of all) {
          if (!isImage(a.mime)) continue;
          try {
            const blob = await attachmentApi.download(a.attachment_id);
            const url = URL.createObjectURL(blob);
            urlsRef.current.push(url);
            map[a.attachment_id] = url;
          } catch {
            /* bỏ qua */
          }
        }
        if (!cancelled) setPreviews(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
      revokeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, online]);

  const openFile = async (a) => {
    if (isImage(a.mime) && previews[a.attachment_id]) {
      setLightbox({ url: previews[a.attachment_id], name: a.title || a.filename });
      return;
    }
    try {
      const blob = await attachmentApi.download(a.attachment_id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
        <Paperclip size={16} className="text-purple-600" />
        Hóa đơn từ các giao dịch
        {items.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
        )}
      </h3>

      {!online ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <WifiOff size={14} />
          Cần kết nối mạng để xem hóa đơn đính kèm.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
          <Loader2 size={16} className="animate-spin" /> Đang tải…
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Chưa có hóa đơn đính kèm trong các giao dịch của hóa đơn này.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((a) => (
            <button
              key={a.attachment_id}
              type="button"
              onClick={() => openFile(a)}
              className="group relative rounded-xl border border-border overflow-hidden bg-muted/30 aspect-square"
              title={a.title || a.filename}
            >
              {isImage(a.mime) && previews[a.attachment_id] ? (
                <img
                  src={previews[a.attachment_id]}
                  alt={a.title || a.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                  <FileText size={28} />
                  <span className="text-[10px] px-2 truncate max-w-full">{a.filename}</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white px-2 py-1">
                <span className="text-[10px] truncate">{formatSize(a.size)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/90 hover:text-white"
            onClick={() => setLightbox(null)}
            title="Đóng"
          >
            <X size={28} />
          </button>
          <a
            href={lightbox.url}
            download={lightbox.name}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 text-white/90 hover:text-white"
            title="Tải xuống"
          >
            <Download size={26} />
          </a>
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
