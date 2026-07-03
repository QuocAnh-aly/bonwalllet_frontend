import { Plus, GitMerge, Pencil, Trash2, Search, Zap, ArrowRight, Play, Pause, FlaskConical, Rocket, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ruleApi } from "../../../api/ruleApi";

// ── Catalog of trigger / action types the engine supports ────────────────────
const TRIGGER_TYPES = [
  { value: 'description_contains',    label: 'Mô tả chứa' },
  { value: 'description_is',          label: 'Mô tả là' },
  { value: 'amount_more',             label: 'Số tiền > ' },
  { value: 'amount_less',             label: 'Số tiền < ' },
  { value: 'amount_exactly',          label: 'Số tiền =' },
  { value: 'source_account_is',       label: 'Tài khoản nguồn là' },
  { value: 'destination_account_is',  label: 'Tài khoản đích là' },
  { value: 'transaction_type',        label: 'Loại giao dịch là (withdrawal/deposit/transfer)' },
  { value: 'tag_is',                  label: 'Có tag' },
  { value: 'category_is',             label: 'Danh mục là' },
  { value: 'has_no_category',         label: 'Không có danh mục' },
  { value: 'date_after',              label: 'Ngày sau (YYYY-MM-DD)' },
  { value: 'date_before',             label: 'Ngày trước (YYYY-MM-DD)' },
];

