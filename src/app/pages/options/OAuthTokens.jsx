// import { useState, useMemo } from 'react';
// import {
//   Key, ShieldCheck, Trash2, ShieldAlert, RefreshCw,
//   Plus, X, CheckCircle, Loader2, ExternalLink, Clock, Calendar,
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { format, formatDistanceToNow } from 'date-fns';
// import { vi } from 'date-fns/locale';

// // ── Provider catalogue ─────────────────────────────────────────
// const PROVIDERS = [
//   {
//     id: 'google-drive',
//     name: 'Google Drive',
//     category: 'cloud',
//     scope: 'Files.ReadWrite',
//     scopeLabel: 'Đọc & ghi tệp',
//     description: 'Sao lưu & khôi phục dữ liệu tự động lên Google Drive',
//     color: '#1A73E8',
//     letter: 'G',
//   },
//   {
//     id: 'google-sheets',
//     name: 'Google Sheets',
//     category: 'cloud',
//     scope: 'Spreadsheets.ReadWrite',
//     scopeLabel: 'Tạo & chỉnh sửa bảng tính',
//     description: 'Xuất báo cáo tài chính ra Google Sheets',
//     color: '#34A853',
//     letter: 'S',
//   },
//   {
//     id: 'dropbox',
//     name: 'Dropbox',
//     category: 'cloud',
//     scope: 'Files.ReadWrite',
//     scopeLabel: 'Đọc & ghi tệp',
//     description: 'Sao lưu dữ liệu tự động lên Dropbox',
//     color: '#0061FF',
//     letter: 'D',
//   },
//   {
//     id: 'onedrive',
//     name: 'Microsoft OneDrive',
//     category: 'cloud',
//     scope: 'Files.ReadWrite',
//     scopeLabel: 'Đọc & ghi tệp',
//     description: 'Sao lưu dữ liệu lên OneDrive',
//     color: '#0078D4',
//     letter: 'M',
//   },
//   {
//     id: 'techcombank',
//     name: 'Techcombank',
//     category: 'bank',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Tự động đồng bộ giao dịch từ Techcombank vào MoneyFlow',
//     color: '#E31837',
//     letter: 'T',
//   },
//   {
//     id: 'vietcombank',
//     name: 'Vietcombank (VCB)',
//     category: 'bank',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Tự động đồng bộ giao dịch từ Vietcombank',
//     color: '#006B3D',
//     letter: 'V',
//   },
//   {
//     id: 'mbbank',
//     name: 'MB Bank',
//     category: 'bank',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Tự động đồng bộ giao dịch từ MB Bank',
//     color: '#8B0000',
//     letter: 'M',
//   },
//   {
//     id: 'vpbank',
//     name: 'VPBank',
//     category: 'bank',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Tự động đồng bộ giao dịch từ VPBank',
//     color: '#00933B',
//     letter: 'P',
//   },
//   {
//     id: 'momo',
//     name: 'MoMo',
//     category: 'wallet',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Đồng bộ lịch sử giao dịch từ ví MoMo',
//     color: '#A50064',
//     letter: 'M',
//   },
//   {
//     id: 'zalopay',
//     name: 'ZaloPay',
//     category: 'wallet',
//     scope: 'Transactions.Read',
//     scopeLabel: 'Xem lịch sử giao dịch',
//     description: 'Đồng bộ lịch sử giao dịch từ ZaloPay',
//     color: '#0068FF',
//     letter: 'Z',
//   },
// ];

// const CATEGORY_LABELS = {
//   cloud: 'Lưu trữ đám mây',
//   bank: 'Ngân hàng',
//   wallet: 'Ví điện tử',
// };

// function loadTokens() {
//   try {
//     const saved = localStorage.getItem('oauth_tokens');
//     return saved ? JSON.parse(saved) : [];
//   } catch {
//     return [];
//   }
// }

// function saveTokens(list) {
//   localStorage.setItem('oauth_tokens', JSON.stringify(list));
// }

// // ── Provider avatar ────────────────────────────────────────────
// function ProviderAvatar({ provider, size = 'md' }) {
//   const p = PROVIDERS.find(x => x.id === provider.providerId);
//   const sz = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
//   return (
//     <div
//       className={`${sz} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}
//       style={{ backgroundColor: p?.color ?? '#64748b' }}
//     >
//       {p?.letter ?? provider.name[0]}
//     </div>
//   );
// }

