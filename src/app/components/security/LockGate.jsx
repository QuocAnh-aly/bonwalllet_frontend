import { useEffect, useState } from "react";
import { useAppLock } from "../../context/AppLockContext";
import { hasSession } from "../../api/tokenStore";
import { LockScreen } from "./LockScreen";

// Bọc toàn bộ ứng dụng. Hiển thị màn hình khóa khi đã thiết lập PIN, đang khóa,
// VÀ người dùng đang đăng nhập (có cờ phiên). Khi chưa đăng nhập thì không
// chặn — để luồng đăng nhập/đăng xuất diễn ra bình thường.
//
// LockScreen được phủ lên trên (opaque, full-screen) thay vì thay thế children,
// nhờ vậy trạng thái route/giao diện phía dưới được giữ nguyên sau khi mở khóa.
export function LockGate({ children }) {
  const { hasPin, isLocked } = useAppLock();
  const [authed, setAuthed] = useState(hasSession);

  useEffect(() => {
    const sync = () => setAuthed(hasSession());
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

  const showLock = hasPin && isLocked && authed;

  return (
    <>
      {children}
      {showLock && <LockScreen />}
    </>
  );
}
