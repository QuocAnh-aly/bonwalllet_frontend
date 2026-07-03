import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { setAccessToken, clearAccessToken, markSession, clearSession, hasSession } from '../api/tokenStore';
import { clearOfflineCache } from '../offline/offlineCache';
import { resetOfflineKey } from '../security/keyHolder';

const AuthContext = createContext(null);

// Lưu session sau khi đăng nhập/đăng ký: access token vào RAM, đặt cờ phiên,
// giữ user_id (không bí mật) cho các nơi khác dùng. Refresh token do server đặt
// trong cookie HttpOnly — client không chạm tới.
const persistAuth = (data) => {
  setAccessToken(data.access_token);
  markSession();
  if (data.user_id != null) localStorage.setItem('user_id', String(data.user_id));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    // Báo server xóa cookie refresh token (bỏ qua lỗi mạng).
    authApi.logout().catch(() => {});
    clearAccessToken();
    clearSession();
    localStorage.removeItem('user_id');
    localStorage.removeItem('expense_categories');
    localStorage.removeItem('income_sources');
    localStorage.removeItem('app_tags');
    localStorage.removeItem('app_object_groups');
    // Dọn dữ liệu offline + khóa giải mã để tài khoản sau không đọc được.
    clearOfflineCache();
    resetOfflineKey();
    setUser(null);
  }, []);

  // Listen for forced logout from axios 401 interceptor.
  // Interceptor đã dọn token/cờ phiên; ở đây chỉ cần xóa user state.
  useEffect(() => {
    const handleForceLogout = () => {
      clearAccessToken();
      clearSession();
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const restoreSession = useCallback(async () => {
    // Không có cờ phiên → chưa đăng nhập, khỏi gọi server.
    if (!hasSession()) {
      setLoading(false);
      return;
    }

    try {
      // axiosClient tự bootstrap access token từ cookie refresh khi gọi API
      // được bảo vệ (RAM trống sau khi reload) — chỉ cần lấy hồ sơ.
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      clearAccessToken();
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    if (!data?.access_token) throw new Error('Phản hồi đăng nhập không hợp lệ.');
    persistAuth(data);
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  };

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      // silent
    }
  }, []);

  const register = async (userData) => {
    const data = await authApi.register(userData);
    if (!data?.access_token) throw new Error('Phản hồi đăng ký không hợp lệ.');
    persistAuth(data);
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
