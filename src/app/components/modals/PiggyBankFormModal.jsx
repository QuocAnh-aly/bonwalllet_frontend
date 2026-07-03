import { X, PiggyBank } from "lucide-react";
import { useState, useEffect } from "react";
import { accountApi } from "../../api/accountApi";
import { useSettings } from "../../context/SettingsContext";
import { formatVND, parseVND } from "../../utils/formatMoney";
import { ReceiptAttachments } from "../attachments/ReceiptAttachments";

export function PiggyBankFormModal({ isOpen, onClose, onSave, goal = null }) {
  const { fmt, currencies, currency } = useSettings();
  const isEdit = !!goal;

  // Mandatory
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");

  // Optional
  const [targetDate, setTargetDate] = useState("");
  const [monthly, setMonthly] = useState("");
  // Tệp chờ upload (chỉ dùng khi tạo mới — lúc tạo chưa có budgetId để gắn).
  const [pendingFiles, setPendingFiles] = useState([]);

  const [returnHere, setReturnHere] = useState(false);
  const parsedAmount = parseFloat(targetAmount);
  const canSubmit = name.trim() && parsedAmount > 0;

  useEffect(() => {
    if (!isOpen) return;
    accountApi
      .getByType(1)
      .then((data) => setAccounts(data.items || data || []))
      .catch(() => {});
    if (goal) {
      setName(goal.title ?? "");
      setTargetAmount(String(goal.targetAmount ?? ""));
      setSelectedCurrency(goal.currencyCode ?? goal.currency ?? currency);
      setTargetDate(goal.targetDate ?? "");
      setMonthly(String(goal.savePerMonth ?? ""));
      setPendingFiles([]);
    } else {
      setName("");
      setTargetAmount("");
      setSelectedCurrency(currency);
      setTargetDate("");
      setMonthly("");
      setPendingFiles([]);
      setReturnHere(false);
    }
  }, [isOpen, goal, currency]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave(
      {
        title: name.trim(),
        targetAmount: parseFloat(targetAmount),
        monthlyContribution: parseFloat(monthly) || 0,
        targetDate: targetDate || null,
        currencyCode: selectedCurrency,
        iconName: goal?.iconName || "PiggyBank",
        color: goal?.color || "green",
      },
      // Tệp chỉ gửi kèm khi tạo mới; lúc sửa đã upload trực tiếp qua ReceiptAttachments.
      isEdit ? null : pendingFiles,
    );
    if (returnHere && !isEdit) {
      setName("");
      setTargetAmount("");
      setPendingFiles([]);
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
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <PiggyBank className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Lợn tiết kiệm
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
          <form id="piggybank-form" onSubmit={handleSubmit}>
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
                      placeholder="Tên mục tiêu"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Số tiền mục tiêu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formatVND(targetAmount)}
                      onChange={(e) => {
                        setTargetAmount(parseVND(e.target.value));
                      }}
                      required
                      min="1"
                      step="1"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Tiền tệ
                    </label>
                    <div className="flex-1">
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                      >
                        {currencies?.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lợn tiết kiệm chỉ nhận một loại tiền tệ.
                      </p>
                    </div>
                  </div>

                  {/* Piggy Wallet notice */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Tài khoản
                    </label>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <PiggyBank
                        size={16}
                        className="text-green-600 shrink-0"
                      />
                      <span className="text-sm text-green-700 font-medium">
                        Piggy Wallet
                      </span>
                      <span className="text-xs text-green-600 ml-1">
                        (Tài khoản hệ thống)
                      </span>
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Ngày mục tiêu
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {isEdit ? (
                    <ReceiptAttachments type="piggy" id={goal.id} />
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                        Tệp đính kèm
                      </label>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer bg-muted hover:bg-muted text-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            Chọn tệp
                            <input
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const picked = Array.from(e.target.files || []);
                                if (picked.length)
                                  setPendingFiles((prev) => [...prev, ...picked]);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <span className="text-sm text-muted-foreground">
                            {pendingFiles.length
                              ? `Đã chọn ${pendingFiles.length} tệp`
                              : "Chưa chọn tệp"}
                          </span>
                        </div>

                        {pendingFiles.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {pendingFiles.map((f, i) => (
                              <li
                                key={`${f.name}-${i}`}
                                className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-lg px-2.5 py-1.5"
                              >
                                <span className="truncate text-foreground">
                                  {f.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingFiles((prev) =>
                                      prev.filter((_, j) => j !== i),
                                    )
                                  }
                                  className="text-muted-foreground hover:text-red-500 shrink-0"
                                  title="Bỏ tệp"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Ảnh hoặc PDF, tối đa 50 MB mỗi tệp. Sẽ được đính kèm sau
                          khi tạo.
                        </p>
                      </div>
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
                    form="piggybank-form"
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