// const FILTER_OPTIONS = [
//   { value: 'all',     label: 'Tất cả' },
//   { value: 'active',  label: 'Đang hoạt động' },
//   { value: 'expired', label: 'Hết hạn' },
// ];

// import { PageLayout } from '../../components/layout/PageLayout';

// export function OAuthTokens() {
//   const [tokens, setTokens] = useState(loadTokens);
//   const [filter, setFilter] = useState('all');

//   // Add modal state
//   const [showAdd,     setShowAdd]     = useState(false);
//   const [addCategory, setAddCategory] = useState('cloud');
//   const [connecting,  setConnecting]  = useState(null); // providerId being connected

//   // Renew state
//   const [renewing, setRenewing] = useState(null); // token id being renewed

//   // ── Helpers ──────────────────────────────────────────────────
//   const isExpired = (token) => new Date(token.expiresAt) < new Date();

//   const persist = (list) => {
//     setTokens(list);
//     saveTokens(list);
//   };

//   // ── Revoke ───────────────────────────────────────────────────
//   const revokeToken = (id, name) => {
//     if (!window.confirm(`Thu hồi quyền truy cập của "${name}"? Hành động này không thể hoàn tác.`)) return;
//     persist(tokens.filter(t => t.id !== id));
//     toast.success(`Đã thu hồi quyền của ${name}`);
//   };

//   // ── Renew (simulated OAuth flow) ─────────────────────────────
//   const renewToken = (id) => {
//     setRenewing(id);
//     setTimeout(() => {
//       const expiry = new Date();
//       expiry.setFullYear(expiry.getFullYear() + 1);
//       const updated = tokens.map(t =>
//         t.id === id
//           ? { ...t, expiresAt: expiry.toISOString(), lastUsed: new Date().toISOString() }
//           : t
//       );
//       persist(updated);
//       setRenewing(null);
//       toast.success('Đã gia hạn thành công — hết hạn sau 1 năm');
//     }, 1800);
//   };

//   // ── Connect new provider (simulated OAuth) ───────────────────
//   const connectProvider = (provider) => {
//     setConnecting(provider.id);
//     // Simulate OAuth redirect + callback
//     setTimeout(() => {
//       const now = new Date().toISOString();
//       const expiry = new Date();
//       expiry.setFullYear(expiry.getFullYear() + 1);
//       const newToken = {
//         id: `token_${Date.now()}`,
//         providerId: provider.id,
//         name: provider.name,
//         scope: provider.scope,
//         scopeLabel: provider.scopeLabel,
//         createdAt: now,
//         expiresAt: expiry.toISOString(),
//         lastUsed: now,
//       };
//       const updated = [...tokens, newToken];
//       persist(updated);
//       setConnecting(null);
//       setShowAdd(false);
//       toast.success(`Đã kết nối thành công với ${provider.name}`);
//     }, 2000);
//   };

//   // ── Derived data ─────────────────────────────────────────────
//   const connectedIds = new Set(tokens.map(t => t.providerId));

//   const displayTokens = useMemo(() => {
//     return tokens.filter(t => {
//       if (filter === 'active')  return !isExpired(t);
//       if (filter === 'expired') return isExpired(t);
//       return true;
//     });
//   }, [tokens, filter]);

//   const availableProviders = useMemo(() =>
//     PROVIDERS
//       .filter(p => !connectedIds.has(p.id))
//       .filter(p => p.category === addCategory),
//     [connectedIds, addCategory]
//   );

//   const countByStatus = useMemo(() => ({
//     all:     tokens.length,
//     active:  tokens.filter(t => !isExpired(t)).length,
//     expired: tokens.filter(t => isExpired(t)).length,
//   }), [tokens]);

//   return (
//     <PageLayout
//       title="Kết nối ứng dụng"
//       subtitle="Quản lý phân quyền OAuth 2.0 cho các dịch vụ và ứng dụng bên thứ ba"
//       actions={
//         <button
//           onClick={() => setShowAdd(true)}
//           className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm font-medium"
//         >
//           <Plus size={18} />
//           Thêm kết nối mới
//         </button>
//       }
//     >

