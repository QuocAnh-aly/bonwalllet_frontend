// Access token được giữ trong RAM (biến module), KHÔNG lưu localStorage — giảm
// thiểu bề mặt tấn công XSS. Token ngắn hạn (vài giờ); khi tải lại trang sẽ được
// lấy lại bằng cách gọi /api/auth/refresh (refresh token nằm trong cookie HttpOnly).
//
// `app_session` là cờ KHÔNG bí mật trong localStorage, chỉ để UI biết "có thể đang
// có phiên" → thử refresh khi khởi động và quyết định hiển thị (login/khóa).

const SESSION_FLAG = "app_session";

let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (t) => {
  accessToken = t || null;
};
export const clearAccessToken = () => {
  accessToken = null;
};

export const hasSession = () => localStorage.getItem(SESSION_FLAG) === "1";
export const markSession = () => localStorage.setItem(SESSION_FLAG, "1");
export const clearSession = () => localStorage.removeItem(SESSION_FLAG);
