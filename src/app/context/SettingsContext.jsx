import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { currencyApi } from "../api/currencyApi";
import { exchangeRateApi } from "../api/exchangeRateApi";
import { hasSession } from "../api/tokenStore";

// Fallback used while the API call is still in flight on first mount,
// or when the user is not yet authenticated.
const FALLBACK_CURRENCIES = [
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", isDefault: true },
  { code: "USD", name: "US Dollar", symbol: "$", isDefault: false },
];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // ── State ─────────────────────────────────────────────
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES);
  const [currency, setCurrencyCode] = useState("VND"); // primary code
  const [rates, setRates] = useState({}); // { code → rate vs primary }
  const [lastRateSync, setLastRateSync] = useState(
    () => localStorage.getItem("app_rate_sync") || null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // ── Display preferences (stored locally per browser) ──────────
  // Kept client-side so they apply instantly without any DB change.
  const [numberFormat, setNumberFormat] = useState(
    () => localStorage.getItem("app_number_format") || "vi-VN",
  );
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(
    () => Number(localStorage.getItem("app_first_day") ?? 1),
  );

  // ── Mapping ───────────────────────────────────────────
  // Backend dto → frontend shape used by pages.
  const dtoToCurrency = (c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    isDefault: !!c.is_primary,
    isEnabled: c.is_enabled !== false,
  });

  // ── Load from server ──────────────────────────────────
  const refreshCurrencies = useCallback(async () => {
    try {
      const list = await currencyApi.getAll();
      const mapped = (list || []).map(dtoToCurrency);
      setCurrencies(mapped.length > 0 ? mapped : FALLBACK_CURRENCIES);
      const primary = mapped.find((c) => c.isDefault) ?? FALLBACK_CURRENCIES[0];
      if (primary) setCurrencyCode(primary.code);
    } catch (err) {
      // Stay on fallback when unauthenticated or offline
      console.warn("Không thể tải dữ liệu tiền tệ:", err?.message);
    }
  }, []);

  const refreshRates = useCallback(async () => {
    try {
      const list = await exchangeRateApi.getAll();
      // Build {fromCode: rateVsPrimary}. The bulk endpoint stores from=code, to=primary.
      const map = {};
      for (const r of list || []) {
        if (!(r.from_currency in map)) {
          map[r.from_currency] = Number(r.rate);
        }
      }
      setRates(map);
    } catch (err) {
      console.warn("Không thể tải tỷ giá hối đoái:", err?.message);
    }
  }, []);

  // First mount + every time the token changes (storage event from login/logout)
  useEffect(() => {
    if (!hasSession()) return;
    setIsLoading(true);
    Promise.all([refreshCurrencies(), refreshRates()]).finally(() =>
      setIsLoading(false),
    );

    const onStorage = (e) => {
      if (e.key === "app_session") {
        refreshCurrencies();
        refreshRates();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCurrencies, refreshRates]);

  // ── Save display preferences (localStorage only — no DB change) ─────
  // Accepts a partial { numberFormat, firstDayOfWeek }. Currency is managed
  // via setDefaultCurrency; theme via next-themes.
  const savePreferences = ({ numberFormat: nf, firstDayOfWeek: fd } = {}) => {
    if (nf != null) {
      setNumberFormat(nf);
      localStorage.setItem("app_number_format", nf);
    }
    if (fd != null) {
      setFirstDayOfWeek(Number(fd));
      localStorage.setItem("app_first_day", String(fd));
    }
  };

  // ── Currencies API ────────────────────────────────────
  const setCurrency = (code) => setCurrencyCode(code);

  const setDefaultCurrency = async (code) => {
    await currencyApi.setPrimary(code);
    await refreshCurrencies();
  };

  const addCurrency = async (newCurr) => {
    if (currencies.find((c) => c.code === newCurr.code)) {
      throw new Error("Mã tiền tệ đã tồn tại");
    }
    await currencyApi.create({
      code: newCurr.code,
      name: newCurr.name,
      symbol: newCurr.symbol,
    });
    await refreshCurrencies();
  };

  const removeCurrency = async (code) => {
    const curr = currencies.find((c) => c.code === code);
    if (!curr) return;
    if (curr.isDefault) throw new Error("Không thể xóa tiền tệ mặc định");
    await currencyApi.delete(code);
    await refreshCurrencies();
    await refreshRates();
  };

  // ── Exchange rates ────────────────────────────────────
  const setRate = async (code, value) => {
    await exchangeRateApi.bulk({
      rates: { [code]: Number(value) },
      rate_date: new Date().toISOString().slice(0, 10),
    });
    setRates((prev) => ({ ...prev, [code]: Number(value) }));
  };

  const bulkUpdateRates = async (batch) => {
    if (!batch || Object.keys(batch).length === 0) return;
    await exchangeRateApi.bulk({
      rates: batch,
      rate_date: new Date().toISOString().slice(0, 10),
    });
    setRates((prev) => ({ ...prev, ...batch }));
  };

  const syncRates = () => {
    const now = new Date().toISOString();
    setLastRateSync(now);
    localStorage.setItem("app_rate_sync", now);
  };

  // Convert `amount` from currency `from` to currency `to`.
  // rates[X] = "1 X = rates[X] primaryCurrency".
  const convert = (amount, from, to) => {
    if (from === to) return amount;
    const rateFrom = from === currency ? 1 : (rates[from] ?? 1);
    const rateTo = to === currency ? 1 : (rates[to] ?? 1);
    return (amount * rateFrom) / rateTo;
  };

  // ── Formatting ─────────────────────────────────────────
  const currencySymbol =
    currencies.find((c) => c.code === currency)?.symbol ?? currency;
  const fmt = (n) => {
    const num = Number(n ?? 0);
    try {
      // Locale-aware — trình duyệt tự xử lý symbol & phân cách theo numberFormat
      return num.toLocaleString(numberFormat, { style: "currency", currency });
    } catch {
      // Fallback nếu currency code hoặc locale không hợp lệ
      return `${num.toLocaleString(numberFormat)} ${currency}`;
    }
  };
  const fmtShort = (n) => {
    const num = Number(n ?? 0);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
    return `${num}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        isLoading,
        currency,
        setCurrency,
        currencies,
        setDefaultCurrency,
        addCurrency,
        removeCurrency,
        rates,
        setRate,
        bulkUpdateRates,
        syncRates,
        lastRateSync,
        convert,
        currencySymbol,
        fmt,
        fmtShort,
        refreshCurrencies,
        refreshRates,
        numberFormat,
        firstDayOfWeek,
        savePreferences,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
