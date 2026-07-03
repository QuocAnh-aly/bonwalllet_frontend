import { useState } from "react";
import { ShieldCheck, Lock, Unlock, KeyRound, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAppLock } from "../../context/AppLockContext";

const PIN_LENGTH = 6;
const isValidPin = (p) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(p);

const TIMEOUT_OPTIONS = [
  { value: 0, label: "Chỉ khi rời khỏi ứng dụng" },
  { value: 1, label: "Sau 1 phút không hoạt động" },
  { value: 5, label: "Sau 5 phút không hoạt động" },
  { value: 15, label: "Sau 15 phút không hoạt động" },
  { value: 30, label: "Sau 30 phút không hoạt động" },
];

function PinField({ label, value, onChange, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-bold text-foreground mb-2">
        {label}
      </label>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={PIN_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={"•".repeat(PIN_LENGTH)}
        className="w-full border border-border rounded-xl px-4 py-3 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground bg-card"
      />
    </div>
  );
}

export function SecuritySettingsCard() {
  const {
    hasPin,
    autoLockMins,
    setupPin,
    changePin,
    disablePin,
    setAutoLockMinutes,
    lock,
  } = useAppLock();

  const [mode, setMode] = useState(null); // 'setup' | 'change' | 'disable'
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ oldPin: "", pin: "", confirm: "" });

  const reset = () => {
    setForm({ oldPin: "", pin: "", confirm: "" });
    setMode(null);
  };

  const handleSetup = async () => {
    if (!isValidPin(form.pin)) {
      toast.error(`Mã PIN phải gồm đúng ${PIN_LENGTH} chữ số.`);
      return;
    }
    if (form.pin !== form.confirm) {
      toast.error("Mã PIN xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await setupPin(form.pin);
      toast.success("Đã bật khóa ứng dụng bằng mã PIN.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async () => {
    if (!isValidPin(form.pin)) {
      toast.error(`Mã PIN mới phải gồm đúng ${PIN_LENGTH} chữ số.`);
      return;
    }
    if (form.pin !== form.confirm) {
      toast.error("Mã PIN xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      const res = await changePin(form.oldPin, form.pin);
      if (!res.ok) {
        toast.error("Mã PIN hiện tại không đúng.");
        return;
      }
      toast.success("Đã đổi mã PIN.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      const res = await disablePin(form.oldPin);
      if (!res.ok) {
        toast.error("Mã PIN không đúng.");
        return;
      }
      toast.success("Đã tắt khóa ứng dụng.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-muted/50">
        <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <ShieldCheck size={20} className="text-purple-600" />
          Bảo mật — Khóa ứng dụng
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Trạng thái */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasPin
                ? "bg-green-100 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {hasPin ? <Lock size={18} /> : <Unlock size={18} />}
          </div>
          <div>
            <p className="font-semibold text-card-foreground">
              {hasPin ? "Đang bật" : "Chưa bật"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasPin
                ? "Ứng dụng yêu cầu mã PIN sau khi khóa."
                : "Đặt mã PIN để bảo vệ dữ liệu tài chính của bạn."}
            </p>
          </div>
        </div>

        {/* Hành động chính */}
        {!hasPin && mode !== "setup" && (
          <button
            onClick={() => setMode("setup")}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <KeyRound size={16} /> Thiết lập mã PIN
          </button>
        )}

        {mode === "setup" && (
          <div className="space-y-4 max-w-sm">
            <PinField
              label={`Mã PIN (${PIN_LENGTH} chữ số)`}
              value={form.pin}
              onChange={(v) => setForm({ ...form, pin: v })}
              autoFocus
            />
            <PinField
              label="Xác nhận mã PIN"
              value={form.confirm}
              onChange={(v) => setForm({ ...form, confirm: v })}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSetup}
                disabled={busy}
                className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70"
              >
                Lưu mã PIN
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {hasPin && (
          <>
            {/* Tự khóa */}
            <div className="max-w-sm">
              <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" /> Tự động khóa
              </label>
              <select
                value={autoLockMins}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground bg-card"
              >
                {TIMEOUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Ứng dụng luôn tự khóa khi bạn rời khỏi (chuyển tab/thu nhỏ).
              </p>
            </div>

            {/* Đổi PIN */}
            {mode === "change" ? (
              <div className="space-y-4 max-w-sm">
                <PinField
                  label="Mã PIN hiện tại"
                  value={form.oldPin}
                  onChange={(v) => setForm({ ...form, oldPin: v })}
                  autoFocus
                />
                <PinField
                  label="Mã PIN mới"
                  value={form.pin}
                  onChange={(v) => setForm({ ...form, pin: v })}
                />
                <PinField
                  label="Xác nhận mã PIN mới"
                  value={form.confirm}
                  onChange={(v) => setForm({ ...form, confirm: v })}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChange}
                    disabled={busy}
                    className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70"
                  >
                    Đổi mã PIN
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : mode === "disable" ? (
              <div className="space-y-4 max-w-sm">
                <PinField
                  label="Nhập mã PIN để tắt khóa"
                  value={form.oldPin}
                  onChange={(v) => setForm({ ...form, oldPin: v })}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDisable}
                    disabled={busy}
                    className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70"
                  >
                    Tắt khóa
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMode("change")}
                  className="flex items-center gap-2 px-5 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
                >
                  <KeyRound size={16} /> Đổi mã PIN
                </button>
                <button
                  onClick={lock}
                  className="flex items-center gap-2 px-5 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
                >
                  <Lock size={16} /> Khóa ngay
                </button>
                <button
                  onClick={() => setMode("disable")}
                  className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Unlock size={16} /> Tắt khóa
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