const ACTION_TYPES = [
  { value: 'set_description',     label: 'Đặt mô tả' },
  { value: 'append_description',  label: 'Thêm vào mô tả' },
  { value: 'set_notes',           label: 'Đặt ghi chú' },
  { value: 'append_notes',        label: 'Thêm vào ghi chú' },
  { value: 'add_tag',             label: 'Thêm tag' },
  { value: 'remove_tag',          label: 'Xóa tag' },
  { value: 'clear_tags',          label: 'Xóa toàn bộ tag' },
  { value: 'link_to_bill',        label: 'Liên kết với Bill (id)' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  strict: true,
  stop_processing: false,
  triggers: [{ type: 'description_contains', value: '' }],
  actions:  [{ type: 'add_tag',              value: '' }],
};

export function Rules() {
  const [rules,   setRules]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,  setEditing]   = useState(null); // null=create, otherwise rule object
  const [form,     setForm]      = useState(EMPTY_FORM);

  const errMsg = (e) => e?.response?.data?.message || e?.message || 'Lỗi không xác định';

  // ── Load ─────────────────────────────────────────────
  const refresh = async () => {
    try {
      setLoading(true);
      const data = await ruleApi.getAll();
      setRules(data || []);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // ── Modal ────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      title:           rule.title,
      description:     rule.description || '',
      strict:          rule.strict,
      stop_processing: rule.stop_processing,
      triggers: (rule.triggers || []).map(t => ({ type: t.type, value: t.value || '' })),
      actions:  (rule.actions  || []).map(a => ({ type: a.type, value: a.value || '' })),
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const submitForm = async () => {
    if (!form.title.trim()) { toast.error('Tên quy tắc bắt buộc'); return; }
    if (form.triggers.length === 0) { toast.error('Cần ít nhất 1 điều kiện'); return; }
    if (form.actions.length  === 0) { toast.error('Cần ít nhất 1 hành động'); return; }

    const payload = {
      title:           form.title.trim(),
      description:     form.description.trim(),
      strict:          form.strict,
      stop_processing: form.stop_processing,
      triggers: form.triggers.map((t, i) => ({ type: t.type, value: t.value, order: i })),
      actions:  form.actions.map((a, i)  => ({ type: a.type, value: a.value, order: i })),
    };

    try {
      if (editing) {
        await ruleApi.update(editing.rule_id, payload);
        toast.success('Đã cập nhật quy tắc');
      } else {
        await ruleApi.create(payload);
        toast.success('Đã tạo quy tắc mới');
      }
      closeModal();
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  // ── Actions on a rule ────────────────────────────────
  const toggleStatus = async (rule) => {
    try {
      await ruleApi.toggle(rule.rule_id);
      toast.success(rule.is_active ? 'Đã tắt quy tắc' : 'Đã bật quy tắc');
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const deleteRule = async (rule) => {
    if (!await confirmDialog(`Xóa quy tắc "${rule.title}"?`)) return;
    try {
      await ruleApi.delete(rule.rule_id);
      toast.success('Đã xóa quy tắc');
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const testRule = async (rule) => {
    try {
      const res = await ruleApi.test(rule.rule_id);
      toast.success(`Quy tắc khớp ${res.matched_count} giao dịch (xem trước, chưa áp dụng)`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const triggerRule = async (rule) => {
    if (!await confirmDialog(`Áp dụng "${rule.title}" cho tất cả giao dịch khớp?`, { destructive: false, title: 'Áp dụng quy tắc' })) return;
    try {
      const res = await ruleApi.trigger(rule.rule_id);
      toast.success(`Đã áp dụng: ${res.applied_count}/${res.matched_count} giao dịch được cập nhật`);
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const filtered = rules.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRuns = rules.reduce((s, r) => s + (r.runs || 0), 0);

  // ── Helpers for visuals ──────────────────────────────
  const labelOf = (cat, value) => cat.find(c => c.value === value)?.label ?? value;
  const triggerSummary = (rule) =>
    (rule.triggers || []).map(t => `${labelOf(TRIGGER_TYPES, t.type)} ${t.value ?? ''}`).join(rule.strict ? ' VÀ ' : ' HOẶC ');
  const actionSummary = (rule) =>
    (rule.actions || []).map(a => `${labelOf(ACTION_TYPES, a.type)} ${a.value ?? ''}`).join('; ');

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Quy tắc tự động</h1>
          <p className="text-muted-foreground mt-1 text-sm">Thiết lập các quy tắc để tự động phân loại giao dịch</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap">
          <Plus size={18} />
          <span className="font-medium">Tạo quy tắc mới</span>
        </button>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden mb-8 flex items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-card opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Zap size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">Tiết kiệm thời gian với Tự động hóa</h3>
            <p className="text-indigo-100 max-w-xl text-sm">
              Hệ thống quét các giao dịch và áp dụng hành động tương ứng dựa trên điều kiện bạn thiết lập.
              Dùng <strong>Test</strong> để xem trước, <strong>Trigger</strong> để áp dụng.
            </p>
          </div>
        </div>
        <div className="hidden md:block text-right relative z-10">
          <p className="text-4xl font-bold">{totalRuns}</p>
          <p className="text-indigo-200 text-sm">Lần thực thi tự động</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm quy tắc..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border shadow-sm">
          <GitMerge size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-card-foreground font-bold text-lg mb-1">Chưa có quy tắc nào</p>
          <p className="text-muted-foreground font-medium">Nhấn "Tạo quy tắc mới" để bắt đầu tự động hóa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(rule => (
            <div key={rule.rule_id}
              className={`bg-card rounded-2xl border ${rule.is_active ? 'border-border shadow-sm' : 'border-border/60 opacity-70'} p-5 transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                    <GitMerge size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-card-foreground">{rule.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Đã chạy: <span className="font-medium text-foreground">{rule.runs} lần</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {rule.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                  <div className="w-px h-6 bg-muted mx-2"></div>
                  <button onClick={() => testRule(rule)} title="Chạy thử (dry-run)"
                    className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <FlaskConical size={16} />
                  </button>
                  <button onClick={() => triggerRule(rule)} title="Kích hoạt (áp dụng)"
                    className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                    <Rocket size={16} />
                  </button>
                  <button onClick={() => toggleStatus(rule)} title={rule.is_active ? "Tắt" : "Bật"}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    {rule.is_active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => openEdit(rule)} title="Sửa"
                    className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                    <Pencil size={16}/>
                  </button>
                  <button onClick={() => deleteRule(rule)} title="Xóa"
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Nếu (Điều kiện — {rule.strict ? 'tất cả' : 'bất kỳ'})
                  </p>
                  <p className="text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2">
                    {triggerSummary(rule) || '(chưa có)'}
                  </p>
                </div>
                <div className="hidden md:flex items-center justify-center mt-6">
                  <ArrowRight size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Thì (Hành động)</p>
                  <p className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    {actionSummary(rule) || '(chưa có)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-card-foreground">
                {editing ? 'Sửa quy tắc' : 'Tạo quy tắc mới'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tên quy tắc *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="VD: Phân loại Starbucks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Mô tả</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(không bắt buộc)"
                />
              </div>

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.strict}
                    onChange={e => setForm(f => ({ ...f, strict: e.target.checked }))}
                  />
                  Tất cả điều kiện (strict)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.stop_processing}
                    onChange={e => setForm(f => ({ ...f, stop_processing: e.target.checked }))}
                  />
                  Dừng các quy tắc tiếp theo
                </label>
              </div>

              {/* Triggers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-foreground">Điều kiện (NẾU)</p>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, triggers: [...f.triggers, { type: 'description_contains', value: '' }] }))}
                    className="text-xs text-purple-600 hover:underline">+ Thêm điều kiện</button>
                </div>
                {form.triggers.map((t, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      value={t.type}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(f => ({ ...f, triggers: f.triggers.map((x, idx) => idx === i ? { ...x, type: v } : x) }));
                      }}
                      className="w-1/2 px-2 py-2 border border-border rounded-lg text-sm">
                      {TRIGGER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={t.value}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(f => ({ ...f, triggers: f.triggers.map((x, idx) => idx === i ? { ...x, value: v } : x) }));
                      }}
                      placeholder="Giá trị"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, triggers: f.triggers.filter((_, idx) => idx !== i) }))}
                      className="p-2 text-muted-foreground hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-foreground">Hành động (THÌ)</p>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, actions: [...f.actions, { type: 'add_tag', value: '' }] }))}
                    className="text-xs text-purple-600 hover:underline">+ Thêm hành động</button>
                </div>
                {form.actions.map((a, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      value={a.type}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(f => ({ ...f, actions: f.actions.map((x, idx) => idx === i ? { ...x, type: v } : x) }));
                      }}
                      className="w-1/2 px-2 py-2 border border-border rounded-lg text-sm">
                      {ACTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={a.value}
                      onChange={e => {
                        const v = e.target.value;
                        setForm(f => ({ ...f, actions: f.actions.map((x, idx) => idx === i ? { ...x, value: v } : x) }));
                      }}
                      placeholder="Giá trị"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))}
                      className="p-2 text-muted-foreground hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/30">
              <button onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted">
                Hủy
              </button>
              <button onClick={submitForm}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                {editing ? 'Cập nhật' : 'Tạo quy tắc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
