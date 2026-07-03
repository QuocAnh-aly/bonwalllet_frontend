import { useRouteError, Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center border border-border">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-card-foreground mb-2">Đã xảy ra lỗi!</h1>
        <p className="text-muted-foreground mb-6">
          Rất xin lỗi, ứng dụng đã gặp sự cố không mong muốn. 
        </p>
        
        <div className="bg-muted rounded-lg p-4 mb-8 text-left overflow-auto max-h-32">
          <p className="text-sm font-mono text-foreground break-words">
            {error?.statusText || error?.message || "Lỗi không xác định"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
          >
            <RefreshCw size={18} />
            Thử lại
          </button>
          <Link 
            to="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
