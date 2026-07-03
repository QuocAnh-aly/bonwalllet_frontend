import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPinCredential, verifyPinCredential } from "../security/pinCrypto";

// ─────────────────────────────────────────────────────────────────────────────
// App Lock — khóa ứng dụng bằng PIN (client-only, không đụng backend).
//
// - hasPin       : đã thiết lập PIN chưa
// - isLocked     : đang bị khóa (cần nhập PIN để vào)
// - aesKey       : khóa AES-GCM giữ trong RAM sau khi mở khóa (dùng cho offline)
// - autoLockMins : số phút không hoạt động thì tự khóa (0 = chỉ khóa khi ẩn tab)
//
// PIN được lưu theo TỪNG user (`app_pin_cred:<userId>`) để tài khoản này không
// dùng nhầm PIN của tài khoản khác trên cùng trình duyệt. Khi đổi user
// (đăng nhập/đăng xuất) trạng thái khóa được nạp lại theo user hiện tại.
//
// Tự khóa khi: tab bị ẩn (visibilitychange) hoặc quá thời gian không hoạt động.
// Mặc định khi tải lại trang mà đã có PIN → ở trạng thái khóa.
// ─────────────────────────────────────────────────────────────────────────────

const CRED_PREFIX = "app_pin_cred"; // key per-user: `app_pin_cred:<userId>`
const TIMEOUT_PREFIX = "app_lock_timeout"; // key per-user: `app_lock_timeout:<userId>`
// Key global cũ (không gắn user) — dọn đi để PIN cũ không lẫn sang tài khoản khác.
const LEGACY_CRED_KEY = "app_pin_cred";
const LEGACY_TIMEOUT_KEY = "app_lock_timeout";
const DEFAULT_TIMEOUT_MINS = 5;

const AppLockContext = createContext(null);

const getUserId = () => localStorage.getItem("user_id") || null;
const credKeyFor = (uid) => (uid ? `${CRED_PREFIX}:${uid}` : null);
const timeoutKeyFor = (uid) => (uid ? `${TIMEOUT_PREFIX}:${uid}` : null);

const readCredFor = (uid) => {
  const key = credKeyFor(uid);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readTimeoutFor = (uid) => {
  const key = timeoutKeyFor(uid);
  if (!key) return DEFAULT_TIMEOUT_MINS;
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TIMEOUT_MINS;
};

export function AppLockProvider({ children }) {
  const initialUserId = getUserId();
  const userIdRef = useRef(initialUserId);
  const [cred, setCred] = useState(() => readCredFor(initialUserId));
  const [isLocked, setIsLocked] = useState(() => !!readCredFor(initialUserId));
  const [aesKey, setAesKey] = useState(null);
  const [autoLockMins, setAutoLockMins] = useState(() => readTimeoutFor(initialUserId));

  const hasPin = !!cred;
  const inactivityTimer = useRef(null);

  // Dọn key global cũ (PIN không gắn user) một lần khi khởi tạo.
  useEffect(() => {
    localStorage.removeItem(LEGACY_CRED_KEY);
    localStorage.removeItem(LEGACY_TIMEOUT_KEY);
  }, []);

  // ── Theo dõi user hiện tại; đổi user → nạp lại trạng thái khóa theo user đó ──
  useEffect(() => {
    const sync = () => {
      const uid = getUserId();
      if (uid === userIdRef.current) return;
      userIdRef.current = uid;
      const c = readCredFor(uid);
      setCred(c);
      setIsLocked(!!c);
      setAesKey(null);
      setAutoLockMins(readTimeoutFor(uid));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("auth:logout", sync);
    // Đăng nhập trong cùng tab không phát "storage"; poll nhẹ để cập nhật.
    const id = setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:logout", sync);
      clearInterval(id);
    };
  }, []);

  const lock = useCallback(() => {
    if (!readCredFor(getUserId())) return; // không có PIN thì không có gì để khóa
    setAesKey(null);
    setIsLocked(true);
  }, []);

  const unlock = useCallback(async (pin) => {
    const current = readCredFor(getUserId());
    if (!current) return { ok: false, reason: "no-pin" };
    const { ok, key } = await verifyPinCredential(pin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    setAesKey(key);
    setIsLocked(false);
    window.dispatchEvent(new Event("applock:unlocked"));
    return { ok: true };
  }, []);

  const setupPin = useCallback(async (pin) => {
    const key = credKeyFor(getUserId());
    if (!key) return { ok: false, reason: "no-user" };
    const { cred: newCred, key: aes } = await createPinCredential(pin);
    localStorage.setItem(key, JSON.stringify(newCred));
    setCred(newCred);
    setAesKey(aes);
    setIsLocked(false);
    return { ok: true };
  }, []);

  const changePin = useCallback(async (oldPin, newPin) => {
    const current = readCredFor(getUserId());
    if (!current) return { ok: false, reason: "no-pin" };
    const { ok } = await verifyPinCredential(oldPin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    return setupPin(newPin);
  }, [setupPin]);

  const disablePin = useCallback(async (pin) => {
    const key = credKeyFor(getUserId());
    const current = readCredFor(getUserId());
    if (!current) return { ok: true };
    const { ok } = await verifyPinCredential(pin, current);
    if (!ok) return { ok: false, reason: "wrong-pin" };
    if (key) localStorage.removeItem(key);
    setCred(null);
    setAesKey(null);
    setIsLocked(false);
    return { ok: true };
  }, []);

  const setAutoLockMinutes = useCallback((mins) => {
    const v = Number(mins);
    const safe = Number.isFinite(v) && v >= 0 ? v : DEFAULT_TIMEOUT_MINS;
    setAutoLockMins(safe);
    const key = timeoutKeyFor(getUserId());
    if (key) localStorage.setItem(key, String(safe));
  }, []);

  // ── Tự khóa khi tab bị ẩn ────────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lock]);

  // ── Tự khóa theo thời gian không hoạt động ────────────────────────────────
  useEffect(() => {
    if (!hasPin || isLocked || autoLockMins <= 0) return;

    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(lock, autoLockMins * 60_000);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [hasPin, isLocked, autoLockMins, lock]);

  return (
    <AppLockContext.Provider
      value={{
        hasPin,
        isLocked,
        aesKey,
        autoLockMins,
        setupPin,
        unlock,
        lock,
        changePin,
        disablePin,
        setAutoLockMinutes,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
};