//       {/* ── Security banner ─────────────────────────────────────── */}
//       <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white shadow-sm relative overflow-hidden mb-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center sm:text-left">
//         <div className="absolute top-0 right-0 w-64 h-64 bg-card opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none" />
//         <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm relative z-10 shrink-0">
//           <ShieldCheck size={24} className="sm:size-[32px]" />
//         </div>
//         <div className="relative z-10">
//           <h3 className="text-lg sm:text-xl font-bold mb-1">Bảo mật dữ liệu của bạn</h3>
//           <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
//             MoneyFlow sử dụng chuẩn <strong>OAuth 2.0</strong> để liên kết với ngân hàng và dịch vụ lưu trữ.
//             Chúng tôi <strong>KHÔNG BAO GIỜ</strong> lưu mật khẩu ngân hàng của bạn. Bạn có thể thu hồi quyền truy cập bất cứ lúc nào.
//           </p>
//         </div>
//       </div>

//       {/* ── Filter tabs ─────────────────────────────────────────── */}
//       <div className="flex items-center gap-2 mb-6">
//         {FILTER_OPTIONS.map(opt => (
//           <button
//             key={opt.value}
//             onClick={() => setFilter(opt.value)}
//             className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
//               filter === opt.value
//                 ? 'bg-slate-800 text-white'
//                 : 'bg-white border border-border text-muted-foreground hover:bg-muted'
//             }`}
//           >
//             {opt.label}
//             <span className={`text-xs px-1.5 py-0.5 rounded-full ${
//               filter === opt.value ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
//             }`}>
//               {countByStatus[opt.value]}
//             </span>
//           </button>
//         ))}
//       </div>

//       {/* ── Token cards ─────────────────────────────────────────── */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//         {displayTokens.length === 0 ? (
//           <div className="md:col-span-2 py-16 text-center bg-card rounded-2xl border border-border shadow-sm">
//             <Key size={48} className="mx-auto text-muted-foreground mb-4" />
//             <p className="text-card-foreground font-bold text-lg mb-1">
//               {filter === 'all' ? 'Chưa có ứng dụng nào được liên kết' : 'Không có kết nối nào'}
//             </p>
//             <p className="text-muted-foreground text-sm mt-1">
//               {filter === 'all'
//                 ? 'Bấm "Thêm kết nối mới" để liên kết với ngân hàng hoặc dịch vụ sao lưu.'
//                 : `Không có kết nối nào ở trạng thái "${FILTER_OPTIONS.find(f => f.value === filter)?.label}".`}
//             </p>
//           </div>
//         ) : (
//           displayTokens.map(token => {
//             const expired = isExpired(token);
//             const isRenewing = renewing === token.id;
//             const provider = PROVIDERS.find(p => p.id === token.providerId);
//             return (
//               <div
//                 key={token.id}
//                 className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-colors ${
//                   expired ? 'border-red-200 bg-red-50/20' : 'border-border'
//                 }`}
//               >
//                 {/* Card header */}
//                 <div className="flex justify-between items-start mb-4">
//                   <div className="flex items-center gap-3">
//                     <ProviderAvatar provider={token} />
//                     <div>
//                       <h3 className="font-bold text-card-foreground">{token.name}</h3>
//                       <p className="text-xs text-muted-foreground font-mono mt-0.5">{token.scope}</p>
//                       {provider?.category && (
//                         <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[provider.category]}</span>
//                       )}
//                     </div>
//                   </div>
//                   {expired ? (
//                     <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-bold border border-red-200 shrink-0">
//                       <ShieldAlert size={13} /> Hết hạn
//                     </span>
//                   ) : (
//                     <span className="flex items-center gap-1 bg-green-50 text-green-600 px-2.5 py-1 rounded-md text-xs font-bold border border-green-200 shrink-0">
//                       <ShieldCheck size={13} /> Đang kết nối
//                     </span>
//                   )}
//                 </div>

//                 {/* Token details */}
//                 <div className="space-y-2 mb-5">
//                   <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
//                     <span className="text-muted-foreground flex items-center gap-1.5">
//                       <Calendar size={13} /> Hết hạn
//                     </span>
//                     <span className={`font-medium ${expired ? 'text-red-600' : 'text-foreground'}`}>
//                       {format(new Date(token.expiresAt), 'dd/MM/yyyy', { locale: vi })}
//                       {!expired && (
//                         <span className="text-muted-foreground font-normal ml-1 text-xs">
//                           ({formatDistanceToNow(new Date(token.expiresAt), { locale: vi, addSuffix: true })})
//                         </span>
//                       )}
//                     </span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
//                     <span className="text-muted-foreground flex items-center gap-1.5">
//                       <Clock size={13} /> Lần cuối dùng
//                     </span>
//                     <span className="font-medium text-foreground">
//                       {token.lastUsed
//                         ? formatDistanceToNow(new Date(token.lastUsed), { locale: vi, addSuffix: true })
//                         : '—'}
//                     </span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
//                     <span className="text-muted-foreground flex items-center gap-1.5">
//                       <Key size={13} /> Quyền truy cập
//                     </span>
//                     <span className="font-medium text-foreground text-xs">{token.scopeLabel ?? token.scope}</span>
//                   </div>
//                 </div>

