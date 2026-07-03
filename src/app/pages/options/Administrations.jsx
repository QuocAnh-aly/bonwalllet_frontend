import { useState } from "react";
import { Database, AlertTriangle, Shield, HardDrive, Download, UploadCloud, RotateCcw, Scale, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "../../components/layout/PageLayout";
import { accountApi } from "../../api/accountApi";
import { useSettings } from "../../context/SettingsContext";

export function Administrations() {
  const { fmt } = useSettings();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  const errMsg = (e) => e?.response?.data?.message || e?.message || "Lỗi không xác định";

  const runReconcile = async (repair) => {
    setReconciling(true);
    try {
      const res = await accountApi.reconcile(repair);
      setReconcileResult(res);
      if (repair && res?.mismatchCount > 0) {
        toast.success(`Đã sửa ${res.mismatchCount} số dư bị lệch.`);
      } else if (res?.mismatchCount > 0) {
        toast.warning(`Phát hiện ${res.mismatchCount} số dư bị lệch.`);
      } else {
        toast.success(`Đã kiểm tra ${res?.checked ?? 0} ví — không có sai lệch.`);
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setReconciling(false);
    }
  };

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      toast.success("Đã tạo bản sao lưu dữ liệu thành công!");
    }, 2000);
  };

  const handleReset = () => {
    const confirmation = window.prompt("CẢNH BÁO: Mọi dữ liệu sẽ bị xóa sạch và không thể khôi phục. Nhập 'XOA' để xác nhận:");
    if (confirmation === 'XOA') {
      toast.success("Dữ liệu đang được xóa (Mô phỏng)...");
    }
  };

  return (
    <PageLayout
      title="Quản trị hệ thống"
      subtitle="Quản lý cơ sở dữ liệu, sao lưu, và các cấu hình cấp cao của ứng dụng"
    >

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Data Backup */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/50 flex items-center gap-3">
              <Database size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-card-foreground">Dữ liệu & Sao lưu</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">Tạo bản sao lưu mã hóa cục bộ hoặc đồng bộ lên đám mây để đảm bảo an toàn cho dữ liệu tài chính của bạn.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {isBackingUp ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <Download size={20} />}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-card-foreground">Sao lưu dữ liệu ngay</p>
                      <p className="text-xs text-muted-foreground">Lưu một bản copy mã hóa xuống máy</p>
                    </div>
                  </div>
                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <UploadCloud size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-card-foreground">Đồng bộ Cloud</p>
                      <p className="text-xs text-muted-foreground">Sao lưu tự động lên Google Drive/Dropbox</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-border hover:bg-muted transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <HardDrive size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-card-foreground">Khôi phục (Restore)</p>
                      <p className="text-xs text-muted-foreground">Khôi phục từ tệp sao lưu trước đó</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/50 flex items-center gap-3">
              <Shield size={20} className="text-muted-foreground" />
              <h2 className="text-lg font-bold text-card-foreground">Thông tin hệ thống</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Phiên bản ứng dụng</span>
                  <span className="font-semibold text-card-foreground">v2.1.0-beta</span>
                </li>
                <li className="flex justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Phiên bản Database</span>
                  <span className="font-semibold text-card-foreground">Schema v4</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Chế độ môi trường</span>
                  <span className="font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">Production</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Balance Reconciliation */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/50 flex items-center gap-3">
              <Scale size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-card-foreground">Đối soát số dư</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Tính lại số dư từng ví trực tiếp từ sổ cái (bút toán kép) và so với
                số dư đang lưu. Dùng để phát hiện và sửa sai lệch nếu có.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => runReconcile(false)}
                  disabled={reconciling}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors font-semibold text-card-foreground disabled:opacity-70"
                >
                  {reconciling ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Scale size={16} />}
                  Kiểm tra
                </button>
                <button
                  onClick={() => runReconcile(true)}
                  disabled={reconciling}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-70"
                >
                  <Wrench size={16} />
                  Kiểm tra & Sửa
                </button>
              </div>

              {reconcileResult && (
                <div className="mt-6">
                  {reconcileResult.mismatchCount === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
                      <CheckCircle2 size={18} />
                      Đã kiểm tra {reconcileResult.checked} ví — tất cả khớp với sổ cái.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-card-foreground">
                        {reconcileResult.repaired ? "Đã sửa" : "Phát hiện"} {reconcileResult.mismatchCount}/{reconcileResult.checked} ví lệch:
                      </p>
                      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                        {reconcileResult.mismatches.map((m) => (
                          <div key={m.accountId} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="font-medium text-card-foreground truncate">{m.name}</span>
                            <span className="text-muted-foreground">
                              {fmt(m.storedBalance)} → <span className="text-card-foreground font-semibold">{fmt(m.computedBalance)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                      {!reconcileResult.repaired && (
                        <p className="text-xs text-muted-foreground">
                          Bấm <strong>Kiểm tra &amp; Sửa</strong> để cập nhật số dư về giá trị đúng từ sổ cái.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Danger Zone) */}
        <div>
          <div className="bg-card rounded-2xl border border-red-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-red-100 bg-red-50/50 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600" />
              <h2 className="text-lg font-bold text-red-700">Khu vực nguy hiểm (Danger Zone)</h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="border border-red-100 rounded-xl p-5 bg-card">
                <h3 className="font-bold text-card-foreground mb-1">Xóa trắng dữ liệu (Factory Reset)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Thao tác này sẽ xóa toàn bộ giao dịch, tài khoản, danh mục và thiết lập của bạn. Hành động này không thể hoàn tác nếu không có bản sao lưu.
                </p>
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                >
                  <RotateCcw size={18} />
                  <span>Tiến hành Reset hệ thống</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
