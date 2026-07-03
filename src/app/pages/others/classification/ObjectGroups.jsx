import { Plus, Users, Building2, Pencil, Trash2, Search, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { confirmDialog } from "../../../utils/confirmDialog";
import { useCategories } from "../../../context/CategoriesContext";

const EMPTY_FORM = { name: '', type: 'person', role: 'payee', notes: '' };

export function ObjectGroups() {
  const { objectGroups, addObjectGroup, updateObjectGroup, deleteObjectGroup } = useCategories();

  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingObj,  setEditingObj]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formError,   setFormError]   = useState('');

  const openCreate = () => {
    setEditingObj(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (obj) => {
    setEditingObj(obj);
    setForm({ name: obj.name, type: obj.type, role: obj.role, notes: obj.notes || '' });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) { setFormError('Tên đối tượng không được để trống'); return; }
    const duplicate = objectGroups.find(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== editingObj?.id);
    if (duplicate) { setFormError('Tên đối tượng đã tồn tại'); return; }

    if (editingObj) {
      updateObjectGroup(editingObj.id, { name, type: form.type, role: form.role, notes: form.notes });
      toast.success(`Đã cập nhật "${name}"`);
    } else {
      addObjectGroup({ name, type: form.type, role: form.role, notes: form.notes });
      toast.success(`Đã thêm "${name}"`);
    }
    setShowModal(false);
  };

  const handleDelete = async (obj) => {
    if (!await confirmDialog(`Xóa đối tượng "${obj.name}"?`)) return;
    deleteObjectGroup(obj.id);
    toast.success(`Đã xóa ${obj.name}`);
  };

  const filtered = objectGroups.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Nhóm đối tượng</h1>
          <p className="text-muted-foreground mt-1 text-sm">Quản lý người liên hệ, đối tác, cửa hàng hoặc người nhận/trả tiền</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={18} />
          <span className="font-medium">Thêm đối tượng</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm đối tượng..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-card-foreground font-bold text-lg mb-1">Chưa có đối tượng nào</p>
            <p className="text-muted-foreground">Quản lý những người và công ty bạn thường xuyên giao dịch.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted">
                <th className="px-4 sm:px-6 py-4 font-semibold">Tên đối tượng</th>
                <th className="px-4 sm:px-6 py-4 font-semibold hidden sm:table-cell">Loại</th>
                <th className="px-4 sm:px-6 py-4 font-semibold hidden sm:table-cell">Vai trò</th>
                <th className="px-4 sm:px-6 py-4 font-semibold hidden md:table-cell">Ghi chú</th>
                <th className="px-4 sm:px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(obj => (
                <tr key={obj.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        obj.type === 'company' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {obj.type === 'company' ? <Building2 size={16} /> : <Users size={16} />}
                      </div>
                      <span className="font-semibold text-card-foreground text-sm">{obj.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 sm:hidden">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        obj.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {obj.type === 'company' ? 'Công ty' : 'Cá nhân'}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        obj.role === 'payer' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {obj.role === 'payer' ? 'Trả tiền' : 'Nhận tiền'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      obj.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {obj.type === 'company' ? 'Công ty' : 'Cá nhân'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      obj.role === 'payer' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {obj.role === 'payer' ? 'Người trả tiền' : 'Người nhận tiền'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-muted-foreground max-w-xs truncate hidden md:table-cell">
                    {obj.notes || <span className="italic text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(obj)}
                        className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Sửa"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(obj)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-card-foreground">
                {editingObj ? 'Chỉnh sửa đối tượng' : 'Thêm đối tượng mới'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Tên đối tượng <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setFormError(''); }}
                  placeholder="VD: Nguyễn Văn A, Shopee, Công ty XYZ..."
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
              </div>

              {/* Type + Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Loại</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'person',  label: 'Cá nhân', Icon: Users,     active: 'bg-orange-100 border-orange-400 text-orange-700' },
                      { value: 'company', label: 'Công ty', Icon: Building2, active: 'bg-blue-100 border-blue-400 text-blue-700'       },
                    ].map(({ value, label, Icon, active }) => (
                      <button
                        key={value}
                        onClick={() => setForm(f => ({ ...f, type: value }))}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 transition-all text-xs font-semibold ${
                          form.type === value ? active : 'border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Vai trò</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'payer', label: 'Trả tiền', active: 'bg-green-100 border-green-400 text-green-700' },
                      { value: 'payee', label: 'Nhận tiền', active: 'bg-red-100 border-red-400 text-red-700'     },
                    ].map(({ value, label, active }) => (
                      <button
                        key={value}
                        onClick={() => setForm(f => ({ ...f, role: value }))}
                        className={`flex-1 py-2.5 rounded-lg border-2 transition-all text-xs font-semibold ${
                          form.role === value ? active : 'border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Thêm ghi chú tùy chọn..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Check size={16} />
                {editingObj ? 'Lưu thay đổi' : 'Thêm đối tượng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
