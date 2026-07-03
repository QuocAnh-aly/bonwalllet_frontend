import { db } from "../db/offlineDb";
import { encryptJson, decryptJson } from "../security/keyHolder";

// Phân biệt lỗi mạng (offline / không kết nối được) với lỗi HTTP (4xx/5xx).
// axios: lỗi mạng thì không có `response`.
export function isNetworkError(err) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!err) return false;
  if (err.response) return false; // server đã trả lời → không phải lỗi mạng
  return (
    err.code === "ERR_NETWORK" ||
    err.message === "Network Error" ||
    err.code === "ECONNABORTED"
  );
}

// Đọc-xuyên-cache: online → gọi API, lưu bản mã hóa, trả dữ liệu tươi.
// offline / lỗi mạng → đọc bản cache đã giải mã (nếu có), ngược lại ném lỗi.
export async function readThrough(key, fetcher) {
  try {
    const data = await fetcher();
    try {
      const record = await encryptJson(data);
      await db.cache.put({ key, updatedAt: Date.now(), ...record });
    } catch {
      // Lỗi ghi cache không được làm hỏng luồng đọc.
    }
    return data;
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    const cached = await db.cache.get(key);
    if (cached) return decryptJson(cached);
    throw err;
  }
}

// Xóa toàn bộ cache offline (đăng xuất, đổi tài khoản…).
export async function clearOfflineCache() {
  try {
    await db.cache.clear();
  } catch {
    // im lặng
  }
}
