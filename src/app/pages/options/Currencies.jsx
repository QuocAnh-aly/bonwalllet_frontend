import { useState } from 'react';
import { Plus, Star, Search, Trash2, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';

const POPULAR_CURRENCIES = [
  { code: 'GBP', name: 'British Pound',       symbol: '£' },
  { code: 'CNY', name: 'Chinese Yuan',         symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won',     symbol: '₩' },
  { code: 'THB', name: 'Thai Baht',            symbol: '฿' },
  { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar',      symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc',          symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar',     symbol: 'HK$' },
  { code: 'MYR', name: 'Malaysian Ringgit',    symbol: 'RM' },
];

const EMPTY_FORM = { code: '', name: '', symbol: '' };

import { PageLayout } from '../../components/layout/PageLayout';
import { confirmDialog } from '../../utils/confirmDialog';

export function Currencies() {
  const { currencies, setDefaultCurrency, addCurrency, removeCurrency } = useSettings();

  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [tab, setTab]           = useState('popular'); // 'popular' | 'custom'

  const closeModal = () => {
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setTab('popular');
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim())                      e.code = 'Bắt buộc';
    else if (!/^[A-Z]{2,5}$/.test(form.code))  e.code = 'Từ 2–5 chữ in hoa (VD: USD)';
    if (!form.name.trim())                      e.name = 'Bắt buộc';
    if (!form.symbol.trim())                    e.symbol = 'Bắt buộc';
    return e;
  };

  const errMsg = (err) => err?.response?.data?.message || err?.message || 'Lỗi không xác định';

  const handleAddCustom = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    try {
      await addCurrency({ code: form.code, name: form.name.trim(), symbol: form.symbol.trim() });
      toast.success(`Đã thêm tiền tệ ${form.code}`);
      closeModal();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleAddPopular = async (curr) => {
    try {
      await addCurrency(curr);
      toast.success(`Đã thêm ${curr.code} – ${curr.name}`);
      closeModal();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleSetDefault = async (code) => {
    try {
      await setDefaultCurrency(code);
      toast.success(`Đã đặt ${code} làm tiền tệ mặc định`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const handleRemove = async (code) => {
    const curr = currencies.find(c => c.code === code);
    if (curr?.isDefault) {
      toast.error('Không thể xóa tiền tệ mặc định. Vui lòng chọn mặc định khác trước.');
      return;
    }
    if (!await confirmDialog(`Xóa tiền tệ ${code}?`)) return;
    try {
      await removeCurrency(code);
      toast.success(`Đã xóa ${code}`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const filtered = currencies.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const existingCodes = new Set(currencies.map(c => c.code));
  const availablePopular = POPULAR_CURRENCIES.filter(c => !existingCodes.has(c.code));

  return (
    <PageLayout
      title="Tiền tệ"
      subtitle="Quản lý các loại tiền tệ được sử dụng trong hệ thống"
      actions={
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Thêm tiền tệ
        </button>
      }
    >

      {/* ── Table card ─────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-card-foreground text-lg">
            Danh sách Tiền tệ
            <span className="ml-2 text-sm font-normal text-muted-foreground">({currencies.length})</span>
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo mã hoặc tên..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
              <th className="px-4 sm:px-6 py-4 font-semibold">Mã</th>
              <th className="px-4 sm:px-6 py-4 font-semibold hidden sm:table-cell">Tên tiền tệ</th>
              <th className="px-4 sm:px-6 py-4 font-semibold text-center">Ký hiệu</th>
              <th className="px-4 sm:px-6 py-4 font-semibold text-center hidden md:table-cell">Trạng thái</th>
              <th className="px-4 sm:px-6 py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(c => (
              <tr
                key={c.code}
                className={`hover:bg-muted transition-colors ${c.isDefault ? 'bg-indigo-50/30' : ''}`}
              >
                <td className="px-4 sm:px-6 py-4">
                  <span className="font-bold text-card-foreground font-mono">{c.code}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-foreground font-medium hidden sm:table-cell">{c.name}</td>
                <td className="px-4 sm:px-6 py-4 text-center">
                  <span className="inline-flex min-w-8 h-8 px-2 items-center justify-center bg-muted text-foreground rounded-lg font-mono font-bold text-sm border border-border">
                    {c.symbol}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-center hidden md:table-cell">
                  {c.isDefault ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                      <Star size={12} className="fill-indigo-700" />
                      Mặc định
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    {!c.isDefault && (
                      <>
                        <button
                          onClick={() => handleSetDefault(c.code)}
                          className="px-2 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                          Đặt mặc định
                        </button>
                        <button
                          onClick={() => handleRemove(c.code)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Xóa tiền tệ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {c.isDefault && (
                      <span className="text-xs text-muted-foreground italic pr-1">Đang dùng</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 sm:px-6 py-16 text-center">
                  <DollarSign size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Không tìm thấy loại tiền tệ nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Add Currency Modal ──────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-card-foreground">Thêm tiền tệ</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Chọn từ danh sách hoặc nhập thủ công</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 pb-0">
              <button
                onClick={() => setTab('popular')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'popular'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Tiền tệ phổ biến
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'custom'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Nhập thủ công
              </button>
            </div>

            {/* Tab: Popular */}
            {tab === 'popular' && (
              <div className="p-4">
                {availablePopular.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Tất cả tiền tệ phổ biến đã được thêm.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {availablePopular.map(c => (
                      <button
                        key={c.code}
                        onClick={() => handleAddPopular(c)}
                        className="flex items-center gap-3 p-3 border border-border rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors text-left group"
                      >
                        <span className="w-9 h-9 flex items-center justify-center bg-muted group-hover:bg-purple-100 rounded-lg font-mono font-bold text-sm text-foreground group-hover:text-purple-700 flex-shrink-0 transition-colors">
                          {c.symbol}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-card-foreground text-sm">{c.code}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Custom */}
            {tab === 'custom' && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Mã tiền tệ <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(2–5 chữ in hoa)</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') }))}
                    placeholder="VD: THB, GBP, CNY"
                    maxLength={5}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.code ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tên tiền tệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Thai Baht, British Pound"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.name ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ký hiệu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.symbol}
                    onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                    placeholder="VD: ฿, £, S$"
                    maxLength={5}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.symbol ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  />
                  {errors.symbol && <p className="text-red-500 text-xs mt-1">{errors.symbol}</p>}
                </div>

                {/* Preview */}
                {(form.code || form.symbol) && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                    <span className="text-xs text-muted-foreground">Xem trước:</span>
                    <span className="font-mono font-bold text-foreground">{form.code || '???'}</span>
                    <span className="w-8 h-8 flex items-center justify-center bg-card border border-border rounded-lg font-mono font-bold text-sm text-foreground">
                      {form.symbol || '?'}
                    </span>
                    <span className="text-sm text-muted-foreground">{form.name || 'Tên tiền tệ'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-2 border-t border-border mt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              {tab === 'custom' && (
                <button
                  onClick={handleAddCustom}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Thêm tiền tệ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
