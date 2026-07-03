import { useState, useMemo } from 'react';
import {
  RefreshCw, Search, ArrowRightLeft, Clock,
  Pencil, Check, X, ArrowRight, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSettings } from '../../context/SettingsContext';

// Free currency API — no key required, data from ECB + open sources
// Response format: { "vnd": { "usd": 0.0000393, "eur": 0.0000362, ... } }
// Our rate[X] = "1 X = rate[X] defaultCurrency", so: ourRate = 1 / apiRate
const CURRENCY_API = (base) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`;

import { PageLayout } from '../../components/layout/PageLayout';

export function ExchangeRates() {
  const {
    currencies, currency: defaultCode,
    rates, setRate, bulkUpdateRates, syncRates, lastRateSync, convert,
  } = useSettings();

  const [search,    setSearch]    = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [editingCode, setEditingCode] = useState(null);
  const [editValue,   setEditValue]   = useState('');

  // ── Converter state ────────────────────────────────────────
  const [cvFrom,   setCvFrom]   = useState(defaultCode);
  const [cvTo,     setCvTo]     = useState(currencies.find(c => c.code !== defaultCode)?.code ?? defaultCode);
  const [cvAmount, setCvAmount] = useState('1');

  const defaultCurrency = currencies.find(c => c.code === defaultCode);

  // Build pair list: every non-default currency vs default
  const pairs = useMemo(() => {
    return currencies
      .filter(c => !c.isDefault)
      .map(c => ({
        code:   c.code,
        name:   c.name,
        symbol: c.symbol,
        rate:   rates[c.code] ?? 1,
      }));
  }, [currencies, rates]);

  const filtered = pairs.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Live sync from market ─────────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(CURRENCY_API(defaultCode));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const apiRates = data[defaultCode.toLowerCase()];
      if (!apiRates) throw new Error('Định dạng dữ liệu không hợp lệ');

      const nonDefault = currencies.filter(c => !c.isDefault);
      const batch = {};
      const skipped = [];

      for (const curr of nonDefault) {
        const apiVal = apiRates[curr.code.toLowerCase()];
        // apiVal = "1 defaultCode = apiVal curr"  →  ourRate = 1 / apiVal (1 curr = ? defaultCode)
        if (apiVal && apiVal > 0) {
          batch[curr.code] = 1 / apiVal;
        } else {
          skipped.push(curr.code);
        }
      }

      await bulkUpdateRates(batch);
      syncRates();

      const updated = Object.keys(batch).length;
      if (updated > 0) {
        toast.success(
          skipped.length > 0
            ? `Đã cập nhật ${updated} tỷ giá. Không tìm thấy: ${skipped.join(', ')}`
            : `Đã cập nhật ${updated} tỷ giá từ thị trường thế giới`
        );
      } else {
        toast.warning('Không có tỷ giá nào được cập nhật. Kiểm tra lại danh sách tiền tệ.');
      }
    } catch (err) {
      const msg = err.message.includes('fetch') || err.message.includes('network')
        ? 'Không có kết nối mạng'
        : err.message;
      setSyncError(msg);
      toast.error(`Lỗi đồng bộ: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Inline edit ───────────────────────────────────────────────
  const startEdit = (code, currentRate) => {
    setEditingCode(code);
    setEditValue(String(currentRate));
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditValue('');
  };

  const commitEdit = async (code) => {
    const val = parseFloat(editValue.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      toast.error('Tỷ giá phải là số dương');
      return;
    }
    try {
      await setRate(code, val);
      toast.success(`Đã cập nhật tỷ giá ${code}/${defaultCode}`);
      cancelEdit();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Không lưu được tỷ giá');
    }
  };

  // ── Converter ─────────────────────────────────────────────────
  const cvResult = useMemo(() => {
    const amt = parseFloat(cvAmount.replace(/,/g, ''));
    if (isNaN(amt)) return null;
    return convert(amt, cvFrom, cvTo);
  }, [cvAmount, cvFrom, cvTo, convert]);

  const swapConverter = () => {
    setCvFrom(cvTo);
    setCvTo(cvFrom);
  };

  const symbolOf = (code) => currencies.find(c => c.code === code)?.symbol ?? code;

  return (
    <PageLayout
      title="Tỷ giá hối đoái"
      subtitle={
        <>
          Tỷ giá quy đổi so với tiền tệ mặc định&nbsp;
          <span className="font-semibold text-foreground">
            {defaultCurrency?.name ?? defaultCode} ({symbolOf(defaultCode)})
          </span>
        </>
      }
      actions={
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-60 font-medium"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ tỷ giá'}
        </button>
      }
    >

      {/* ── Last sync banner ────────────────────────────────────── */}
      <div className={`border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${syncError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${syncError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {syncError ? <AlertCircle size={20} /> : <Clock size={20} />}
          </div>
          <div>
            {syncError ? (
              <>
                <p className="text-sm font-semibold text-red-800">Đồng bộ thất bại</p>
                <p className="text-xs text-red-600">{syncError} — tỷ giá hiện tại là thủ công</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-blue-900">Cập nhật lần cuối</p>
                <p className="text-xs text-blue-700">
                  {lastRateSync
                    ? format(new Date(lastRateSync), "HH:mm, dd/MM/yyyy", { locale: vi })
                    : 'Chưa đồng bộ — nhấn "Đồng bộ tỷ giá" để lấy dữ liệu thị trường'}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-card border border-blue-100 rounded-lg px-3 py-2 shadow-sm">
          <span className="font-medium">Nguồn:</span>
          <span>ECB / Open Sources (jsdelivr, cập nhật hàng ngày)</span>
        </div>
      </div>

      {/* ── Currency converter ───────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-bold text-card-foreground text-lg mb-4 flex items-center gap-2">
          <ArrowRightLeft size={18} className="text-purple-600" />
          Bộ chuyển đổi tiền tệ
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* Amount + From */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Số tiền</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={cvAmount}
                onChange={e => setCvAmount(e.target.value)}
                min="0"
                className="flex-1 min-w-0 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Nhập số tiền"
              />
              <select
                value={cvFrom}
                onChange={e => setCvFrom(e.target.value)}
                className="w-28 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card font-mono font-bold"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap button */}
          <button
            onClick={swapConverter}
            className="self-center sm:mb-0 p-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-purple-600 flex-shrink-0"
            title="Đảo chiều"
          >
            <ArrowRightLeft size={18} />
          </button>

          {/* To currency */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Chuyển sang</label>
            <select
              value={cvTo}
              onChange={e => setCvTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card font-mono font-bold"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          {/* Result */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Kết quả</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="font-mono text-muted-foreground text-sm">{symbolOf(cvTo)}</span>
              <span className="font-bold text-purple-700 text-base flex-1 min-w-0 truncate">
                {cvResult != null
                  ? cvResult.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
                  : '—'}
              </span>
              <span className="font-mono text-xs text-muted-foreground flex-shrink-0">{cvTo}</span>
            </div>
          </div>
        </div>

        {cvResult != null && cvAmount && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            <ArrowRight size={12} />
            {parseFloat(cvAmount).toLocaleString('vi-VN')} {cvFrom}
            &nbsp;=&nbsp;
            {cvResult.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} {cvTo}
          </p>
        )}
      </div>

      {/* ── Rates table ─────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-card-foreground text-lg">
            Bảng tỷ giá
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length} cặp)</span>
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

        {pairs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ArrowRightLeft size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">Chưa có tiền tệ nào ngoài tiền mặc định</p>
            <p className="text-muted-foreground text-sm mt-1">
              Thêm tiền tệ tại trang <strong>Tiền tệ</strong> để hiển thị tỷ giá tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
                <th className="px-4 sm:px-6 py-4 font-semibold">Cặp tiền tệ</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-right">
                  Tỷ giá
                </th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-right hidden md:table-cell">
                  Nghịch đảo
                </th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-right w-24">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.code} className="hover:bg-muted transition-colors">
                  {/* Pair */}
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 sm:gap-2 bg-muted border border-border rounded-lg px-2 sm:px-3 py-1.5">
                        <span className="font-bold text-card-foreground font-mono text-xs sm:text-sm">{p.code}</span>
                        <ArrowRightLeft size={12} className="text-muted-foreground" />
                        <span className="font-bold text-card-foreground font-mono text-xs sm:text-sm">{defaultCode}</span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{p.name}</span>
                    </div>
                  </td>

                  {/* Forward rate */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    {editingCode === p.code ? (
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(p.code); if (e.key === 'Escape') cancelEdit(); }}
                          autoFocus
                          min="0"
                          step="any"
                          className="w-20 sm:w-32 text-right px-2 py-1 border border-purple-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button onClick={() => commitEdit(p.code)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-base sm:text-lg font-bold text-card-foreground font-mono">
                        {p.rate.toLocaleString('vi-VN')}
                      </span>
                    )}
                  </td>

                  {/* Inverse rate */}
                  <td className="px-4 sm:px-6 py-4 text-right text-muted-foreground font-mono text-xs sm:text-sm hidden md:table-cell">
                    {editingCode !== p.code && (1 / p.rate).toLocaleString('vi-VN', { maximumFractionDigits: 6 })}
                  </td>

                  {/* Edit button */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    {editingCode !== p.code && (
                      <button
                        onClick={() => startEdit(p.code, p.rate)}
                        className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Sửa tỷ giá"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && pairs.length > 0 && (
                <tr>
                  <td colSpan="4" className="px-4 sm:px-6 py-12 text-center text-muted-foreground">
                    Không tìm thấy tỷ giá nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
