import { useState } from "react";
import {
  Download, FileText, Calendar, CheckCircle2, FileJson, FileSpreadsheet,
  Wallet, Receipt, Target,
} from "lucide-react";
import { toast } from "sonner";
import { exportApi, downloadBlob, FORMAT_EXT } from "../../api/exportApi";

const DATA_TYPES = [
  { key: "transactions", label: "Sổ giao dịch",         icon: Receipt, desc: "Chi tiết mọi khoản thu chi, chuyển khoản" },
  { key: "accounts",     label: "Danh sách Tài khoản",  icon: Wallet,  desc: "Thông tin ví và số dư hiện tại" },
  { key: "budgets",      label: "Ngân sách & Mục tiêu", icon: Target,  desc: "Hạn mức chi tiêu và mục tiêu tiết kiệm" },
];

const FORMATS = [
  { key: "excel", label: "Excel (.xls)", icon: FileSpreadsheet, ring: "border-green-500 bg-green-50",  iconCls: "text-green-600",  textCls: "text-green-700"  },
  { key: "csv",   label: "CSV",          icon: FileText,         ring: "border-blue-500 bg-blue-50",    iconCls: "text-blue-600",   textCls: "text-blue-700"   },
  { key: "json",  label: "JSON",         icon: FileJson,         ring: "border-yellow-500 bg-yellow-50", iconCls: "text-yellow-600", textCls: "text-yellow-700" },
];

const RANGE_LABEL = {
  this_month: "Tháng này",
  last_month: "Tháng trước",
  this_year:  "Năm nay",
  last_year:  "Năm ngoái",
  all_time:   "Toàn thời gian",
};

function resolveRange(rangeKey) {
  const now = new Date();
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfYear  = (d) => new Date(d.getFullYear(), 0, 1);
  const lastDayPrev  = (d) => new Date(d.getFullYear(), d.getMonth(), 0);
  const iso = (d) => d.toISOString().slice(0, 10);

  switch (rangeKey) {
    case "this_month":
      return { from: iso(startOfMonth(now)), to: iso(now) };
    case "last_month": {
      const last = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      return { from: iso(last), to: iso(lastDayPrev(now)) };
    }
    case "this_year":
      return { from: iso(startOfYear(now)), to: iso(now) };
    case "last_year":
      return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` };
    default:
      return { from: undefined, to: undefined };
  }
}

export function ExportData() {
  const [format,      setFormat]      = useState("csv");
  const [dateRange,   setDateRange]   = useState("all_time");
  const [dataType,    setDataType]    = useState("transactions");
  const [isExporting, setIsExporting] = useState(false);

  const errMsg = (e) => e?.response?.data?.message || e?.message || "Lỗi không xác định";

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const ext = FORMAT_EXT[format] ?? "csv";
      const fmtParam = format === "excel" ? "xlsx" : format;
      let blob, filename;

      if (dataType === "transactions") {
        const { from, to } = resolveRange(dateRange);
        blob = await exportApi.transactions({ from, to, format: fmtParam });
        filename = `transactions_${dateRange}.${ext}`;
      } else if (dataType === "accounts") {
        blob = await exportApi.accounts({ format: fmtParam });
        filename = `accounts.${ext}`;
      } else {
        blob = await exportApi.budgets({ format: fmtParam });
        filename = `budgets.${ext}`;
      }

      downloadBlob(blob, filename);
      toast.success("Đã xuất dữ liệu thành công");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setIsExporting(false);
    }
  };

  // Time range only matters for transactions; hide it for accounts/budgets.
  const showRange = dataType === "transactions";
  const summaryDataLabel = DATA_TYPES.find(d => d.key === dataType)?.label ?? dataType;

  // Resolve the actual window so the summary shows exactly what will be exported.
  const resolved = showRange ? resolveRange(dateRange) : { from: undefined, to: undefined };
  const resolvedRangeText = resolved.from && resolved.to
    ? `${resolved.from} → ${resolved.to}`
    : "Toàn bộ lịch sử";

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Xuất dữ liệu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Trích xuất dữ liệu tài chính của bạn ra các định dạng chuẩn để lưu trữ hoặc phân tích bên ngoài
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Data Type */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">1</span>
              Dữ liệu cần xuất
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DATA_TYPES.map(({ key, label, icon: Icon, desc }) => (
                <label
                  key={key}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    dataType === key ? "border-purple-600 bg-purple-50" : "border-border hover:border-border"
                  }`}
                >
                  <input
                    type="radio" name="dataType" className="sr-only"
                    checked={dataType === key}
                    onChange={() => setDataType(key)}
                  />
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={dataType === key ? "text-purple-600" : "text-muted-foreground"} />
                      <span className="font-bold text-card-foreground">{label}</span>
                    </div>
                    {dataType === key && <CheckCircle2 size={18} className="text-purple-600" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Time Range — only relevant for transactions */}
          {showRange && (
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">2</span>
                Khoảng thời gian
              </h2>
              <div className="flex items-center gap-4 max-w-sm border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-purple-500 transition-shadow">
                <Calendar size={20} className="text-muted-foreground" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full font-medium text-foreground bg-transparent focus:outline-none"
                >
                  <option value="this_month">Tháng này</option>
                  <option value="last_month">Tháng trước</option>
                  <option value="this_year">Năm nay</option>
                  <option value="last_year">Năm ngoái</option>
                  <option value="all_time">Toàn thời gian</option>
                </select>
              </div>
            </div>
          )}

          {/* Format */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">{showRange ? 3 : 2}</span>
              Định dạng file
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {FORMATS.map(({ key, label, icon: Icon, ring, iconCls, textCls }) => {
                const active = format === key;
                return (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${
                      active ? ring : "border-border hover:border-border"
                    }`}
                  >
                    <input
                      type="radio" name="format" className="sr-only"
                      checked={active}
                      onChange={() => setFormat(key)}
                    />
                    <Icon size={32} className={`mx-auto mb-2 ${active ? iconCls : "text-muted-foreground"}`} />
                    <span className={`font-bold block ${active ? textCls : "text-foreground"}`}>{label}</span>
                  </label>
                );
              })}
            </div>
            {format === "excel" && (
              <p className="text-xs text-muted-foreground mt-3">
                File Excel xuất ở định dạng SpreadsheetML 2003 (.xls). Excel / LibreOffice mở trực tiếp.
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Submit Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg sticky top-8">
            <h3 className="text-xl font-bold mb-4">Tóm tắt yêu cầu</h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm border-b border-white/10 pb-4">
                <span className="text-indigo-200">Dữ liệu:</span>
                <span className="font-semibold">{summaryDataLabel}</span>
              </div>
              {showRange && (
                <div className="flex flex-col gap-1 text-sm border-b border-white/10 pb-4">
                  <div className="flex justify-between">
                    <span className="text-indigo-200">Thời gian:</span>
                    <span className="font-semibold">{RANGE_LABEL[dateRange]}</span>
                  </div>
                  <span className="text-xs text-indigo-300 text-right">{resolvedRangeText}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pb-2">
                <span className="text-indigo-200">Định dạng:</span>
                <span className="font-semibold uppercase">{format}</span>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-card text-purple-900 font-bold rounded-xl hover:bg-muted transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Xuất dữ liệu ngay</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-indigo-200 mt-4">
              File sẽ được tải xuống trực tiếp thông qua trình duyệt của bạn.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
