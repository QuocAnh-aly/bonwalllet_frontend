import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Globe, Hash, Clock, CheckCircle2, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { PageLayout } from "../../components/layout/PageLayout";
import { useSettings } from "../../context/SettingsContext";
import { SecuritySettingsCard } from "../../components/security/SecuritySettingsCard";

const NUMBER_FORMATS = [
  { value: "vi-VN", label: "1.000.000,00 (Việt Nam)" },
  { value: "en-US", label: "1,000,000.00 (Mỹ/Anh)" },
  { value: "fr-FR", label: "1 000 000,00 (Pháp/Châu Âu)" },
];

const WEEK_DAYS = [
  { value: "1", label: "Thứ Hai (Khuyến nghị)" },
  { value: "0", label: "Chủ Nhật" },
  { value: "6", label: "Thứ Bảy" },
];

export function Preferences() {
  const { theme, setTheme } = useTheme();
  const {
    currencies, currency, setDefaultCurrency,
    numberFormat, firstDayOfWeek, savePreferences,
  } = useSettings();

  const [isSaving, setIsSaving] = useState(false);

  // Local form state — applied only when the user clicks "Lưu thay đổi".
  const [formData, setFormData] = useState({
    theme: theme || "light",
    currency,
    numberFormat,
    firstDayOfWeek: String(firstDayOfWeek ?? 1),
  });

  // Keep the form in sync with context values once they hydrate from the
  // server (currency list / preferences arrive asynchronously on first load).
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      theme: theme || prev.theme,
      currency,
      numberFormat,
      firstDayOfWeek: String(firstDayOfWeek ?? 1),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, numberFormat, firstDayOfWeek, theme]);

  const errMsg = (e) => e?.response?.data?.message || e?.message || "Lỗi không xác định";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Apply theme (next-themes persists it locally).
      setTheme(formData.theme);

      // Currency change is a real app-wide action (sets the primary currency).
      if (formData.currency && formData.currency !== currency) {
        await setDefaultCurrency(formData.currency);
      }

      // Number format + first day of week are stored locally per browser.
      savePreferences({
        numberFormat: formData.numberFormat,
        firstDayOfWeek: formData.firstDayOfWeek,
      });

      toast.success("Đã lưu các tùy chọn hiển thị!");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout
      title="Tùy chọn hiển thị"
      subtitle="Cá nhân hóa giao diện và định dạng dữ liệu cho ứng dụng"
      actions={
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
          <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
        </button>
      }
    >

      <div className="space-y-8">

        {/* Theme Settings */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/50">
            <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <Monitor size={20} className="text-purple-600" />
              Giao diện (Theme)
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Light Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'light' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-border hover:border-accent'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'light'} onChange={() => setFormData({...formData, theme: 'light'})} />
                <div className="bg-muted rounded-lg p-4 h-full">
                  <Sun size={28} className="text-amber-500 mb-3" />
                  <p className="font-bold text-card-foreground flex items-center justify-between">
                    Sáng (Light)
                    {formData.theme === 'light' && <CheckCircle2 size={16} className="text-purple-600" />}
                  </p>
                </div>
              </label>

              {/* Dark Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'dark' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-border hover:border-accent'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'dark'} onChange={() => setFormData({...formData, theme: 'dark'})} />
                <div className="bg-slate-900 rounded-lg p-4 h-full">
                  <Moon size={28} className="text-blue-400 mb-3" />
                  <p className="font-bold text-white flex items-center justify-between">
                    Tối (Dark)
                    {formData.theme === 'dark' && <CheckCircle2 size={16} className="text-purple-400" />}
                  </p>
                </div>
              </label>

              {/* System Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'system' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-border hover:border-accent'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'system'} onChange={() => setFormData({...formData, theme: 'system'})} />
                <div className="bg-gradient-to-br from-slate-100 to-slate-800 rounded-lg p-4 h-full">
                  <Monitor size={28} className="text-muted-foreground mb-3" />
                  <p className="font-bold text-foreground flex items-center justify-between mix-blend-overlay">
                    Hệ thống
                    {formData.theme === 'system' && <CheckCircle2 size={16} className="text-purple-900" />}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/50">
            <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <Globe size={20} className="text-purple-600" />
              Khu vực & Định dạng
            </h2>
          </div>
          <div className="p-6 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-muted-foreground" /> Tiền tệ mặc định
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground bg-card"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Đơn vị tiền tệ chính hiển thị toàn ứng dụng. Quản lý danh sách tại trang <strong>Tiền tệ</strong>.
                </p>
              </div>

              {/* Number Format */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <Hash size={16} className="text-muted-foreground" /> Định dạng số
                </label>
                <select
                  value={formData.numberFormat}
                  onChange={(e) => setFormData({...formData, numberFormat: e.target.value})}
                  className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground bg-card"
                >
                  {NUMBER_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">Định dạng phân cách hàng nghìn và phần thập phân.</p>
              </div>

              {/* Start of Week */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" /> Ngày đầu tuần
                </label>
                <select
                  value={formData.firstDayOfWeek}
                  onChange={(e) => setFormData({...formData, firstDayOfWeek: e.target.value})}
                  className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground bg-card"
                >
                  {WEEK_DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">Ảnh hưởng đến lịch chọn ngày và các báo cáo theo tuần.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Security — App Lock PIN */}
        <SecuritySettingsCard />

      </div>
    </PageLayout>
  );
}
