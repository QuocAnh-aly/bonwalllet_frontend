import { X, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { formatVND, parseVND } from "../../utils/formatMoney";

const FREQ_OPTIONS = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "quarterly", label: "Hàng quý (3 tháng)" },
  { value: "half-year", label: "Nửa năm (6 tháng)" },
  { value: "yearly", label: "Hàng năm" },
];

export function SubscriptionFormModal({
  isOpen,
  onClose,
  onSave,
  bill = null,
}) {
  const isEdit = !!bill;

  const [name, setName] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [date, setDate] = useState("");
  const [repeatFreq, setRepeatFreq] = useState("monthly");
  const [skip, setSkip] = useState("0");

  const [endDate, setEndDate] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [objectGroup, setObjectGroup] = useState("");
  const [active, setActive] = useState(true);

  const [returnHere, setReturnHere] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (bill) {
      setName(bill.name ?? "");
      setAmountMin(String(bill.amountMin ?? ""));
      setAmountMax(String(bill.amountMax ?? ""));
      setDate(bill.date ? bill.date.split("T")[0] : "");
      setRepeatFreq(bill.repeatFreq ?? "monthly");
      setSkip(String(bill.skip ?? 0));
      setEndDate(bill.endDate ? bill.endDate.split("T")[0] : "");
      setExtensionDate(
        bill.extensionDate ? bill.extensionDate.split("T")[0] : "",
      );
      setNotes(bill.notes ?? "");
      setObjectGroup(bill.objectGroup ?? "");
      setActive(bill.active ?? true);
    } else {
      setName("");
      setAmountMin("");
      setAmountMax("");
      setDate(new Date().toISOString().split("T")[0]);
      setRepeatFreq("monthly");
      setSkip("0");
      setEndDate("");
      setExtensionDate("");
      setNotes("");
      setObjectGroup("");
      setActive(true);
      setReturnHere(false);
    }
  }, [isOpen, bill]);

  if (!isOpen) return null;

  const canSubmit = name.trim() && amountMin && amountMax && date && repeatFreq;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const min = parseFloat(amountMin);
    const max = parseFloat(amountMax);
    if (min > max) {
      setError("Số tiền tối thiểu không được lớn hơn số tiền tối đa.");
      return;
    }
    setError("");

    onSave({
      name: name.trim(),
      amountMin: min,
      amountMax: max,
      date: date,
      repeatFreq,
      skip: parseInt(skip) || 0,
      endDate: endDate || null,
      extensionDate: extensionDate || null,
      notes: notes.trim() || null,
      objectGroup: objectGroup.trim() || null,
      active,
      returnHere,
    });
    if (returnHere && !isEdit) {
      setName("");
      setAmountMin("");
      setAmountMax("");
      setNotes("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <Receipt className="text-purple-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Hóa đơn định kỳ
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {isEdit ? "Sửa" : "Tạo mới"}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="subscription-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mandatory Fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường bắt buộc
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Tên hóa đơn"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Số tiền tối thiểu
                    </label>
                    <input
                      type="text"
                      value={formatVND(amountMin)}
                      onChange={(e) => setAmountMin(parseVND(e.target.value))}
                      required
                      min="0"
                      step="1"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Số tiền tối đa
                    </label>
                    <input
                      type="text"
                      value={formatVND(amountMax)}
                      onChange={(e) => setAmountMax(parseVND(e.target.value))}
                      required
                      min="0"
                      step="1"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Ngày
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Lặp lại
                    </label>
                    <select
                      value={repeatFreq}
                      onChange={(e) => setRepeatFreq(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                    >
                      {FREQ_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Bỏ qua
                    </label>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={skip}
                        onChange={(e) => setSkip(e.target.value)}
                        min="0"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Dùng để tạo lịch cách quãng (skip=1: 2 tháng/lần).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường tùy chọn
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Ngày kết thúc
                    </label>
                    <div className="flex-1">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Không bắt buộc. Ngày kết thúc dự kiến.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Ngày gia hạn
                    </label>
                    <div className="flex-1">
                      <input
                        type="date"
                        value={extensionDate}
                        onChange={(e) => setExtensionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Không bắt buộc. Ngày phải gia hạn hoặc hủy.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Ghi chú
                    </label>
                    <div className="flex-1">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                        placeholder="Ghi chú"
                      ></textarea>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hỗ trợ{" "}
                        <a href="#" className="text-purple-600 hover:underline">
                          Markdown
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Nhóm
                    </label>
                    <input
                      type="text"
                      value={objectGroup}
                      onChange={(e) => setObjectGroup(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Nhóm"
                    />
                  </div>

                  {isEdit && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                        Kích hoạt
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setActive(e.target.checked)}
                          className="rounded border-border text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-muted-foreground">
                          Kích hoạt
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Options + Submit */}
            <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground">Tùy chọn</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                    Quay lại đây
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnHere}
                      onChange={(e) => setReturnHere(e.target.checked)}
                      className="rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-muted-foreground">
                      Sau khi lưu, quay lại để tạo tiếp.
                    </span>
                  </label>
                </div>
                {error && (
                  <p className="mt-3 text-sm text-red-600 text-right">{error}</p>
                )}
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    form="subscription-form"
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50"
                  >
                    {isEdit ? "Cập nhật" : "Lưu mới"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
