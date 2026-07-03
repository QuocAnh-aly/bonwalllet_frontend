// ─────────────────────────────────────────────────────────────────────────────
// Khóa mã hóa cho dữ liệu offline (IndexedDB cache + hàng đợi đồng bộ).
//
// Dùng một "device key" AES-GCM 256-bit sinh ngẫu nhiên, lưu ở localStorage dạng
// raw base64. Mục tiêu: dữ liệu tài chính trong IndexedDB KHÔNG nằm dạng plaintext
// (chống đọc lén qua extension/devtools/đồng bộ hồ sơ trình duyệt). Đây là mã hóa
// "tại chỗ" với khóa cục bộ — có thể nâng cấp sang khóa dẫn xuất từ PIN sau này.
// Khóa độc lập với App Lock để cache luôn giải mã được, kể cả khi chưa đặt PIN.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_STORAGE = "app_offline_key";

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

let keyPromise = null;

async function loadOrCreateKey() {
  const existing = localStorage.getItem(KEY_STORAGE);
  if (existing) {
    return crypto.subtle.importKey(
      "raw",
      fromB64(existing),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable — để lưu xuống localStorage
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  localStorage.setItem(KEY_STORAGE, toB64(raw));
  return key;
}

function getKey() {
  if (!keyPromise) keyPromise = loadOrCreateKey();
  return keyPromise;
}

// Mã hóa một object JSON → { iv, blob } (base64).
export async function encryptJson(obj) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(obj));
  const blob = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv: toB64(iv), blob: toB64(blob) };
}

// Giải mã { iv, blob } → object JSON.
export async function decryptJson(record) {
  const key = await getKey();
  const out = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(record.iv) },
    key,
    fromB64(record.blob),
  );
  return JSON.parse(dec.decode(out));
}

// Xóa khóa (dùng khi đăng xuất + xóa cache).
export function resetOfflineKey() {
  localStorage.removeItem(KEY_STORAGE);
  keyPromise = null;
}
