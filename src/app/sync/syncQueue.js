import { db } from "../db/offlineDb";
import { encryptJson, decryptJson } from "../security/keyHolder";
import { isNetworkError } from "../offline/offlineCache";
import axiosClient from "../api/axiosClient";

// Hàng đợi các mutation tạo khi offline. Payload được mã hóa trước khi lưu vào
// IndexedDB; khi có mạng sẽ gửi lại theo thứ tự FIFO.

const emitChanged = () =>
  window.dispatchEvent(new Event("sync:changed"));

export async function enqueueMutation({ method, url, data }) {
  const record = await encryptJson({ method, url, data });
  await db.syncQueue.add({ createdAt: Date.now(), ...record });
  emitChanged();
}

export async function getPendingCount() {
  try {
    return await db.syncQueue.count();
  } catch {
    return 0;
  }
}

let processing = false;

// Gửi lại toàn bộ hàng đợi theo FIFO. Dừng khi gặp lỗi mạng (vẫn offline);
// bỏ qua mục bị server từ chối hoặc giải mã hỏng để không kẹt hàng đợi.
export async function processQueue() {
  if (processing) return { sent: 0, failed: 0 };
  processing = true;
  let sent = 0;
  let failed = 0;
  try {
    const items = await db.syncQueue.orderBy("id").toArray();
    for (const item of items) {
      let payload;
      try {
        payload = await decryptJson(item);
      } catch {
        await db.syncQueue.delete(item.id); // bản ghi hỏng → bỏ
        continue;
      }
      try {
        await axiosClient.request({
          method: payload.method,
          url: payload.url,
          data: payload.data,
        });
        await db.syncQueue.delete(item.id);
        sent++;
      } catch (err) {
        if (isNetworkError(err)) {
          failed++;
          break; // vẫn mất mạng → dừng, giữ nguyên các mục còn lại
        }
        // Server từ chối (4xx/5xx) → bỏ để tránh lặp vô hạn.
        await db.syncQueue.delete(item.id);
        failed++;
      }
    }
  } finally {
    processing = false;
    emitChanged();
  }
  return { sent, failed };
}
