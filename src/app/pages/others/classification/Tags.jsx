import { Plus, Tag, Trash2, Pencil, Search, Hash, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCategories } from "../../../context/CategoriesContext";

const COLOR_OPTIONS = [
  { value: 'blue',    label: 'Xanh dương', bg: 'bg-blue-100',    text: 'text-blue-600',    swatch: 'bg-blue-500'    },
  { value: 'emerald', label: 'Xanh lá',    bg: 'bg-emerald-100', text: 'text-emerald-600', swatch: 'bg-emerald-500' },
  { value: 'orange',  label: 'Cam',        bg: 'bg-orange-100',  text: 'text-orange-600',  swatch: 'bg-orange-500'  },
  { value: 'purple',  label: 'Tím',        bg: 'bg-purple-100',  text: 'text-purple-600',  swatch: 'bg-purple-500'  },
  { value: 'pink',    label: 'Hồng',       bg: 'bg-pink-100',    text: 'text-pink-600',    swatch: 'bg-pink-500'    },
  { value: 'red',     label: 'Đỏ',         bg: 'bg-red-100',     text: 'text-red-600',     swatch: 'bg-red-500'     },
  { value: 'yellow',  label: 'Vàng',       bg: 'bg-yellow-100',  text: 'text-yellow-700',  swatch: 'bg-yellow-400'  },
  { value: 'slate',   label: 'Xám',        bg: 'bg-muted',   text: 'text-muted-foreground',   swatch: 'bg-muted0'   },
];

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.value, c]));

const EMPTY_FORM = { name: '', color: 'blue' };

import { PageLayout } from '../../../components/layout/PageLayout';
import { confirmDialog } from '../../../utils/confirmDialog';

export function Tags() {
  const { tags, addTag, updateTag, deleteTag } = useCategories();

  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingTag,  setEditingTag]  = useState(null); // tag object when editing
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formError,   setFormError]   = useState('');

  const openCreate = () => {
    setEditingTag(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (tag) => {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) { setFormError('Tên thẻ không được để trống'); return; }
    if (name.includes(' ')) { setFormError('Tên thẻ không được chứa khoảng trắng'); return; }
    const duplicate = tags.find(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== editingTag?.id);
    if (duplicate) { setFormError('Tên thẻ đã tồn tại'); return; }

    if (editingTag) {
      updateTag(editingTag.id, { name, color: form.color });
      toast.success(`Đã cập nhật thẻ #${name}`);
    } else {
      addTag({ name, color: form.color });
      toast.success(`Đã tạo thẻ #${name}`);
    }
    setShowModal(false);
  };

  const handleDelete = async (tag) => {
    if (!await confirmDialog(`Bạn có chắc muốn xóa thẻ #${tag.name}?`)) return;
    deleteTag(tag.id);
    toast.success(`Đã xóa thẻ #${tag.name}`);
  };

  const filtered = tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageLayout
      title="Thẻ phân loại"
      subtitle="Dùng thẻ (Tag) để gắn nhãn và nhóm các giao dịch độc lập với danh mục"
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Tạo thẻ mới</span>
        </button>
      }
    >

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thẻ..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Tag list */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Tag size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-card-foreground font-bold text-lg mb-1">Chưa có thẻ nào</p>
            <p className="text-muted-foreground">Tạo thẻ để dễ dàng theo dõi các chiến dịch hoặc chuyến đi cụ thể.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {filtered.map(tag => {
              const style = COLOR_MAP[tag.color] || COLOR_MAP.slate;
              return (
                <div
                  key={tag.id}
                  className="group relative flex items-center gap-2 pr-2 pl-3 py-1.5 rounded-full border border-border bg-muted hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <Hash size={14} className={style.text} />
                  <span className="font-semibold text-foreground text-sm">{tag.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} font-bold ml-1`}>
                    {style.label}
                  </span>

                  {/* Hover action bar */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg flex items-center p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none group-hover:pointer-events-auto z-10">
                    <button onClick={() => openEdit(tag)} className="p-1.5 hover:bg-slate-700 rounded-md" title="Sửa">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(tag)} className="p-1.5 hover:bg-red-500 rounded-md" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-card-foreground">
                {editingTag ? 'Chỉnh sửa thẻ' : 'Tạo thẻ mới'}
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
                  Tên thẻ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setForm(f => ({ ...f, name: e.target.value.replace(/\s/g, '') }));
                      setFormError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="VD: DuLich, KinhDoanh..."
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Màu sắc</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        form.color === opt.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.swatch}`} />
                      <span className="text-xs text-foreground">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {form.name.trim() && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Xem trước</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-muted w-fit">
                    <Hash size={14} className={(COLOR_MAP[form.color] || COLOR_MAP.slate).text} />
                    <span className="font-semibold text-foreground text-sm">{form.name.trim()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${(COLOR_MAP[form.color] || COLOR_MAP.slate).bg} ${(COLOR_MAP[form.color] || COLOR_MAP.slate).text} font-bold`}>
                      {(COLOR_MAP[form.color] || COLOR_MAP.slate).label}
                    </span>
                  </div>
                </div>
              )}
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
                {editingTag ? 'Lưu thay đổi' : 'Tạo thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
