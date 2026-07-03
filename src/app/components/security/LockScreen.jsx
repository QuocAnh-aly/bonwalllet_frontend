import { useEffect, useRef, useState } from "react";
import { Lock, ShieldCheck, LogOut } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../ui/inputs/input-otp";
import { useAppLock } from "../../context/AppLockContext";
import { useAuth } from "../../context/AuthContext";

const PIN_LENGTH = 6;

export function LockScreen() {
  const { unlock } = useAppLock();
  const { logout, user } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const submittingRef = useRef(false);

  const handleComplete = async (value) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setChecking(true);
    setError("");
    const res = await unlock(value);
    if (!res.ok) {
      setError("Mã PIN không đúng. Vui lòng thử lại.");
      setPin("");
    }
    setChecking(false);
    submittingRef.current = false;
  };

  // Tự xác minh khi nhập đủ số.
  useEffect(() => {
    if (pin.length === PIN_LENGTH) handleComplete(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg mb-6">
          <Lock size={28} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Ứng dụng đang khóa</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8">
          {user?.userName
            ? `Nhập mã PIN để tiếp tục, ${user.userName}.`
            : "Nhập mã PIN để mở khóa ứng dụng."}
        </p>

        <InputOTP
          maxLength={PIN_LENGTH}
          value={pin}
          onChange={setPin}
          disabled={checking}
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
        >
          <InputOTPGroup className="gap-2">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-12 w-12 text-lg rounded-md border-l"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="h-6 mt-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {checking && !error && (
            <p className="text-sm text-muted-foreground">Đang kiểm tra…</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-8">
          <ShieldCheck size={14} className="text-green-500" />
          <span>Mã PIN được mã hóa cục bộ, không gửi lên máy chủ.</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors mt-6"
        >
          <LogOut size={13} />
          Đăng xuất khỏi tài khoản
        </button>
      </div>
    </div>
  );
}
