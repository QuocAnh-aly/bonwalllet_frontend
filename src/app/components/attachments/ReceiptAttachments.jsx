import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Upload, Trash2, FileText, X, Download, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { attachmentApi } from "../../api/attachmentApi";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { confirmDialog } from "../../utils/confirmDialog";

const isImage = (mime) => !!mime && mime.startsWith("image/");

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const errMsg = (e) =>
  e?.response?.data?.message || e?.message || "Lỗi không xác định";

/**
 * Khu vực đính kèm ảnh hóa đơn/chứng từ cho một đối tượng.
 * @param {"transaction"|"bill"|"budget"|"account"|"piggy"|"tag"} type
 * @param {number} id  id của đối tượng (giao dịch = journalId, hóa đơn = bill_id)
 * @param {boolean} [readOnly]
 */
export function ReceiptAttachments({ type, id, readOnly = false }) {
  const online = useOnlineStatus();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState({}); // attachment_id → objectURL (ảnh)
  const [lightbox, setLightbox] = useState(null); // { url, name }
  const fileInputRef = useRef(null);
  const urlsRef = useRef([]); // các objectURL đã tạo, để thu hồi

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, []);

  const loadThumbnails = useCallback(async (list) => {
    const map = {};
    for (const a of list) {
      if (!isImage(a.mime)) continue;
      try {
        const blob = await attachmentApi.download(a.attachment_id);
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        map[a.attachment_id] = url;
      } catch {
        // bỏ qua ảnh lỗi
      }
    }
    setPreviews(map);
  }, []);

  const refresh = useCallback(async () => {
    if (!id || !online) return;
    setLoading(true);
    try {
      const list = await attachmentApi.listByAttachable(type, id);
      revokeAll();
      setItems(Array.isArray(list) ? list : []);
      await loadThumbnails(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [type, id, online, revokeAll, loadThumbnails]);

  useEffect(() => {
    refresh();
    return revokeAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, online]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const f of files) {
        try {
          await attachmentApi.upload(type, id, f);
          ok++;
        } catch (e) {
          toast.error(`${f.name}: ${errMsg(e)}`);
        }
      }
      if (ok > 0) {
        toast.success(`Đã tải lên ${ok} tệp.`);
        await refresh();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (a) => {
    if (!(await confirmDialog(`Xóa "${a.title || a.filename}"?`, { destructive: true })))
      return;
    try {
      await attachmentApi.remove(a.attachment_id);
      toast.success("Đã xóa đính kèm.");
      await refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const openFile = async (a) => {
    if (isImage(a.mime) && previews[a.attachment_id]) {
      setLightbox({ url: previews[a.attachment_id], name: a.title || a.filename });
      return;
    }
    // Không phải ảnh (PDF…) → tải blob rồi mở tab mới.
    try {
      const blob = await attachmentApi.download(a.attachment_id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Paperclip size={16} className="text-purple-600" />
          Hóa đơn / chứng từ đính kèm
          {items.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({items.length})
            </span>
          )}
        </h3>

        {!readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!online || uploading || !id}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
              title={!online ? "Cần kết nối mạng" : "Tải lên ảnh hóa đơn"}
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Tải lên
            </button>
          </>
        )}
      </div>

      {!online ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <WifiOff size={14} />
          Cần kết nối mạng để xem và đính kèm hóa đơn.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
          <Loader2 size={16} className="animate-spin" /> Đang tải…
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Chưa có hóa đơn nào. {!readOnly && "Bấm “Tải lên” để thêm ảnh chụp."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((a) => (
            <div
              key={a.attachment_id}
              className="group relative rounded-xl border border-border overflow-hidden bg-muted/30"
            >
              <button
                type="button"
                onClick={() => openFile(a)}
                className="block w-full aspect-square"
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
                    <span className="text-[10px] px-2 truncate max-w-full">
                      {a.filename}
                    </span>
                  </div>
                )}
              </button>

              <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] truncate">{formatSize(a.size)}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    className="opacity-80 hover:opacity-100 hover:text-red-300 transition"
                    title="Xóa"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
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
