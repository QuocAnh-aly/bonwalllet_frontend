// ─────────────────────────────────────────────────────────────────────────────
// App Lock PIN — mã hóa bằng Web Crypto (PBKDF2 → AES-GCM 256-bit).
//
// Không bao giờ lưu PIN gốc. Thay vào đó lưu một "verifier": một đoạn văn bản cố
// định được mã hóa bằng khóa dẫn xuất từ PIN. Khi mở khóa, ta dẫn xuất lại khóa
// từ PIN người dùng nhập và thử giải mã verifier — khớp thì PIN đúng. Khóa AES
// dẫn xuất cũng được trả về để giữ trong RAM, dùng cho mã hóa dữ liệu offline ở
// các giai đoạn sau (A2/A3). Khóa KHÔNG được lưu xuống đĩa.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_TEXT = "MONEYFLOW_PINLOCK_V1";
const PBKDF2_ITERATIONS = 150_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (str) =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function deriveAesKey(pin, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Tạo credential từ một PIN mới.
 * @returns {Promise<{cred: object, key: CryptoKey}>} cred để lưu localStorage,
 *          key (AES-GCM) để giữ trong RAM khi đã mở khóa.
 */
export async function createPinCredential(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(pin, salt, PBKDF2_ITERATIONS);
  const blob = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(VERIFY_TEXT),
  );
  return {
    cred: {
      v: 1,
      salt: toB64(salt),
      iv: toB64(iv),
      blob: toB64(blob),
      iter: PBKDF2_ITERATIONS,
    },
    key,
  };
}

/**
 * Kiểm tra PIN với credential đã lưu.
 * @returns {Promise<{ok: boolean, key?: CryptoKey}>}
 */
export async function verifyPinCredential(pin, cred) {
  try {
    const key = await deriveAesKey(pin, fromB64(cred.salt), cred.iter);
    const out = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(cred.iv) },
      key,
      fromB64(cred.blob),
    );
    if (dec.decode(out) === VERIFY_TEXT) return { ok: true, key };
    return { ok: false };
  } catch {
    // Sai PIN → AES-GCM ném lỗi xác thực thẻ (tag) → coi như sai.
    return { ok: false };
  }
}
