import axiosClient from './axiosClient';
import { readThrough } from '../offline/offlineCache';

export const accountApi = {
  getAll(params = {}) {
    return readThrough(
      `accounts:getAll:${JSON.stringify(params)}`,
      () => axiosClient.get('/api/accounts', { params }),
    );
  },

  getByType(typeId, params = {}) {
    return readThrough(
      `accounts:getByType:${typeId}:${JSON.stringify(params)}`,
      () => axiosClient.get(`/api/accounts/type/${typeId}`, { params }),
    );
  },

  getById(id) {
    return axiosClient.get(`/api/accounts/${id}`);
  },

  getSummary(params = {}) {
    return readThrough(
      `accounts:getSummary:${JSON.stringify(params)}`,
      () => axiosClient.get('/api/accounts/wallet-summary', { params }),
    );
  },

  create(data) {
    return axiosClient.post('/api/accounts', data);
  },

  update(id, data) {
    return axiosClient.put(`/api/accounts/${id}`, data);
  },

  delete(id, { transferToAccountId, force } = {}) {
    const params = {};
    if (transferToAccountId != null) params.transferToAccountId = transferToAccountId;
    if (force) params.force = true;
    return axiosClient.delete(`/api/accounts/${id}`, { params });
  },

  // Đối soát số dư ví với sổ cái. repair=true sẽ sửa các số dư bị lệch.
  reconcile(repair = false) {
    return axiosClient.post(`/api/accounts/reconcile?repair=${repair}`);
  },
};
