import axiosClient from './axiosClient';

export const recurringApi = {
  getAll(params = {}) {
    return axiosClient.get('/api/recurring', { params });
  },

  getById(id) {
    return axiosClient.get(`/api/recurring/${id}`);
  },

  create(data) {
    return axiosClient.post('/api/recurring', data);
  },

  update(id, data) {
    return axiosClient.put(`/api/recurring/${id}`, data);
  },

  delete(id) {
    return axiosClient.delete(`/api/recurring/${id}`);
  },
};
