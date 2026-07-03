import axiosClient from './axiosClient';

export const authApi = {
  login(data) {
    const url = '/api/auth/signin';
    return axiosClient.post(url, data);
  },

  register({ account, password, userName, email }) {
    const url = '/api/auth/signup';
    return axiosClient.post(url, { account, password, user_name: userName, email });
  },

  refresh() {
    // Refresh token gửi tự động qua cookie HttpOnly (withCredentials).
    const url = '/api/auth/refresh';
    return axiosClient.post(url);
  },

  logout() {
    const url = '/api/auth/logout';
    return axiosClient.post(url);
  },

  getProfile() {
    const url = '/api/auth/profile';
    return axiosClient.get(url);
  },

  updateProfile(data) {
    const url = '/api/auth/profile';
    return axiosClient.put(url, data);
  },

  changePassword({ currentPassword, newPassword }) {
    const url = '/api/auth/password';
    return axiosClient.put(url, { old_password: currentPassword, new_password: newPassword });
  },
};
