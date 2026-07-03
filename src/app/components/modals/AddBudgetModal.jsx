import { X, Plus } from "lucide-react";
import { useState } from "react";
import { useCategories } from "../../context/CategoriesContext";
import { useNavigate } from "react-router-dom";
import { formatVND, parseVND } from "../../utils/formatMoney";

const periodTypes = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "yearly", label: "Hàng năm" },
];

// Helper: lấy ID thực tế của danh mục (hỗ trợ cả accountId và id)
function getCategoryId(cat) {
  return cat.accountId || cat.id;
}

export function AddBudgetModal({ isOpen, onClose, onAdd }) {
  const { expenseCategories } = useCategories();
  const navigate = useNavigate();

  // States
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [returnHere, setReturnHere] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setCatId("");
    setAmount("");
    setPeriodType("monthly");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Lọc danh mục hợp lệ (chỉ Expense type)
  const validCategories = expenseCategories.filter(
    (c) => c.typeId === undefined || c.typeId === 5,
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !catId) return;

    const selected = validCategories.find(
      (c) => String(getCategoryId(c)) === catId,
    );
    const finalAmount = amount ? parseFloat(amount) : 0;

    onAdd({
      accountId: parseInt(catId, 10),
      title,
      targetAmount: finalAmount,
      periodType,
      startDate: startDate
        ? new Date(startDate).toISOString()
        : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      iconName: selected?.iconName || "Coffee",
      color: selected?.color || "orange",
    });

    if (returnHere) {
      resetForm();
    } else {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-muted rounded-xl w-full max-w-full sm:max-w-xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">B</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Ngân sách{" "}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                Tạo ngân sách mới
              </span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted rounded-full p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Danh mục (bắt buộc) */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground">
                  Danh mục chi tiêu <span className="text-red-500">*</span>
                </h3>
              </div>
              <div className="p-4">
                {validCategories.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Chưa có danh mục chi tiêu nào. Hãy tạo danh mục trước.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate("/accounts/expense");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Plus size={16} />
                      Tạo danh mục chi tiêu
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={catId}
                      onChange={(e) => {
                        setCatId(e.target.value);
                        if (e.target.value && !title) {
                          const cat = validCategories.find(
                            (c) => String(getCategoryId(c)) === e.target.value,
                          );
                          if (cat) setTitle(cat.name);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      required
                    >
                      <option value="">— Chọn danh mục —</option>
                      {validCategories.map((c) => (
                        <option key={getCategoryId(c)} value={getCategoryId(c)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Chi tiết ngân sách */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground">
                  Chi tiết ngân sách
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                    Tên ngân sách <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="VD: Ăn uống tháng 6"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                    Số tiền <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formatVND(amount)}
                    onChange={(e) => setAmount(parseVND(e.target.value))}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="0"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                    Chu kỳ
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    {periodTypes.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="sm:w-1/4 text-sm font-medium text-muted-foreground sm:text-right">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tùy chọn */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground">Tùy chọn</h3>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="returnHere"
                    checked={returnHere}
                    onChange={(e) => setReturnHere(e.target.checked)}
                    className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="returnHere" className="text-sm text-muted-foreground">
                    Sau khi lưu, quay lại đây để tạo tiếp
                  </label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!catId || !title || !amount}
                className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu ngân sách mới
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
