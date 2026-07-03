import {
  Plus, Link2, Copy, Check, CheckCircle2, XCircle, Search,
  RefreshCw, Key, Trash2, Pencil, Send, X, Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { webhookApi } from "../../../api/webhookApi";

const TRIGGER_OPTIONS = [
  { value: 'STORE_TRANSACTION',   label: 'Khi tạo giao dịch' },
  { value: 'UPDATE_TRANSACTION',  label: 'Khi cập nhật giao dịch' },
  { value: 'DESTROY_TRANSACTION', label: 'Khi xóa giao dịch' },
];

const RESPONSE_OPTIONS = [
  { value: 'TRANSACTIONS', label: 'Gửi giao dịch' },
  { value: 'ACCOUNTS',     label: 'Gửi tài khoản' },
  { value: 'NONE',         label: 'Không gửi payload' },
];

const EMPTY_FORM = {
  title: '',
  url:   '',
  trigger_type: 'STORE_TRANSACTION',
  response:     'TRANSACTIONS',
  secret:       '',
};

export function Webhooks() {
  const [webhooks,  setWebhooks]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [copiedId,  setCopiedId]  = useState(null);
  const [logModal,  setLogModal]  = useState(null); // { webhook, messages }

  const errMsg = (e) => e?.response?.data?.message || e?.message || 'Lỗi không xác định';

  // ── Load ─────────────────────────────────────────────
  const refresh = async () => {
    try {
      setLoading(true);
      const data = await webhookApi.getAll();
      setWebhooks(data || []);
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
  const openEdit = (w) => {
    setEditing(w);
    setForm({
      title:        w.title,
      url:          w.url,
      trigger_type: w.trigger_type,
      response:     w.response,
      secret:       w.secret || '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const submitForm = async () => {
    if (!form.title.trim()) { toast.error('Tên webhook bắt buộc'); return; }
    try { new URL(form.url); } catch { toast.error('URL không hợp lệ'); return; }

    try {
      const payload = {
        title:        form.title.trim(),
        url:          form.url.trim(),
        trigger_type: form.trigger_type,
        response:     form.response,
      };
      if (form.secret.trim()) payload.secret = form.secret.trim();

      if (editing) {
        await webhookApi.update(editing.webhook_id, payload);
        toast.success('Đã cập nhật webhook');
      } else {
        await webhookApi.create(payload);
        toast.success('Đã tạo webhook mới');
      }
      closeModal();
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  // ── Per-row actions ──────────────────────────────────
  const toggleStatus = async (w) => {
    try {
      await webhookApi.update(w.webhook_id, { is_active: !w.is_active });
      toast.success(w.is_active ? 'Đã tắt webhook' : 'Đã bật webhook');
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const deleteWebhook = async (w) => {
    if (!await confirmDialog(`Xóa webhook "${w.title}"?`)) return;
    try { await webhookApi.delete(w.webhook_id); toast.success('Đã xóa'); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const submitTest = async (w) => {
    try {
      const m = await webhookApi.submit(w.webhook_id, { ping: 'test', from: 'UI', at: new Date().toISOString() });
      toast[m.success ? 'success' : 'error'](
        m.success ? `Gửi thành công (HTTP ${m.status_code})` : `Thất bại: ${m.error_message || m.status_code}`
      );
    } catch (e) { toast.error(errMsg(e)); }
  };

  const openLogs = async (w) => {
    try {
      const messages = await webhookApi.messages(w.webhook_id, 50);
      setLogModal({ webhook: w, messages });
    } catch (e) { toast.error(errMsg(e)); }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success('Đã sao chép');
    });
  };

  const filtered = webhooks.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.url.toLowerCase().includes(search.toLowerCase())
  );

  const triggerLabel = (val) => TRIGGER_OPTIONS.find(o => o.value === val)?.label ?? val;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Webhooks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gửi sự kiện giao dịch tới hệ thống bên ngoài (Zapier, n8n, IFTTT, server riêng…)
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap">
          <Plus size={18} />
          <span className="font-medium">Tạo Webhook mới</span>
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm webhook..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button onClick={refresh}
          className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted" title="Làm mới">
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border shadow-sm">
          <Link2 size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-card-foreground font-bold text-lg mb-1">Chưa có webhook nào</p>
          <p className="text-muted-foreground font-medium">Nhấn "Tạo Webhook mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(w => (
            <div key={w.webhook_id}
              className={`bg-card rounded-2xl border ${w.is_active ? 'border-border shadow-sm' : 'border-border/60 opacity-70'} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${w.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                    <Link2 size={16} className="sm:size-[20]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-card-foreground text-sm sm:text-base truncate">{w.title}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{triggerLabel(w.trigger_type)} → {w.response}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="bg-muted border border-border rounded-lg px-2 py-1 font-mono text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-md">
                        {w.url}
                      </span>
                      <button onClick={() => handleCopy(w.url, `url-${w.webhook_id}`)}
                        className="p-1 text-muted-foreground hover:text-purple-600 shrink-0" title="Sao chép URL">
                        {copiedId === `url-${w.webhook_id}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {w.secret && (
                      <div className="mt-1 flex items-center gap-2">
                        <Key size={12} className="text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground">
                          {w.secret.slice(0, 10)}…{w.secret.slice(-4)}
                        </span>
                        <button onClick={() => handleCopy(w.secret, `secret-${w.webhook_id}`)}
                          className="p-1 text-muted-foreground hover:text-purple-600" title="Sao chép Secret">
                          {copiedId === `secret-${w.webhook_id}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap justify-end">
                  <span className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-full ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {w.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                  <button onClick={() => submitTest(w)} title="Gửi test"
                    className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                    <Send size={16} />
                  </button>
                  <button onClick={() => openLogs(w)} title="Xem log"
                    className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => toggleStatus(w)} title={w.is_active ? "Tắt" : "Bật"}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                    {w.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                  </button>
                  <button onClick={() => openEdit(w)} title="Sửa"
                    className="p-1.5 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteWebhook(w)} title="Xóa"
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit/Create Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-card-foreground">{editing ? 'Sửa webhook' : 'Tạo webhook mới'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tên *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="VD: Notify Slack" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">URL *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  placeholder="https://hooks.slack.com/services/..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sự kiện kích hoạt</label>
                <select
                  value={form.trigger_type}
                  onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card">
                  {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Loại payload</label>
                <select
                  value={form.response}
                  onChange={e => setForm(f => ({ ...f, response: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card">
                  {RESPONSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Secret (HMAC-SHA256, để trống = tự sinh)
                </label>
                <input
                  type="text"
                  value={form.secret}
                  onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  placeholder="whsec_..." />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <button onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted">
                Hủy
              </button>
              <button onClick={submitForm}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                {editing ? 'Cập nhật' : 'Tạo webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log viewer Modal ────────────────────────────────────────────── */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-card-foreground truncate">Log webhook</h2>
                <p className="text-sm text-muted-foreground truncate">{logModal.webhook.title} — {logModal.webhook.url}</p>
              </div>
              <button onClick={() => setLogModal(null)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {logModal.messages.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">Chưa có log nào.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted sticky top-0">
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Thời gian</th>
                      <th className="px-4 py-3 font-semibold w-1/2">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logModal.messages.map(m => (
                      <tr key={m.message_id} className="hover:bg-muted">
                        <td className="px-4 py-3">
                          {m.success ? (
                            <div className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                              <CheckCircle2 size={16} /> {m.status_code}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                              <XCircle size={16} /> {m.status_code || 'NET'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {m.sent_at ? format(new Date(m.sent_at), "HH:mm:ss dd/MM", { locale: vi }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="bg-muted text-green-500 font-mono text-xs p-2.5 rounded-lg overflow-x-auto max-h-24">
                            {m.payload}
                          </div>
                          {m.error_message && (
                            <div className="mt-1 text-xs text-red-500 font-medium">⚠ {m.error_message}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