//                 {/* Actions */}
//                 <div className="flex items-center gap-2">
//                   {expired && (
//                     <button
//                       onClick={() => renewToken(token.id)}
//                       disabled={isRenewing}
//                       className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-60 text-sm"
//                     >
//                       {isRenewing ? (
//                         <><Loader2 size={15} className="animate-spin" /> Đang gia hạn...</>
//                       ) : (
//                         <><RefreshCw size={15} /> Gia hạn</>
//                       )}
//                     </button>
//                   )}
//                   <button
//                     onClick={() => revokeToken(token.id, token.name)}
//                     className={`${expired ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 py-2 bg-card border border-border text-foreground rounded-lg font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm`}
//                   >
//                     <Trash2 size={15} /> Thu hồi quyền
//                   </button>
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* ── Add connection modal ──────────────────────────────────── */}
//       {showAdd && (
//         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
//           <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

//             {/* Modal header */}
//             <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
//               <div>
//                 <h2 className="text-xl font-bold text-card-foreground">Thêm kết nối mới</h2>
//                 <p className="text-sm text-muted-foreground mt-0.5">Chọn dịch vụ bạn muốn kết nối với MoneyFlow</p>
//               </div>
//               <button
//                 onClick={() => { setShowAdd(false); setConnecting(null); }}
//                 className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
//               >
//                 <X size={20} />
//               </button>
//             </div>

//             {/* Category tabs */}
//             <div className="flex gap-1 px-6 pt-4 shrink-0">
//               {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
//                 <button
//                   key={key}
//                   onClick={() => setAddCategory(key)}
//                   className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
//                     addCategory === key
//                       ? 'bg-slate-800 text-white'
//                       : 'text-muted-foreground hover:bg-muted'
//                   }`}
//                 >
//                   {label}
//                 </button>
//               ))}
//             </div>

//             {/* Provider list */}
//             <div className="p-6 overflow-y-auto flex-1">
//               {availableProviders.length === 0 ? (
//                 <div className="py-12 text-center text-muted-foreground">
//                   <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
//                   <p className="font-medium">Tất cả dịch vụ trong danh mục này đã được kết nối!</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {availableProviders.map(provider => {
//                     const isConnecting = connecting === provider.id;
//                     return (
//                       <div
//                         key={provider.id}
//                         className="flex items-center gap-4 p-4 border border-border rounded-xl hover:border-border hover:bg-muted transition-colors"
//                       >
//                         {/* Icon */}
//                         <div
//                           className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0"
//                           style={{ backgroundColor: provider.color }}
//                         >
//                           {provider.letter}
//                         </div>

//                         {/* Info */}
//                         <div className="flex-1 min-w-0">
//                           <div className="font-bold text-card-foreground">{provider.name}</div>
//                           <div className="text-sm text-muted-foreground mt-0.5">{provider.description}</div>
//                           <div className="flex items-center gap-1 mt-1">
//                             <Key size={11} className="text-muted-foreground" />
//                             <span className="text-xs text-muted-foreground font-mono">{provider.scope}</span>
//                           </div>
//                         </div>

//                         {/* Connect button */}
//                         <button
//                           onClick={() => connectProvider(provider)}
//                           disabled={connecting != null}
//                           className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
//                         >
//                           {isConnecting ? (
//                             <><Loader2 size={14} className="animate-spin" /> Đang kết nối...</>
//                           ) : (
//                             <><ExternalLink size={14} /> Kết nối</>
//                           )}
//                         </button>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {/* Modal footer */}
//             <div className="px-6 pb-6 shrink-0">
//               <p className="text-xs text-muted-foreground text-center">
//                 Bằng cách kết nối, bạn đồng ý cho phép MoneyFlow truy cập dữ liệu theo phạm vi đã liệt kê theo chuẩn OAuth 2.0.
//                 Bạn có thể thu hồi bất cứ lúc nào.
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
//     </PageLayout>
//   );
// }
